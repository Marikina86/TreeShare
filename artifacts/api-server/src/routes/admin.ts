import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, treesTable, reportsTable, treeUpdatesTable, treeSunsTable, eventsTable, eventParticipantsTable, problemReportsTable, userConsentsTable, cookieConsentsTable, userNotificationsTable, donationCampaignsTable, donationsTable, orgBalancesTable, ledgerEntriesTable, payoutsTable, weeklyWinnersTable, organizationsTable } from "@workspace/db";
import { eq, desc, sql, count, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// GET /admin/stats — summary numbers
router.get("/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(usersTable);
    const [totalTrees] = await db.select({ count: count() }).from(treesTable);
    const [blockedUsers] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.isBlocked, true));

    res.json({
      totalUsers: Number(totalUsers?.count ?? 0),
      totalTrees: Number(totalTrees?.count ?? 0),
      blockedUsers: Number(blockedUsers?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/users — list all users
router.get("/admin/users", requireAuth, requireAdmin, async (req, res) => {
  const search = (req.query.search as string | undefined)?.toLowerCase() ?? "";
  try {
    const users = await db
      .select({
        id: usersTable.id,
        clerkUserId: usersTable.clerkUserId,
        username: usersTable.username,
        photoUrl: usersTable.photoUrl,
        country: usersTable.country,
        city: usersTable.city,
        treesPlanted: usersTable.treesPlanted,
        isBlocked: usersTable.isBlocked,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    const filtered = search
      ? users.filter(
          (u) =>
            u.username.toLowerCase().includes(search) ||
            (u.country ?? "").toLowerCase().includes(search) ||
            (u.city ?? "").toLowerCase().includes(search),
        )
      : users;

    res.json(
      filtered.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Error listing admin users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/users/:clerkUserId/block
router.patch(
  "/admin/users/:clerkUserId/block",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { clerkUserId } = req.params;
    const adminId = (req as any).userId;
    if (clerkUserId === adminId) {
      res.status(400).json({ error: "Cannot block yourself" });
      return;
    }
    try {
      const [updated] = await db
        .update(usersTable)
        .set({ isBlocked: true })
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .returning({ clerkUserId: usersTable.clerkUserId, isBlocked: usersTable.isBlocked });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Error blocking user");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// PATCH /admin/users/:clerkUserId/unblock
router.patch(
  "/admin/users/:clerkUserId/unblock",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { clerkUserId } = req.params;
    try {
      const [updated] = await db
        .update(usersTable)
        .set({ isBlocked: false })
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .returning({ clerkUserId: usersTable.clerkUserId, isBlocked: usersTable.isBlocked });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Error unblocking user");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /admin/users/:clerkUserId — hard delete user
router.delete(
  "/admin/users/:clerkUserId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { clerkUserId } = req.params;
    const adminId = (req as any).userId;
    if (clerkUserId === adminId) {
      res.status(400).json({ error: "Cannot delete yourself" });
      return;
    }
    try {
      const userTreeIds = await db.select({ id: treesTable.id }).from(treesTable).where(eq(treesTable.userId, clerkUserId));
      const treeIds = userTreeIds.map(t => t.id);

      if (treeIds.length > 0) {
        for (const treeId of treeIds) {
          await db.delete(treeSunsTable).where(eq(treeSunsTable.treeId, treeId));
          await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.treeId, treeId));
        }
      }

      await db.delete(treeSunsTable).where(eq(treeSunsTable.userId, clerkUserId));
      await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.userId, clerkUserId));
      await db.delete(treesTable).where(eq(treesTable.userId, clerkUserId));

      const userEvents = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.userId, clerkUserId));
      for (const ev of userEvents) {
        await db.delete(eventParticipantsTable).where(eq(eventParticipantsTable.eventId, ev.id));
      }
      await db.delete(eventParticipantsTable).where(eq(eventParticipantsTable.userId, clerkUserId));
      await db.delete(eventsTable).where(eq(eventsTable.userId, clerkUserId));

      await db.delete(donationsTable).where(eq(donationsTable.donorUserId, clerkUserId));
      await db.delete(donationCampaignsTable).where(eq(donationCampaignsTable.userId, clerkUserId));

      await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.orgUserId, clerkUserId));
      await db.delete(payoutsTable).where(eq(payoutsTable.userId, clerkUserId));
      await db.delete(orgBalancesTable).where(eq(orgBalancesTable.userId, clerkUserId));

      await db.delete(weeklyWinnersTable).where(eq(weeklyWinnersTable.userId, clerkUserId));
      await db.delete(problemReportsTable).where(eq(problemReportsTable.userId, clerkUserId));
      await db.delete(userNotificationsTable).where(eq(userNotificationsTable.userId, clerkUserId));
      await db.delete(userConsentsTable).where(eq(userConsentsTable.userId, clerkUserId));
      await db.delete(cookieConsentsTable).where(eq(cookieConsentsTable.userId, clerkUserId));
      await db.delete(reportsTable).where(eq(reportsTable.reporterUserId, clerkUserId));

      const [user] = await db.select({ accountType: usersTable.accountType }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
      if (user?.accountType === "organization") {
        const orgs = await db.select({ id: organizationsTable.id }).from(organizationsTable)
          .where(eq(organizationsTable.emailUfficiale, clerkUserId));
        for (const org of orgs) {
          await db.delete(userConsentsTable).where(eq(userConsentsTable.userId, `org:${org.id}`));
          await db.delete(organizationsTable).where(eq(organizationsTable.id, org.id));
        }
      }

      await db.delete(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Error deleting user (admin)");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /admin/trees — list trees that need moderation (pending only), paginated, searchable
router.get("/admin/trees", requireAuth, requireAdmin, async (req, res) => {
  const search = (req.query.search as string | undefined)?.toLowerCase() ?? "";
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  try {
    const query = db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        photoUrl: treesTable.photoUrl,
        plantName: treesTable.plantName,
        caption: treesTable.caption,
        species: treesTable.species,
        locationName: treesTable.locationName,
        country: treesTable.country,
        photoStatus: treesTable.photoStatus,
        verificationBypassed: treesTable.verificationBypassed,
        createdAt: treesTable.createdAt,
        username: usersTable.username,
        userPhotoUrl: usersTable.photoUrl,
      })
      .from(treesTable)
      .leftJoin(usersTable, eq(treesTable.userId, usersTable.clerkUserId))
      .where(eq(treesTable.photoStatus, "pending"))
      .orderBy(desc(treesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [trees, [{ total }]] = await Promise.all([
      query,
      db.select({ total: count() }).from(treesTable).where(eq(treesTable.photoStatus, "pending")),
    ]);

    const filtered = search
      ? trees.filter(
          (t) =>
            (t.username ?? "").toLowerCase().includes(search) ||
            (t.plantName ?? "").toLowerCase().includes(search) ||
            (t.species ?? "").toLowerCase().includes(search) ||
            (t.locationName ?? "").toLowerCase().includes(search) ||
            (t.country ?? "").toLowerCase().includes(search),
        )
      : trees;

    res.json({
      trees: filtered.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
      total: Number(total),
      page,
      pages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Error listing admin trees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/pending-counts — lightweight counts for badges (no heavy data)
router.get("/admin/pending-counts", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[treesCount], [updatesCount]] = await Promise.all([
      db.select({ total: count() }).from(treesTable).where(eq(treesTable.photoStatus, "pending")),
      db.select({ total: count() }).from(treeUpdatesTable).where(eq(treeUpdatesTable.photoStatus, "pending")),
    ]);
    res.json({
      pendingTrees: Number(treesCount?.total ?? 0),
      pendingUpdates: Number(updatesCount?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching pending counts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/trees/pending — list trees waiting for manual review (paginated)
router.get("/admin/trees/pending", requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const offset = (page - 1) * limit;
  try {
    const [trees, [totalRow]] = await Promise.all([
      db
        .select({
          id: treesTable.id,
          userId: treesTable.userId,
          photoUrl: treesTable.photoUrl,
          plantName: treesTable.plantName,
          caption: treesTable.caption,
          species: treesTable.species,
          locationName: treesTable.locationName,
          country: treesTable.country,
          photoStatus: treesTable.photoStatus,
          createdAt: treesTable.createdAt,
          username: usersTable.username,
          userPhotoUrl: usersTable.photoUrl,
        })
        .from(treesTable)
        .leftJoin(usersTable, eq(treesTable.userId, usersTable.clerkUserId))
        .where(eq(treesTable.photoStatus, "pending"))
        .orderBy(desc(treesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(treesTable).where(eq(treesTable.photoStatus, "pending")),
    ]);
    const total = Number(totalRow?.total ?? 0);
    res.json({
      items: trees.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
      total,
      page,
      limit,
      hasMore: offset + trees.length < total,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing pending trees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/trees/:treeId/approve — approve a pending tree
router.patch("/admin/trees/:treeId/approve", requireAuth, requireAdmin, async (req, res) => {
  const treeId = parseInt(req.params.treeId, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [updated] = await db
      .update(treesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treesTable.id, treeId))
      .returning({ id: treesTable.id, photoStatus: treesTable.photoStatus });
    if (!updated) { res.status(404).json({ error: "Tree not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/trees/:treeId/reject — reject a pending tree
router.patch("/admin/trees/:treeId/reject", requireAuth, requireAdmin, async (req, res) => {
  const treeId = parseInt(req.params.treeId, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [updated] = await db
      .update(treesTable)
      .set({ photoStatus: "rejected" })
      .where(eq(treesTable.id, treeId))
      .returning({ id: treesTable.id, photoStatus: treesTable.photoStatus });
    if (!updated) { res.status(404).json({ error: "Tree not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error rejecting tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/trees/:treeId — delete a tree
router.delete("/admin/trees/:treeId", requireAuth, requireAdmin, async (req, res) => {
  const treeId = parseInt(req.params.treeId, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [tree] = await db.select({ userId: treesTable.userId }).from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) { res.status(404).json({ error: "Tree not found" }); return; }
    await db.delete(treesTable).where(eq(treesTable.id, treeId));
    // Decrement user's tree count
    await db
      .update(usersTable)
      .set({ treesPlanted: sql`GREATEST(${usersTable.treesPlanted} - 1, 0)` })
      .where(eq(usersTable.clerkUserId, tree.userId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting tree (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /admin/tree-updates/pending — list tree updates waiting for manual review (paginated)
router.get("/admin/tree-updates/pending", requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const offset = (page - 1) * limit;
  try {
    const [updates, [totalRow]] = await Promise.all([
      db
        .select({
          id: treeUpdatesTable.id,
          treeId: treeUpdatesTable.treeId,
          photoUrl: treeUpdatesTable.photoUrl,
          note: treeUpdatesTable.note,
          photoStatus: treeUpdatesTable.photoStatus,
          createdAt: treeUpdatesTable.createdAt,
          username: usersTable.username,
          plantName: treesTable.plantName,
          species: treesTable.species,
        })
        .from(treeUpdatesTable)
        .innerJoin(treesTable, eq(treeUpdatesTable.treeId, treesTable.id))
        .leftJoin(usersTable, eq(treesTable.userId, usersTable.clerkUserId))
        .where(eq(treeUpdatesTable.photoStatus, "pending"))
        .orderBy(desc(treeUpdatesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(treeUpdatesTable).where(eq(treeUpdatesTable.photoStatus, "pending")),
    ]);
    const total = Number(totalRow?.total ?? 0);
    res.json({
      items: updates.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      total,
      page,
      limit,
      hasMore: offset + updates.length < total,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing pending tree updates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/tree-updates/:updateId/approve — approve a pending tree update
router.patch("/admin/tree-updates/:updateId/approve", requireAuth, requireAdmin, async (req, res) => {
  const updateId = parseInt(req.params.updateId, 10);
  if (isNaN(updateId)) { res.status(400).json({ error: "Invalid updateId" }); return; }
  try {
    const [updated] = await db
      .update(treeUpdatesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treeUpdatesTable.id, updateId))
      .returning({ id: treeUpdatesTable.id, photoStatus: treeUpdatesTable.photoStatus });
    if (!updated) { res.status(404).json({ error: "Update not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/tree-updates/:updateId/reject — reject (delete) a pending tree update
router.patch("/admin/tree-updates/:updateId/reject", requireAuth, requireAdmin, async (req, res) => {
  const updateId = parseInt(req.params.updateId, 10);
  if (isNaN(updateId)) { res.status(400).json({ error: "Invalid updateId" }); return; }
  try {
    const [deleted] = await db
      .delete(treeUpdatesTable)
      .where(eq(treeUpdatesTable.id, updateId))
      .returning({ id: treeUpdatesTable.id });
    if (!deleted) { res.status(404).json({ error: "Update not found" }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error rejecting tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/reports/:id/delete-tree — delete tree from report and mark reviewed
router.delete("/admin/reports/:id/delete-tree", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }

    if (report.treeId != null) {
      const [tree] = await db.select({ userId: treesTable.userId }).from(treesTable).where(eq(treesTable.id, report.treeId));
      if (tree) {
        await db.delete(treesTable).where(eq(treesTable.id, report.treeId));
        await db
          .update(usersTable)
          .set({ treesPlanted: sql`GREATEST(${usersTable.treesPlanted} - 1, 0)` })
          .where(eq(usersTable.clerkUserId, tree.userId));
      }
    }

    const [updated] = await db
      .update(reportsTable)
      .set({ status: "reviewed" })
      .where(eq(reportsTable.id, id))
      .returning();

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error deleting tree from report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
