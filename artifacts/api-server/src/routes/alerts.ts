import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, usersTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { addSSEClient, broadcastSSE } from "../lib/sseBroadcaster";
import { z } from "zod";

const CreateAlertBody = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  targetGroup: z.enum(["all", "organization", "user"]).default("all"),
});

const PatchAlertBody = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  targetGroup: z.enum(["all", "organization", "user"]).optional(),
});

const router = Router();

// ── SSE endpoint ─────────────────────────────────────────────────────────────
// GET /alerts/sse — stream di eventi in tempo reale (pubblico, solo metadati)
router.get("/alerts/sse", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(`: connected\n\n`);
  addSSEClient(res);
});

// ── Lettura avvisi (utenti autenticati) ──────────────────────────────────────
// GET /alerts — lista avvisi filtrati per gruppo utente
router.get("/alerts", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [userRow] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));
    const userAccountType = userRow?.accountType ?? "user";

    const alerts = await db
      .select()
      .from(alertsTable)
      .where(
        or(
          eq(alertsTable.targetGroup, "all"),
          eq(alertsTable.targetGroup, userAccountType),
        )
      )
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
  const parsed = CreateAlertBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path[0]);
    if (fields.includes("title")) { res.status(400).json({ error: "title required" }); return; }
    res.status(400).json({ error: "message required" });
    return;
  }
  const { title, message, priority: resolvedPriority, targetGroup: resolvedGroup } = parsed.data;

  try {
    const [alert] = await db
      .insert(alertsTable)
      .values({
        title: title.trim(),
        message: message.trim(),
        priority: resolvedPriority,
        targetGroup: resolvedGroup,
        createdBy: adminId,
      })
      .returning();

    const payload = {
      ...alert,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    };

    broadcastSSE("new_alert", payload);
    res.status(201).json(payload);
  } catch (err) {
    req.log.error({ err }, "Error creating alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/alerts/:id — modifica avviso
router.patch("/admin/alerts/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = PatchAlertBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.issues });
    return;
  }

  const updates: Partial<typeof alertsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title.trim();
  if (parsed.data.message !== undefined) updates.message = parsed.data.message.trim();
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (parsed.data.targetGroup !== undefined) updates.targetGroup = parsed.data.targetGroup;

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
  const id = parseInt(req.params.id as string, 10);
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
