import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { policiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const PolicyTypeSchema = z.enum(["privacy", "terms"]);

const CreatePolicySchema = z.object({
  type: PolicyTypeSchema,
  version: z.string().min(1).max(20),
  content: z.string().min(10),
});

// GET /policies/:type — restituisce la policy attiva (privacy o terms)
router.get("/policies/:type", async (req, res) => {
  const parsed = PolicyTypeSchema.safeParse(req.params.type);
  if (!parsed.success) {
    res.status(400).json({ error: "Tipo policy non valido. Usa: privacy | terms" });
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
      .orderBy(policiesTable.createdAt);
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
    // Verifica che la versione non esista già
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
      .values({ type, version, content, isActive: false })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Errore nella creazione della policy");
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

    // Disattiva tutte le policy dello stesso tipo
    await db
      .update(policiesTable)
      .set({ isActive: false })
      .where(eq(policiesTable.type, target.type));

    // Attiva quella selezionata
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

export default router;
