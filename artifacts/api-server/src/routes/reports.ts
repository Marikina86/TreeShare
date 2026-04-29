import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, usersTable, treesTable, eventsTable, treeUpdatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const VALID_REASONS = [
  "contenuto_falso",
  "spam",
  "comportamento_inappropriato",
  "violazione_privacy",
  "foto_non_vegetale",
  "evento_inappropriato",
  "evento_falso",
  "aggiornamento_non_reale",
  "altro",
];

// POST /reports — submit a report (user, tree, tree_update, or event)
router.post("/reports", requireAuth, async (req, res) => {
  const reporterUserId = (req as AuthenticatedRequest).userId;
  const { reportedUserId, treeId, treeUpdateId, eventId, reason, notes } = req.body ?? {};

  if (!reason || !VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }

  const parsedEventId = eventId != null ? parseInt(String(eventId), 10) : null;
  const parsedTreeId = treeId != null ? parseInt(String(treeId), 10) : null;
  const parsedTreeUpdateId = treeUpdateId != null ? parseInt(String(treeUpdateId), 10) : null;

  if (treeId != null && isNaN(parsedTreeId!)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  if (eventId != null && isNaN(parsedEventId!)) { res.status(400).json({ error: "Invalid eventId" }); return; }
  if (treeUpdateId != null && isNaN(parsedTreeUpdateId!)) { res.status(400).json({ error: "Invalid treeUpdateId" }); return; }

  try {
    let resolvedReportedUserId = typeof reportedUserId === "string" ? reportedUserId : null;
    let resolvedReportedUsername: string | null = null;
    let resolvedEventTitle: string | null = null;

    // --- Event report ---
    if (parsedEventId != null) {
      const [event] = await db
        .select({ id: eventsTable.id, userId: eventsTable.userId, title: eventsTable.title })
        .from(eventsTable)
        .where(eq(eventsTable.id, parsedEventId));

      if (!event) { res.status(404).json({ error: "Event not found" }); return; }
      if (event.userId === reporterUserId) { res.status(400).json({ error: "Cannot report your own event" }); return; }

      resolvedReportedUserId = event.userId;
      resolvedEventTitle = event.title;

      const [organizer] = await db
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, event.userId));
      resolvedReportedUsername = organizer?.username ?? null;

      const existing = await db
        .select({ id: reportsTable.id })
        .from(reportsTable)
        .where(and(
          eq(reportsTable.reporterUserId, reporterUserId),
          eq(reportsTable.eventId, parsedEventId),
          eq(reportsTable.status, "pending"),
        ));
      if (existing.length > 0) {
        res.status(409).json({ error: "already_reported", message: "Already reported" });
        return;
      }

      const [report] = await db
        .insert(reportsTable)
        .values({
          reporterUserId,
          reportedUserId: resolvedReportedUserId,
          reportedUsername: resolvedReportedUsername,
          eventId: parsedEventId,
          eventTitle: resolvedEventTitle,
          reason,
          notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
          status: "pending",
        })
        .returning();

      res.status(201).json({ id: report.id, status: report.status });
      return;
    }

    // --- Tree update report ---
    if (parsedTreeUpdateId != null) {
      const [update] = await db
        .select({ id: treeUpdatesTable.id, userId: treeUpdatesTable.userId, treeId: treeUpdatesTable.treeId })
        .from(treeUpdatesTable)
        .where(eq(treeUpdatesTable.id, parsedTreeUpdateId));

      if (!update) { res.status(404).json({ error: "Tree update not found" }); return; }
      if (update.userId === reporterUserId) { res.status(400).json({ error: "Cannot report your own update" }); return; }

      resolvedReportedUserId = update.userId;

      const [owner] = await db
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, update.userId));
      resolvedReportedUsername = owner?.username ?? null;

      const existing = await db
        .select({ id: reportsTable.id })
        .from(reportsTable)
        .where(and(
          eq(reportsTable.reporterUserId, reporterUserId),
          eq(reportsTable.treeUpdateId, parsedTreeUpdateId),
          eq(reportsTable.status, "pending"),
        ));
      if (existing.length > 0) {
        res.status(409).json({ error: "already_reported", message: "Already reported" });
        return;
      }

      const [report] = await db
        .insert(reportsTable)
        .values({
          reporterUserId,
          reportedUserId: resolvedReportedUserId,
          reportedUsername: resolvedReportedUsername,
          treeId: update.treeId,
          treeUpdateId: parsedTreeUpdateId,
          reason,
          notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
          status: "pending",
        })
        .returning();

      res.status(201).json({ id: report.id, status: report.status });
      return;
    }

    // --- User or tree report ---
    if (!resolvedReportedUserId) {
      res.status(400).json({ error: "reportedUserId required" });
      return;
    }
    if (resolvedReportedUserId === reporterUserId) {
      res.status(400).json({ error: "Cannot report yourself" });
      return;
    }

    const [reportedUser] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, resolvedReportedUserId));

    if (!reportedUser) { res.status(404).json({ error: "User not found" }); return; }
    resolvedReportedUsername = reportedUser.username;

    if (parsedTreeId != null) {
      const [tree] = await db.select({ id: treesTable.id }).from(treesTable).where(eq(treesTable.id, parsedTreeId));
      if (!tree) { res.status(404).json({ error: "Tree not found" }); return; }
    }

    const existing = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(and(
        eq(reportsTable.reporterUserId, reporterUserId),
        eq(reportsTable.reportedUserId, resolvedReportedUserId),
        eq(reportsTable.status, "pending"),
        ...(parsedTreeId != null ? [eq(reportsTable.treeId, parsedTreeId)] : []),
      ));

    if (existing.length > 0) {
      res.status(409).json({ error: "already_reported", message: "Already reported" });
      return;
    }

    const [report] = await db
      .insert(reportsTable)
      .values({
        reporterUserId,
        reportedUserId: resolvedReportedUserId,
        reportedUsername: resolvedReportedUsername,
        treeId: parsedTreeId,
        reason,
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
        status: "pending",
      })
      .returning();

    res.status(201).json({ id: report.id, status: report.status });
  } catch (err) {
    req.log.error({ err }, "Error creating report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/reports — list all reports (admin only)
router.get("/admin/reports", requireAuth, requireAdmin, async (req, res) => {
  const status = (req.query.status as string | undefined) ?? "all";
  try {
    const reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
    const filtered = status === "all" ? reports : reports.filter((r) => r.status === status);
    res.json(filtered.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Error listing reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/reports/:id/reviewed
router.patch("/admin/reports/:id/reviewed", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [updated] = await db.update(reportsTable).set({ status: "reviewed" }).where(eq(reportsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error reviewing report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/reports/:id/dismissed
router.patch("/admin/reports/:id/dismissed", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [updated] = await db.update(reportsTable).set({ status: "dismissed" }).where(eq(reportsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error dismissing report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/events/:eventId — delete an event (admin, from report panel)
router.delete("/admin/events/:eventId", requireAuth, requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) { res.status(400).json({ error: "Invalid eventId" }); return; }
  try {
    const [deleted] = await db.delete(eventsTable).where(eq(eventsTable.id, eventId)).returning({ id: eventsTable.id });
    if (!deleted) { res.status(404).json({ error: "Event not found" }); return; }
    await db.update(reportsTable).set({ status: "reviewed" }).where(
      and(eq(reportsTable.eventId, eventId), eq(reportsTable.status, "pending"))
    );
    res.json({ success: true, deletedEventId: deleted.id });
  } catch (err) {
    req.log.error({ err }, "Error deleting event");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
