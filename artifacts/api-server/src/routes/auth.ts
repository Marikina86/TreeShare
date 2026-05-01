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
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const signupUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  nome: z.string().min(1).max(100),
  cognome: z.string().min(1).max(100),
});

/**
 * POST /api/auth/signup-user
 * Crea un utente privato con email già confermata (no email di verifica).
 * Il frontend chiama poi signInWithPassword per ottenere la sessione.
 */
router.post("/auth/signup-user", async (req, res) => {
  const parsed = signupUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi" });
    return;
  }
  const { email, password, nome, cognome } = parsed.data;

  const [banned] = await db
    .select({ reason: bannedEmailsTable.reason })
    .from(bannedEmailsTable)
    .where(eq(bannedEmailsTable.email, email.toLowerCase()));
  if (banned) {
    res.status(403).json({ error: "Account non disponibile." });
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    res.status(503).json({ error: "Servizio non disponibile al momento." });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${nome} ${cognome}`,
      nome,
      cognome,
    },
  });

  if (error) {
    if (
      error.message?.includes("already registered") ||
      error.message?.includes("already been registered") ||
      error.message?.includes("already exists")
    ) {
      res.status(409).json({ error: "Email già registrata. Usa il login." });
      return;
    }
    req.log?.error?.({ err: error }, "Errore creazione utente privato");
    res.status(500).json({ error: "Errore nella creazione dell'account" });
    return;
  }

  res.status(201).json({ userId: data.user?.id });
});

export default router;
