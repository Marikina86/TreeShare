import { Router } from "express";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { organizationsTable, registerEnteSchema, userConsentsTable, policiesTable, usersTable, bannedEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAppOrigin() {
  return (
    process.env.APP_ORIGIN ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "") ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]!.trim()}` : "")
  );
}

// ---------------------------------------------------------------------------
// POST /api/register-ente
// Validazione + creazione utente Supabase (non confermato) + dati salvati in
// user_metadata. Nessun record nel DB fino alla conferma email.
// ---------------------------------------------------------------------------
router.post("/register-ente", async (req, res) => {
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
    // Blocca re-registrazione se l'email è stata bannata
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

    // Unicità username (solo se fornito esplicitamente)
    if (data.username && data.username.trim()) {
      const existing = await db
        .select({ id: organizationsTable.id })
        .from(organizationsTable)
        .where(eq(organizationsTable.username, data.username.trim()))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({
          error: "Username già in uso",
          fields: { username: "Questo username è già registrato." },
        });
        return;
      }
    }

    // Unicità email
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

    // Unicità PIVA
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

    // Auto-genera username dalla ragione sociale se non fornito
    const resolvedUsername = (data.username && data.username.trim())
      ? data.username.trim()
      : data.ragioneSociale
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 40) + "_" + Math.floor(Math.random() * 9000 + 1000);

    const fullName = [data.referenteNome, data.referenteCognome].filter(Boolean).join(" ") || resolvedUsername;

    // Hash password (va salvato nel DB organizations.hashedPassword)
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Tutti i dati ente da usare dopo la conferma email
    const pendingOrg = {
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
      referenteNome: data.referenteNome ?? "",
      referenteCognome: data.referenteCognome ?? "",
      username: resolvedUsername,
      hashedPassword,
      ruoloUtente: data.ruoloUtente,
      numeroLicenze: data.numeroLicenze,
    };

    // Crea utente Supabase NON confermato con tutti i dati in user_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.emailUfficiale,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        username: resolvedUsername,
        full_name: fullName,
        registration_type: "org_pending",
        pending_org: pendingOrg,
      },
    });

    if (authError) {
      if (
        authError.message?.includes("already registered") ||
        authError.message?.includes("already been registered") ||
        authError.message?.includes("already exists")
      ) {
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

    // Invia email di conferma via /auth/v1/resend
    // (generateLink genera solo il token senza spedire la mail;
    //  /auth/v1/resend usa l'SMTP configurato in Supabase — Hostinger)
    const allowedOrigin = getAppOrigin();
    const redirectTo = allowedOrigin ? `${allowedOrigin}/register-ente/activate` : undefined;

    const supabaseUrl = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;
    const resendUrl = redirectTo
      ? `${supabaseUrl}/auth/v1/resend?redirect_to=${encodeURIComponent(redirectTo)}`
      : `${supabaseUrl}/auth/v1/resend`;

    const resendRes = await fetch(resendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ type: "signup", email: data.emailUfficiale }),
    });

    if (!resendRes.ok) {
      const body = await resendRes.text().catch(() => "");
      req.log?.warn?.({ status: resendRes.status, body }, "Invio email conferma ente fallito");
    } else {
      req.log?.info?.("Email di conferma ente inviata");
    }

    // Risposta: nessun DB record creato. Il profilo viene creato su /activate.
    res.status(201).json({
      emailVerificationRequired: true,
      email: data.emailUfficiale,
    });
  } catch (err) {
    req.log?.error?.({ err }, "Error registering organization");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/register-ente/activate
// Chiamato dal frontend dopo che l'utente ha confermato l'email.
// Crea i record nel DB (users, organizations, user_consents) dai metadata.
// Idempotente: se l'ente esiste già restituisce 200.
// ---------------------------------------------------------------------------
router.post("/register-ente/activate", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const supabaseUserId = authReq.userId;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Servizio di autenticazione non disponibile" });
    return;
  }

  try {
    // Leggi i metadati dell'utente da Supabase
    const { data: userAdminData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    if (userErr || !userAdminData?.user) {
      res.status(401).json({ error: "Utente non trovato" });
      return;
    }

    const meta = userAdminData.user.user_metadata ?? {};

    // Idempotenza: se l'ente è già nel DB, ok
    const existing = await db
      .select({ id: organizationsTable.id, username: organizationsTable.username, ragioneSociale: organizationsTable.ragioneSociale, emailUfficiale: organizationsTable.emailUfficiale, createdAt: organizationsTable.createdAt })
      .from(organizationsTable)
      .where(eq(organizationsTable.emailUfficiale, userAdminData.user.email ?? ""))
      .limit(1);

    if (existing.length > 0) {
      const org = existing[0]!;
      res.status(200).json({
        id: org.id,
        ragioneSociale: org.ragioneSociale,
        username: org.username,
        emailUfficiale: org.emailUfficiale,
        createdAt: org.createdAt.toISOString(),
        alreadyActivated: true,
      });
      return;
    }

    // Dati ente dai metadati
    const pendingOrg = meta.pending_org as Record<string, unknown> | undefined;
    if (!pendingOrg) {
      res.status(400).json({ error: "Dati di registrazione non trovati. Completa la registrazione di nuovo." });
      return;
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;

    const orgResult = await db.transaction(async (tx) => {
      await tx.insert(usersTable).values({
        clerkUserId: supabaseUserId,
        username: pendingOrg.username as string,
        accountType: "organization",
      });

      const [org] = await tx
        .insert(organizationsTable)
        .values({
          ragioneSociale: pendingOrg.ragioneSociale as string,
          partitaIva: pendingOrg.partitaIva as string,
          codiceFiscale: pendingOrg.codiceFiscale as string,
          codiceUnivoco: pendingOrg.codiceUnivoco as string,
          formaGiuridica: pendingOrg.formaGiuridica as string,
          numeroRegistroImprese: (pendingOrg.numeroRegistroImprese as string | null) ?? null,
          indirizzoVia: pendingOrg.indirizzoVia as string,
          indirizzoCitta: pendingOrg.indirizzoCitta as string,
          indirizzoCap: pendingOrg.indirizzoCap as string,
          indirizzoStato: pendingOrg.indirizzoStato as string,
          emailUfficiale: pendingOrg.emailUfficiale as string,
          telefono: (pendingOrg.telefono as string) ?? "",
          referenteNome: (pendingOrg.referenteNome as string) ?? "",
          referenteCognome: (pendingOrg.referenteCognome as string) ?? "",
          username: pendingOrg.username as string,
          hashedPassword: pendingOrg.hashedPassword as string,
          ruoloUtente: pendingOrg.ruoloUtente as string,
          numeroLicenze: pendingOrg.numeroLicenze as number | null,
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

    req.log?.info?.({ orgId: orgResult.id }, "Org account activated after email confirmation");

    res.status(201).json({
      id: orgResult.id,
      ragioneSociale: orgResult.ragioneSociale,
      username: orgResult.username,
      emailUfficiale: orgResult.emailUfficiale,
      createdAt: orgResult.createdAt.toISOString(),
    });
  } catch (err) {
    req.log?.error?.({ err }, "Error activating org account");
    res.status(500).json({ error: "Errore nell'attivazione dell'account. Riprova o contatta l'assistenza." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/register-ente/resend-verification
// ---------------------------------------------------------------------------
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
    const allowedOrigin = getAppOrigin();
    const redirectTo = allowedOrigin ? `${allowedOrigin}/register-ente/activate` : undefined;

    const supabaseUrl = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;
    const resendUrl = redirectTo
      ? `${supabaseUrl}/auth/v1/resend?redirect_to=${encodeURIComponent(redirectTo)}`
      : `${supabaseUrl}/auth/v1/resend`;

    const resendRes = await fetch(resendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ type: "signup", email: trimmed }),
    });

    if (resendRes.status === 429) {
      res.status(429).json({ error: "Troppe richieste. Attendi qualche minuto prima di riprovare." });
      return;
    }

    if (!resendRes.ok) {
      const body = await resendRes.text().catch(() => "");
      req.log?.warn?.({ status: resendRes.status, body }, "Resend email verifica ente fallito");
      res.status(500).json({ error: "Errore nell'invio dell'email. Riprova." });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Resend verification error");
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
