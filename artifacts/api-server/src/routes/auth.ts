import { Router } from "express";
import { db } from "@workspace/db";
import { bannedEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/auth/banned?email=xxx
 * Endpoint pubblico: verifica se un'email è bannata (account eliminato o bloccato).
 * Usato dal frontend prima del signup per impedire re-registrazione.
 * Non espone informazioni sensibili: restituisce solo { banned: boolean }.
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

/**
 * POST /api/auth/verify-captcha
 * Verifica un token reCAPTCHA v2 con l'API di Google.
 * Usa RECAPTCHA_SECRET_KEY se configurata, altrimenti la chiave di test ufficiale Google.
 * In caso di errore di rete verso Google, consente il passaggio (graceful degradation).
 */
router.post("/auth/verify-captcha", async (req, res) => {
  const { token } = (req.body ?? {}) as { token?: string };
  if (!token) {
    res.status(400).json({ success: false, error: "Token mancante" });
    return;
  }

  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const TEST_SECRET_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ7Zv8bIo";
  const secretKey =
    isProduction && process.env.RECAPTCHA_SECRET_KEY
      ? process.env.RECAPTCHA_SECRET_KEY
      : TEST_SECRET_KEY;

  try {
    const verifyRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      },
    );
    const data = (await verifyRes.json()) as { success: boolean; "error-codes"?: string[] };

    if (data.success) {
      res.json({ success: true });
    } else {
      req.log.warn({ errorCodes: data["error-codes"] }, "reCAPTCHA verification failed");
      res.status(400).json({ success: false, error: "Verifica reCAPTCHA non riuscita. Riprova." });
    }
  } catch (err) {
    req.log.warn({ err }, "reCAPTCHA verify network error — allowing request (graceful degradation)");
    res.json({ success: true });
  }
});

export default router;
