import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { bannedEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

/**
 * GET /api/auth/banned?email=xxx
 */
router.get("/auth/banned", async (req, res) => {
  const email = (req.query.email as string | undefined)?.trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  try {
    const [row] = await db
      .select({ reason: bannedEmailsTable.reason })
      .from(bannedEmailsTable)
      .where(eq(bannedEmailsTable.email, email));
    res.json({ banned: !!row, reason: row?.reason ?? null });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

const signupUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  nome: z.string().min(1).max(100),
  cognome: z.string().min(1).max(100),
  citta: z.string().max(100).optional(),
  provincia: z.string().max(10).optional(),
});

/**
 * POST /api/auth/signup-user
 * Crea un utente privato NON confermato, invia email di verifica.
 * Il profilo nel DB viene creato solo dopo il click sul link (RegisterPrivatoActivatePage).
 */
router.post("/auth/signup-user", async (req, res) => {
  const parsed = signupUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi" });
    return;
  }
  const { email, password, nome, cognome, citta, provincia } = parsed.data;

  try {
    const [banned] = await db
      .select({ reason: bannedEmailsTable.reason })
      .from(bannedEmailsTable)
      .where(eq(bannedEmailsTable.email, email.toLowerCase()));
    if (banned) {
      res.status(403).json({
        error: banned.reason === "deleted"
          ? "Questo indirizzo email non può essere utilizzato per registrarsi."
          : "Questo account è stato sospeso. Contatta l'assistenza.",
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      res.status(503).json({ error: "Servizio non disponibile al momento." });
      return;
    }

    const rawUsername = `${nome}_${cognome}`
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_.-]/g, "")
      .slice(0, 30) || "user";

    // Crea utente NON confermato con tutti i dati nel user_metadata
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: nome,
        last_name: cognome,
        full_name: `${nome} ${cognome}`,
        username: rawUsername,
        city: citta ?? null,
        province: provincia ?? null,
      },
    });

    if (error) {
      if (
        error.message?.includes("already registered") ||
        error.message?.includes("already been registered") ||
        error.message?.includes("already exists")
      ) {
        res.status(409).json({ error: "Email già registrata. Usa il login o recupera la password." });
        return;
      }
      req.log?.error?.({ err: error }, "Errore creazione utente privato");
      res.status(500).json({ error: "Errore nella creazione dell'account" });
      return;
    }

    if (!data.user) {
      res.status(500).json({ error: "Errore nella creazione dell'account" });
      return;
    }

    // Invia email di verifica tramite generateLink → usa SMTP configurato in Supabase
    const allowedOrigin = getAppOrigin();
    const redirectTo = allowedOrigin ? `${allowedOrigin}/register-privato/activate` : undefined;

    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: { ...(redirectTo ? { redirectTo } : {}) },
    });

    if (linkError) {
      req.log?.warn?.({ err: linkError }, "generateLink fallito per utente privato — fallback resend");
      try {
        const supabaseUrl = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        await fetch(`${supabaseUrl}/auth/v1/resend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "signup",
            email,
            ...(redirectTo ? { redirect_to: redirectTo } : {}),
          }),
        });
      } catch (resendErr) {
        req.log?.warn?.({ err: resendErr }, "Resend fallback fallito");
      }
    }

    res.status(201).json({ emailVerificationRequired: true, email });
  } catch (err) {
    req.log?.error?.({ err }, "Errore registrazione utente privato");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

/**
 * POST /api/auth/resend-verification
 * Reinvia l'email di verifica a un utente privato non ancora confermato.
 */
router.post("/auth/resend-verification", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email obbligatoria" });
    return;
  }

  const trimmed = email.trim();
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Servizio non disponibile" });
    return;
  }

  try {
    const allowedOrigin = getAppOrigin();
    const redirectTo = allowedOrigin ? `${allowedOrigin}/register-privato/activate` : undefined;

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: trimmed,
      options: { ...(redirectTo ? { redirectTo } : {}) },
    });

    if (error) {
      if (error.message?.includes("rate") || error.message?.includes("limit") || error.message?.includes("exceeded")) {
        res.status(429).json({ error: "Troppe richieste. Attendi qualche minuto prima di riprovare." });
        return;
      }
      // Fallback REST Supabase
      const supabaseUrl = process.env.SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      try {
        await fetch(`${supabaseUrl}/auth/v1/resend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            type: "signup",
            email: trimmed,
            ...(redirectTo ? { redirect_to: redirectTo } : {}),
          }),
        });
      } catch { /* silent */ }
    }

    res.json({ ok: true });
  } catch (err) {
    req.log?.error?.({ err }, "Resend verification error");
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
