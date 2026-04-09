import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { addSSEClient, broadcastSSE } from "../lib/sseBroadcaster";

const router = Router();

// ── SSE endpoint ─────────────────────────────────────────────────────────────
// GET /alerts/sse — stream di eventi in tempo reale (pubblico, solo metadati)
router.get("/alerts/sse", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // disabilita il buffering nginx
  });
  res.flushHeaders();
  res.write(`: connected\n\n`);
  addSSEClient(res);
});

// ── Lettura avvisi (utenti autenticati) ──────────────────────────────────────
// GET /alerts — lista tutti gli avvisi, dal più recente
router.get("/alerts", requireAuth, async (req, res) => {
  try {
    const alerts = await db
      .select()
      .from(alertsTable)
      .orderBy(desc(alertsTable.createdAt));

    res.json(
      alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: CRUD avvisi ───────────────────────────────────────────────────────
// POST /admin/alerts — crea avviso
router.post("/admin/alerts", requireAuth, requireAdmin, async (req, res) => {
  const adminId = (req as AuthenticatedRequest).userId;
  const { title, message, priority } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message required" });
    return;
  }

  const validPriorities = ["low", "normal", "high", "critical"];
  const resolvedPriority = validPriorities.includes(priority) ? priority : "normal";

  try {
    const [alert] = await db
      .insert(alertsTable)
      .values({
        title: title.trim().slice(0, 200),
        message: message.trim().slice(0, 2000),
        priority: resolvedPriority,
        createdBy: adminId,
      })
      .returning();

    const payload = {
      ...alert,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    };

    // Notifica in tempo reale a tutti i client SSE connessi
    broadcastSSE("new_alert", payload);

    res.status(201).json(payload);
  } catch (err) {
    req.log.error({ err }, "Error creating alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/alerts/:id — modifica avviso
router.patch("/admin/alerts/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, message, priority } = req.body ?? {};
  const validPriorities = ["low", "normal", "high", "critical"];

  const updates: Partial<typeof alertsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof title === "string" && title.trim()) updates.title = title.trim().slice(0, 200);
  if (typeof message === "string" && message.trim()) updates.message = message.trim().slice(0, 2000);
  if (validPriorities.includes(priority)) updates.priority = priority;

  try {
    const [updated] = await db
      .update(alertsTable)
      .set(updates)
      .where(eq(alertsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Alert not found" }); return; }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/alerts/:id — elimina avviso
router.delete("/admin/alerts/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [deleted] = await db
      .delete(alertsTable)
      .where(eq(alertsTable.id, id))
      .returning({ id: alertsTable.id });

    if (!deleted) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json({ success: true, deletedId: deleted.id });
  } catch (err) {
    req.log.error({ err }, "Error deleting alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
