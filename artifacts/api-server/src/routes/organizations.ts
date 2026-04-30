import { Router } from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { organizationsTable, registerEnteSchema, userConsentsTable, policiesTable, usersTable, bannedEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}


router.post("/register-ente", async (req, res) => {
  const { website, segno_zodiacale } = req.body || {};
  if (website || segno_zodiacale) {
    res.status(201).json({
      id: 0,
      ragioneSociale: req.body?.ragioneSociale || "",
      username: req.body?.username || "",
      emailUfficiale: req.body?.emailUfficiale || "",
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const parsed = registerEnteSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (field) fieldErrors[field] = issue.message;
    }
    res.status(400).json({ error: "Dati non validi", fields: fieldErrors });
    return;
  }

  const data = parsed.data;

  try {
    // Blocca re-registrazione se l'email è stata bannata (account eliminato o bloccato)
    const emailToCheck = data.emailUfficiale.toLowerCase();
    const [bannedRow] = await db
      .select({ reason: bannedEmailsTable.reason })
      .from(bannedEmailsTable)
      .where(eq(bannedEmailsTable.email, emailToCheck))
      .limit(1);
    if (bannedRow) {
      res.status(403).json({
        error: "Registrazione non consentita",
        code: "EMAIL_BANNED",
        fields: { emailUfficiale: bannedRow.reason === "deleted"
          ? "Questo indirizzo email non può essere utilizzato per registrarsi."
          : "Questo indirizzo email è stato sospeso. Contatta l'assistenza." },
      });
      return;
    }

    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.username, data.username))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        error: "Username già in uso",
        fields: { username: "Questo username è già registrato." },
      });
      return;
    }

    const existingEmail = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.emailUfficiale, data.emailUfficiale))
      .limit(1);

    if (existingEmail.length > 0) {
      res.status(409).json({
        error: "Email già registrata",
        fields: { emailUfficiale: "Questa email è già associata a un ente." },
      });
      return;
    }

    const existingPiva = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.partitaIva, data.partitaIva))
      .limit(1);

    if (existingPiva.length > 0) {
      res.status(409).json({
        error: "Partita IVA già registrata",
        fields: { partitaIva: "Questa Partita IVA è già registrata." },
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(500).json({ error: "Servizio di autenticazione non disponibile" });
      return;
    }

    const allowedOrigin = process.env.APP_ORIGIN || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.emailUfficiale,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        username: data.username,
        full_name: `${data.referenteNome} ${data.referenteCognome}`,
      },
    });

    if (authError) {
      if (authError.message?.includes("already registered") || authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        res.status(409).json({
          error: "Email già registrata",
          fields: { emailUfficiale: "Questa email è già registrata. Usa il login." },
        });
        return;
      }
      req.log?.error?.({ err: authError }, "Error creating Supabase user for org");
      res.status(500).json({ error: "Errore nella creazione dell'account" });
      return;
    }

    if (!authData.user) {
      res.status(500).json({ error: "Errore nella creazione dell'account" });
      return;
    }

    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.emailUfficiale,
      options: {
        redirectTo: `${allowedOrigin}/feed`,
      },
    });

    if (linkError) {
      req.log?.warn?.({ err: linkError }, "Failed to generate verification link, user created but email not sent");
    }

    const supabaseUserId = authData.user.id;

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;

    let orgResult: { id: number; ragioneSociale: string; username: string; emailUfficiale: string; createdAt: Date };

    try {
      orgResult = await db.transaction(async (tx) => {
        await tx.insert(usersTable).values({
          clerkUserId: supabaseUserId,
          username: data.username,
          accountType: "organization",
        });

        const [org] = await tx
          .insert(organizationsTable)
          .values({
            ragioneSociale: data.ragioneSociale,
            partitaIva: data.partitaIva,
            codiceFiscale: data.codiceFiscale,
            codiceUnivoco: data.codiceUnivoco.toUpperCase(),
            formaGiuridica: data.formaGiuridica,
            numeroRegistroImprese: data.numeroRegistroImprese ?? null,
            indirizzoVia: data.indirizzoVia,
            indirizzoCitta: data.indirizzoCitta,
            indirizzoCap: data.indirizzoCap,
            indirizzoStato: data.indirizzoStato,
            emailUfficiale: data.emailUfficiale,
            telefono: data.telefono ?? "",
            referenteNome: data.referenteNome,
            referenteCognome: data.referenteCognome,
            username: data.username,
            hashedPassword,
            ruoloUtente: data.ruoloUtente,
            numeroLicenze: data.numeroLicenze,
          })
          .returning();

        const orgUserId = `org:${org!.id}`;

        const activePolicies = await tx
          .select({ id: policiesTable.id, type: policiesTable.type })
          .from(policiesTable)
          .where(eq(policiesTable.isActive, true));

        const privacyPolicy = activePolicies.find((p) => p.type === "privacy");
        const termsPolicy = activePolicies.find((p) => p.type === "terms");

        const consentRecords: { userId: string; policyId: string; accepted: boolean; ipAddress: string | null; userAgent: string | null }[] = [];
        if (privacyPolicy) consentRecords.push({ userId: orgUserId, policyId: privacyPolicy.id, accepted: true, ipAddress, userAgent });
        if (termsPolicy) consentRecords.push({ userId: orgUserId, policyId: termsPolicy.id, accepted: true, ipAddress, userAgent });
        if (privacyPolicy) consentRecords.push({ userId: supabaseUserId, policyId: privacyPolicy.id, accepted: true, ipAddress, userAgent });
        if (termsPolicy) consentRecords.push({ userId: supabaseUserId, policyId: termsPolicy.id, accepted: true, ipAddress, userAgent });

        if (consentRecords.length > 0) {
          await tx.insert(userConsentsTable).values(consentRecords);
        }

        return org!;
      });
    } catch (dbErr) {
      req.log?.error?.({ err: dbErr }, "DB transaction failed for org registration, cleaning up Supabase user");
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(supabaseUserId).catch((delErr) => {
          req.log?.error?.({ err: delErr }, "Failed to delete Supabase user after DB rollback");
        });
      }
      res.status(500).json({ error: "Errore nella creazione dell'account. Riprova." });
      return;
    }

    res.status(201).json({
      id: orgResult.id,
      ragioneSociale: orgResult.ragioneSociale,
      username: orgResult.username,
      emailUfficiale: orgResult.emailUfficiale,
      createdAt: orgResult.createdAt.toISOString(),
      emailVerificationRequired: true,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Error registering organization");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

router.post("/register-ente/resend-verification", async (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email obbligatoria" });
    return;
  }

  const trimmed = email.trim();

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Servizio non disponibile" });
    return;
  }

  try {
    const allowedOrigin = process.env.APP_ORIGIN || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: trimmed,
      options: {
        redirectTo: `${allowedOrigin}/feed`,
      },
    });

    if (error) {
      if (error.message?.includes("rate") || error.message?.includes("limit") || error.message?.includes("exceeded")) {
        res.status(429).json({ error: "Troppe richieste. Attendi qualche minuto prima di riprovare." });
        return;
      }
      req.log?.warn?.({ err: error }, "Resend verification link error");
    }

    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Resend verification error");
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
