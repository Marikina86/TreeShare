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

export default router;
