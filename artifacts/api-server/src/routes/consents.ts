import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { userConsentsTable, policiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

const SaveConsentSchema = z.object({
  policyId: z.string().uuid(),
  accepted: z.boolean(),
});

const SaveMultipleConsentsSchema = z.object({
  consents: z.array(SaveConsentSchema).min(1).max(10),
});

// POST /consent — salva uno o più consensi utente
// Usato alla registrazione per Privacy Policy + Termini
router.post("/consent", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  const parsed = SaveMultipleConsentsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  try {
    // Verifica che tutte le policy esistano
    const policyIds = parsed.data.consents.map((c) => c.policyId);
    const foundPolicies = await db
      .select({ id: policiesTable.id, type: policiesTable.type, version: policiesTable.version })
      .from(policiesTable)
      .where(eq(policiesTable.isActive, true));

    const foundIds = new Set(foundPolicies.map((p) => p.id));
    const missing = policyIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      res.status(400).json({ error: "Alcune policy non trovate o non attive", missing });
      return;
    }

    // Inserisci tutti i consensi (storico — non si sovrascrive mai)
    const records = parsed.data.consents.map((c) => ({
      userId,
      policyId: c.policyId,
      accepted: c.accepted,
      ipAddress,
      userAgent,
    }));

    const inserted = await db
      .insert(userConsentsTable)
      .values(records)
      .returning();

    res.status(201).json({
      message: "Consensi salvati con successo",
      consents: inserted,
    });
  } catch (err) {
    req.log.error({ err }, "Errore nel salvataggio dei consensi");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /users/:id/consents — storico consensi di un utente
// :id = clerk_user_id
router.get("/users/:id/consents", requireAuth, async (req, res) => {
  const requestingUserId = (req as AuthenticatedRequest).userId;
  const { id } = req.params;

  // Un utente può vedere solo i propri consensi (a meno che non sia admin)
  if (requestingUserId !== id) {
    res.status(403).json({ error: "Non autorizzato a visualizzare i consensi di questo utente" });
    return;
  }

  try {
    const consents = await db
      .select({
        id: userConsentsTable.id,
        userId: userConsentsTable.userId,
        accepted: userConsentsTable.accepted,
        acceptedAt: userConsentsTable.acceptedAt,
        ipAddress: userConsentsTable.ipAddress,
        policyId: policiesTable.id,
        policyType: policiesTable.type,
        policyVersion: policiesTable.version,
        policyActive: policiesTable.isActive,
      })
      .from(userConsentsTable)
      .innerJoin(policiesTable, eq(userConsentsTable.policyId, policiesTable.id))
      .where(eq(userConsentsTable.userId, id))
      .orderBy(desc(userConsentsTable.acceptedAt));

    res.json(consents);
  } catch (err) {
    req.log.error({ err }, "Errore nel recupero dei consensi");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /consent/status — verifica se l'utente ha accettato tutte le policy attive
router.get("/consent/status", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    // Recupera le policy attive
    const activePolicies = await db
      .select()
      .from(policiesTable)
      .where(eq(policiesTable.isActive, true));

    if (activePolicies.length === 0) {
      res.json({ upToDate: true, missing: [] });
      return;
    }

    // Per ogni policy attiva, verifica che l'utente abbia un consenso "accepted"
    const missing: { policyId: string; type: string; version: string }[] = [];

    for (const policy of activePolicies) {
      const [consent] = await db
        .select({ id: userConsentsTable.id, accepted: userConsentsTable.accepted })
        .from(userConsentsTable)
        .where(
          and(
            eq(userConsentsTable.userId, userId),
            eq(userConsentsTable.policyId, policy.id),
            eq(userConsentsTable.accepted, true)
          )
        )
        .limit(1);

      if (!consent) {
        missing.push({ policyId: policy.id, type: policy.type, version: policy.version });
      }
    }

    res.json({ upToDate: missing.length === 0, missing });
  } catch (err) {
    req.log.error({ err }, "Errore nel controllo status consensi");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// DELETE /consent/:policyId — revoca consenso (GDPR right to withdraw)
router.delete("/consent/:policyId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { policyId } = req.params;

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  try {
    // Verifica che la policy esista
    const [policy] = await db
      .select({ id: policiesTable.id })
      .from(policiesTable)
      .where(eq(policiesTable.id, policyId))
      .limit(1);

    if (!policy) {
      res.status(404).json({ error: "Policy non trovata" });
      return;
    }

    // Inserisce un nuovo record con accepted=false (storico, non cancella mai i dati)
    const [revoked] = await db
      .insert(userConsentsTable)
      .values({
        userId,
        policyId,
        accepted: false,
        ipAddress,
        userAgent,
      })
      .returning();

    res.json({ message: "Consenso revocato", record: revoked });
  } catch (err) {
    req.log.error({ err }, "Errore nella revoca del consenso");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
