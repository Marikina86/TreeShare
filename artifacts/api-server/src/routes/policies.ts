import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { policiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { TERMS_HTML, PRIVACY_HTML, COOKIE_HTML, SEED_VERSION } from "../lib/legalSeedContent";

const router = Router();

const PolicyTypeSchema = z.enum(["privacy", "terms", "cookie", "location", "marketing"]);

const CreatePolicySchema = z.object({
  type: PolicyTypeSchema,
  version: z.string().min(1).max(50),
  content: z.string().optional(),
  checkboxLabel: z.string().max(500).optional(),
  consentNote: z.string().max(500).optional(),
  requiresAcceptance: z.boolean().optional(),
});

const PatchPolicySchema = z.object({
  checkboxLabel: z.string().max(500).nullable().optional(),
  consentNote: z.string().max(500).nullable().optional(),
  requiresAcceptance: z.boolean().optional(),
  content: z.string().optional(),
});

// GET /policies/:type — restituisce la policy attiva
router.get("/policies/:type", async (req, res) => {
  const parsed = PolicyTypeSchema.safeParse(req.params.type);
  if (!parsed.success) {
    res.status(400).json({ error: "Tipo policy non valido. Usa: privacy | terms | cookie" });
    return;
  }

  try {
    const [policy] = await db
      .select()
      .from(policiesTable)
      .where(and(eq(policiesTable.type, parsed.data), eq(policiesTable.isActive, true)))
      .limit(1);

    if (!policy) {
      res.status(404).json({ error: "Nessuna policy attiva trovata per questo tipo" });
      return;
    }

    res.json(policy);
  } catch (err) {
    req.log.error({ err }, "Errore nel recupero della policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /policies — lista tutte le policy (admin)
router.get("/policies", requireAuth, requireAdmin, async (req, res) => {
  try {
    const policies = await db
      .select()
      .from(policiesTable)
      .orderBy(desc(policiesTable.createdAt));
    res.json(policies);
  } catch (err) {
    req.log.error({ err }, "Errore nel recupero delle policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /policies — crea nuova versione policy (admin)
router.post("/policies", requireAuth, requireAdmin, async (req, res) => {
  const parsed = CreatePolicySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  const { type, version, content } = parsed.data;

  try {
    const existing = await db
      .select({ id: policiesTable.id })
      .from(policiesTable)
      .where(and(eq(policiesTable.type, type), eq(policiesTable.version, version)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: `Versione ${version} già esistente per il tipo ${type}` });
      return;
    }

    const [created] = await db
      .insert(policiesTable)
      .values({
        type,
        version,
        content: content ?? "",
        checkboxLabel: parsed.data.checkboxLabel ?? null,
        consentNote: parsed.data.consentNote ?? null,
        requiresAcceptance: parsed.data.requiresAcceptance ?? true,
        isActive: false,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Errore nella creazione della policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// PATCH /policies/:id — aggiorna solo label/nota/requiresAcceptance (admin)
router.patch("/policies/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;
  const parsed = PatchPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  try {
    const [target] = await db
      .select({ id: policiesTable.id })
      .from(policiesTable)
      .where(eq(policiesTable.id, id))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: "Policy non trovata" });
      return;
    }

    const updateData: Partial<typeof policiesTable.$inferInsert> = {};
    if ("checkboxLabel" in parsed.data) updateData.checkboxLabel = parsed.data.checkboxLabel ?? null;
    if ("consentNote" in parsed.data) updateData.consentNote = parsed.data.consentNote ?? null;
    if ("requiresAcceptance" in parsed.data && parsed.data.requiresAcceptance !== undefined) {
      updateData.requiresAcceptance = parsed.data.requiresAcceptance;
    }
    if ("content" in parsed.data && parsed.data.content !== undefined) {
      updateData.content = parsed.data.content;
    }

    const [updated] = await db
      .update(policiesTable)
      .set(updateData)
      .where(eq(policiesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Errore nell'aggiornamento della policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// PUT /policies/:id/activate — attiva una versione, disattiva le altre dello stesso tipo (admin)
router.put("/policies/:id/activate", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  try {
    const [target] = await db
      .select()
      .from(policiesTable)
      .where(eq(policiesTable.id, id))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: "Policy non trovata" });
      return;
    }

    await db
      .update(policiesTable)
      .set({ isActive: false })
      .where(eq(policiesTable.type, target.type));

    const [activated] = await db
      .update(policiesTable)
      .set({ isActive: true })
      .where(eq(policiesTable.id, id))
      .returning();

    res.json(activated);
  } catch (err) {
    req.log.error({ err }, "Errore nell'attivazione della policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// DELETE /policies/:id — elimina una versione non attiva (admin)
router.delete("/policies/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  try {
    const [target] = await db
      .select({ isActive: policiesTable.isActive })
      .from(policiesTable)
      .where(eq(policiesTable.id, id))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: "Policy non trovata" });
      return;
    }

    if (target.isActive) {
      res.status(400).json({ error: "Non è possibile eliminare la versione attiva. Attiva prima un'altra versione." });
      return;
    }

    await db.delete(policiesTable).where(eq(policiesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Errore nell'eliminazione della policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /admin/policies/seed — popola le policy iniziali dal contenuto predefinito (admin)
// Inserisce solo i tipi mancanti; non sovrascrive versioni esistenti.
router.post("/admin/policies/seed", requireAuth, requireAdmin, async (req, res) => {
  const seeds = [
    { type: "terms" as const, version: SEED_VERSION, content: TERMS_HTML },
    { type: "privacy" as const, version: SEED_VERSION, content: PRIVACY_HTML },
    { type: "cookie" as const, version: SEED_VERSION, content: COOKIE_HTML },
  ];

  const results: string[] = [];

  try {
    for (const seed of seeds) {
      const existing = await db
        .select({ id: policiesTable.id })
        .from(policiesTable)
        .where(and(eq(policiesTable.type, seed.type), eq(policiesTable.version, seed.version)))
        .limit(1);

      if (existing.length > 0) {
        results.push(`${seed.type} v${seed.version}: già presente, saltato`);
        continue;
      }

      const [inserted] = await db
        .insert(policiesTable)
        .values({ type: seed.type, version: seed.version, content: seed.content, isActive: false })
        .returning({ id: policiesTable.id });

      // Attiva se non esiste ancora una versione attiva per questo tipo
      const [activeExisting] = await db
        .select({ id: policiesTable.id })
        .from(policiesTable)
        .where(and(eq(policiesTable.type, seed.type), eq(policiesTable.isActive, true)))
        .limit(1);

      if (!activeExisting) {
        await db
          .update(policiesTable)
          .set({ isActive: true })
          .where(eq(policiesTable.id, inserted.id));
        results.push(`${seed.type} v${seed.version}: inserito e attivato`);
      } else {
        results.push(`${seed.type} v${seed.version}: inserito (non attivato, esiste già una versione attiva)`);
      }
    }

    req.log.info({ results }, "[policies/seed] Seed completato");
    res.json({ ok: true, results });
  } catch (err) {
    req.log.error({ err }, "Errore nel seed delle policy");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
