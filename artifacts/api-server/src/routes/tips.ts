import { Router } from "express";
import { db } from "@workspace/db";
import { tipsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { broadcastSSE } from "../lib/sseBroadcaster";

const router = Router();

// ── Categorie valide ─────────────────────────────────────────────────────────
const VALID_CATEGORIES = [
  "general", "piante", "coltivazione", "irrigazione",
  "potatura", "fertilizzazione", "parassiti", "stagioni",
];

// ── GET /tips — lista tutti i consigli (utenti autenticati) ──────────────────
// Cache lato browser 5 min + stale-while-revalidate 1h:
// i consigli cambiano raramente, non serve ricaricarli ad ogni visita.
router.get("/tips", requireAuth, async (req, res) => {
  try {
    const tips = await db
      .select()
      .from(tipsTable)
      .orderBy(desc(tipsTable.createdAt));

    res.setHeader("Cache-Control", "no-store");
    res.json(
      tips.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching tips");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/tips — crea consiglio (admin) ────────────────────────────────
router.post("/admin/tips", requireAuth, requireAdmin, async (req, res) => {
  const adminId = (req as AuthenticatedRequest).userId;
  const { title, description, category, imageUrl } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (typeof description !== "string" || !description.trim()) {
    res.status(400).json({ error: "description required" });
    return;
  }

  const resolvedCategory = VALID_CATEGORIES.includes(category) ? category : "general";
  const resolvedImageUrl = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;

  try {
    const [tip] = await db
      .insert(tipsTable)
      .values({
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 3000),
        category: resolvedCategory,
        imageUrl: resolvedImageUrl,
      })
      .returning();

    const payload = {
      ...tip,
      createdAt: tip.createdAt.toISOString(),
      updatedAt: tip.updatedAt.toISOString(),
    };

    // Notifica in tempo reale tramite il broadcaster SSE condiviso
    broadcastSSE("new_tip", payload);

    res.status(201).json(payload);
  } catch (err) {
    req.log.error({ err }, "Error creating tip");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /admin/tips/:id — modifica consiglio (admin) ──────────────────────
router.patch("/admin/tips/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, description, category, imageUrl } = req.body ?? {};

  const updates: Partial<typeof tipsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof title === "string" && title.trim()) updates.title = title.trim().slice(0, 200);
  if (typeof description === "string" && description.trim()) updates.description = description.trim().slice(0, 3000);
  if (VALID_CATEGORIES.includes(category)) updates.category = category;
  if (imageUrl !== undefined) {
    updates.imageUrl = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
  }

  try {
    const [updated] = await db
      .update(tipsTable)
      .set(updates)
      .where(eq(tipsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Tip not found" }); return; }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating tip");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /admin/tips/:id — elimina consiglio (admin) ──────────────────────
router.delete("/admin/tips/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [deleted] = await db
      .delete(tipsTable)
      .where(eq(tipsTable.id, id))
      .returning({ id: tipsTable.id });

    if (!deleted) { res.status(404).json({ error: "Tip not found" }); return; }
    res.json({ success: true, deletedId: deleted.id });
  } catch (err) {
    req.log.error({ err }, "Error deleting tip");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
