import { Router } from "express";
import { logAdminAction } from "../lib/auditLog";
import { db } from "@workspace/db";
import { usersTable, treesTable, reportsTable, treeUpdatesTable, treeSunsTable, treeStatusReportsTable, eventsTable, eventParticipantsTable, problemReportsTable, userConsentsTable, cookieConsentsTable, userNotificationsTable, donationCampaignsTable, weeklyWinnersTable, organizationsTable, alertsTable, adoptableTreesTable, bannedEmailsTable } from "@workspace/db";
import { eq, desc, sql, count, ilike, or, inArray, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { existsSync, unlinkSync } from "fs";
import { join, resolve } from "path";

const router = Router();

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Recupera l'email di un utente: per le org usa il DB; per i privati usa Supabase admin. */
async function getUserEmail(clerkUserId: string, accountType: string, username: string | null): Promise<string | null> {
  if (accountType === "organization" && username) {
    const [org] = await db.select({ email: organizationsTable.emailUfficiale })
      .from(organizationsTable)
      .where(eq(organizationsTable.username, username));
    return org?.email ?? null;
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.admin.getUserById(clerkUserId);
    return data?.user?.email ?? null;
  } catch { return null; }
}

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function deletePhotoFromStorage(photoUrl: string): Promise<void> {
  if (!photoUrl) return;
  try {
    if (photoUrl.startsWith("http") && photoUrl.includes("cloudinary")) {
      if (isCloudinaryConfigured()) {
        const match = photoUrl.match(/\/treeshare\/([^/.]+)/);
        if (match) {
          await cloudinary.uploader.destroy(`treeshare/${match[1]}`);
        }
      }
    } else if (photoUrl.startsWith("/objects/uploads/")) {
      const filename = photoUrl.replace("/objects/uploads/", "");
      const uploadsDir = join(process.cwd(), "uploads");
      const filePath = join(uploadsDir, filename);
      if (!resolve(filePath).startsWith(resolve(uploadsDir) + "/")) return;
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  } catch {}
}

async function collectAndDeleteUserPhotos(clerkUserId: string): Promise<void> {
  const photoUrls: string[] = [];

  const [userRow] = await db.select({ photoUrl: usersTable.photoUrl }).from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  if (userRow?.photoUrl) photoUrls.push(userRow.photoUrl);

  const trees = await db.select({ photoUrl: treesTable.photoUrl, photoThumbnailUrl: treesTable.photoThumbnailUrl }).from(treesTable).where(eq(treesTable.userId, clerkUserId));
  for (const t of trees) {
    if (t.photoUrl) photoUrls.push(t.photoUrl);
    if (t.photoThumbnailUrl) photoUrls.push(t.photoThumbnailUrl);
  }

  const updates = await db.select({ photoUrl: treeUpdatesTable.photoUrl }).from(treeUpdatesTable).where(eq(treeUpdatesTable.userId, clerkUserId));
  for (const u of updates) {
    if (u.photoUrl) photoUrls.push(u.photoUrl);
  }

  const campaigns = await db.select({ photos: donationCampaignsTable.photos }).from(donationCampaignsTable).where(eq(donationCampaignsTable.userId, clerkUserId));
  for (const c of campaigns) {
    const arr = Array.isArray(c.photos) ? c.photos : [];
    for (const p of arr) {
      if (typeof p === "string" && p) photoUrls.push(p);
    }
  }

  await Promise.allSettled(photoUrls.map((url) => deletePhotoFromStorage(url)));
}

// GET /admin/stats — summary numbers
router.get("/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [[totalUsers], [totalTrees], [blockedUsers]] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(treesTable),
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.isBlocked, true)),
    ]);

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
  const search = (req.query.search as string | undefined) ?? "";
  try {
    const users = await db
      .select({
        id: usersTable.id,
        clerkUserId: usersTable.clerkUserId,
        username: usersTable.username,
        photoUrl: usersTable.photoUrl,
        country: usersTable.country,
        city: usersTable.city,
        accountType: usersTable.accountType,
        treesPlanted: usersTable.treesPlanted,
        isBlocked: usersTable.isBlocked,
        createdAt: usersTable.createdAt,
        formaGiuridica: organizationsTable.formaGiuridica,
      })
      .from(usersTable)
      .leftJoin(organizationsTable, eq(organizationsTable.username, usersTable.username))
      .where(search ? or(
        ilike(usersTable.username, `%${search}%`),
        ilike(usersTable.country, `%${search}%`),
        ilike(usersTable.city, `%${search}%`),
      ) : undefined)
      .orderBy(desc(usersTable.createdAt));

    res.json(
      users.map((u) => ({
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
    const clerkUserId = req.params.clerkUserId as string;
    const adminId = (req as any).userId;
    if (clerkUserId === adminId) {
      res.status(400).json({ error: "Cannot block yourself" });
      return;
    }
    try {
      const [target] = await db
        .select({ clerkUserId: usersTable.clerkUserId, accountType: usersTable.accountType, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId));
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const [updated] = await db
        .update(usersTable)
        .set({ isBlocked: true })
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .returning({ clerkUserId: usersTable.clerkUserId, isBlocked: usersTable.isBlocked });

      // Registra l'email nella bannedEmailsTable per impedire re-registrazione
      try {
        const email = await getUserEmail(clerkUserId, target.accountType, target.username);
        if (email) {
          await db.insert(bannedEmailsTable)
            .values({ email: email.toLowerCase(), reason: "blocked", bannedBy: adminId })
            .onConflictDoUpdate({
              target: bannedEmailsTable.email,
              set: { reason: "blocked", bannedAt: sql`now()`, bannedBy: adminId },
            });
        }
      } catch (err) {
        req.log.warn({ err, clerkUserId }, "Could not record banned email on block (non-fatal)");
      }

      await logAdminAction(adminId, "user_block", "user", clerkUserId, { username: target.username });
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
    const clerkUserId = req.params.clerkUserId as string;
    try {
      const [target] = await db
        .select({ accountType: usersTable.accountType, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId));

      const [updated] = await db
        .update(usersTable)
        .set({ isBlocked: false })
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .returning({ clerkUserId: usersTable.clerkUserId, isBlocked: usersTable.isBlocked });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Rimuovi l'email dalla bannedEmailsTable: utente riabilitato
      if (target) {
        try {
          const email = await getUserEmail(clerkUserId, target.accountType, target.username);
          if (email) {
            await db.delete(bannedEmailsTable).where(eq(bannedEmailsTable.email, email.toLowerCase()));
          }
        } catch (err) {
          req.log.warn({ err, clerkUserId }, "Could not remove banned email on unblock (non-fatal)");
        }
      }

      await logAdminAction((req as any).userId, "user_unblock", "user", clerkUserId, { username: target?.username });
      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Error unblocking user");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /admin/users/:clerkUserId — hard delete user + all related data + photos + auth
router.delete(
  "/admin/users/:clerkUserId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const clerkUserId = req.params.clerkUserId as string;
    const adminId = (req as any).userId;
    if (clerkUserId === adminId) {
      res.status(400).json({ error: "Cannot delete yourself" });
      return;
    }

    const [targetUser] = await db.select({ id: usersTable.id, accountType: usersTable.accountType, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Recupera l'email PRIMA della cancellazione (org: da DB; privati: da Supabase)
    let userEmailToBan: string | null = null;
    try {
      userEmailToBan = await getUserEmail(clerkUserId, targetUser.accountType, targetUser.username);
    } catch (err) {
      req.log.warn({ err, clerkUserId }, "Could not fetch email before delete (proceeding anyway)");
    }

    try {
      await collectAndDeleteUserPhotos(clerkUserId);
      req.log.info({ clerkUserId }, "Photos deleted for user");
    } catch (err) {
      req.log.warn({ err, clerkUserId }, "Photo deletion partial failure (proceeding with DB cleanup)");
    }

    try {
      await db.transaction(async (tx) => {
        const userTreeIds = await tx.select({ id: treesTable.id }).from(treesTable).where(eq(treesTable.userId, clerkUserId));
        const treeIds = userTreeIds.map(t => t.id);

        if (treeIds.length > 0) {
          await tx.delete(treeStatusReportsTable).where(inArray(treeStatusReportsTable.treeId, treeIds));
          await tx.delete(treeSunsTable).where(inArray(treeSunsTable.treeId, treeIds));
          await tx.delete(treeUpdatesTable).where(inArray(treeUpdatesTable.treeId, treeIds));
        }

        await tx.delete(treeSunsTable).where(eq(treeSunsTable.userId, clerkUserId));
        await tx.delete(treeUpdatesTable).where(eq(treeUpdatesTable.userId, clerkUserId));
        await tx.delete(treesTable).where(eq(treesTable.userId, clerkUserId));

        const userEvents = await tx.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.userId, clerkUserId));
        const eventIds = userEvents.map(e => e.id);
        if (eventIds.length > 0) {
          await tx.delete(eventParticipantsTable).where(inArray(eventParticipantsTable.eventId, eventIds));
        }
        await tx.delete(eventParticipantsTable).where(eq(eventParticipantsTable.userId, clerkUserId));
        await tx.delete(eventsTable).where(eq(eventsTable.userId, clerkUserId));

        await tx.delete(donationCampaignsTable).where(eq(donationCampaignsTable.userId, clerkUserId));

        await tx.delete(weeklyWinnersTable).where(eq(weeklyWinnersTable.userId, clerkUserId));
        await tx.delete(problemReportsTable).where(eq(problemReportsTable.userId, clerkUserId));
        await tx.delete(userNotificationsTable).where(eq(userNotificationsTable.userId, clerkUserId));
        await tx.delete(userConsentsTable).where(eq(userConsentsTable.userId, clerkUserId));
        await tx.delete(cookieConsentsTable).where(eq(cookieConsentsTable.userId, clerkUserId));
        await tx.delete(reportsTable).where(eq(reportsTable.reporterUserId, clerkUserId));
        await tx.delete(reportsTable).where(eq(reportsTable.reportedUserId, clerkUserId));
        await tx.delete(alertsTable).where(eq(alertsTable.createdBy, clerkUserId));

        if (targetUser.accountType === "organization" && targetUser.username) {
          const orgs = await tx.select({ id: organizationsTable.id }).from(organizationsTable)
            .where(eq(organizationsTable.username, targetUser.username));
          for (const org of orgs) {
            await tx.delete(userConsentsTable).where(eq(userConsentsTable.userId, `org:${org.id}`));
          }
          await tx.delete(organizationsTable).where(eq(organizationsTable.username, targetUser.username));
        }

        await tx.delete(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));

        // Registra l'email come bannata dentro la transazione (rollback atomico se qualcosa va storto)
        if (userEmailToBan) {
          await tx.insert(bannedEmailsTable)
            .values({ email: userEmailToBan.toLowerCase(), reason: "deleted", bannedBy: adminId })
            .onConflictDoUpdate({
              target: bannedEmailsTable.email,
              set: { reason: "deleted", bannedAt: sql`now()`, bannedBy: adminId },
            });
        }
      });

      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          await supabase.auth.admin.deleteUser(clerkUserId);
          req.log.info({ clerkUserId }, "Supabase auth user deleted");
        } catch (err) {
          req.log.warn({ err, clerkUserId }, "Failed to delete Supabase auth user (DB already cleaned)");
        }
      }

      req.log.info({ clerkUserId, username: targetUser.username }, "User hard-deleted successfully");
      await logAdminAction(adminId, "user_delete", "user", clerkUserId, { username: targetUser.username });
      res.status(204).send();
    } catch (err) {
      req.log.error({ err, clerkUserId }, "Error deleting user (admin) — transaction rolled back");
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
    const searchCondition = search
      ? and(
          eq(treesTable.photoStatus, "pending"),
          or(
            ilike(usersTable.username, `%${search}%`),
            ilike(treesTable.plantName, `%${search}%`),
            ilike(treesTable.species, `%${search}%`),
            ilike(treesTable.locationName, `%${search}%`),
            ilike(treesTable.country, `%${search}%`),
          ),
        )
      : eq(treesTable.photoStatus, "pending");

    const [trees, [{ total }]] = await Promise.all([
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
          verificationBypassed: treesTable.verificationBypassed,
          createdAt: treesTable.createdAt,
          username: usersTable.username,
          userPhotoUrl: usersTable.photoUrl,
        })
        .from(treesTable)
        .leftJoin(usersTable, eq(treesTable.userId, usersTable.clerkUserId))
        .where(searchCondition)
        .orderBy(desc(treesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(treesTable)
        .leftJoin(usersTable, eq(treesTable.userId, usersTable.clerkUserId))
        .where(searchCondition),
    ]);

    res.json({
      trees: trees.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
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
    const [[treesCount], [updatesCount], [eventsCount], [adoptTreesCount]] = await Promise.all([
      db.select({ total: count() }).from(treesTable).where(eq(treesTable.photoStatus, "pending")),
      db.select({ total: count() }).from(treeUpdatesTable).where(eq(treeUpdatesTable.photoStatus, "pending")),
      db.select({ total: count() }).from(eventsTable).where(eq(eventsTable.moderationStatus, "pending")),
      db.select({ total: count() }).from(adoptableTreesTable).where(eq(adoptableTreesTable.moderationStatus, "pending")),
    ]);
    res.json({
      pendingTrees: Number(treesCount?.total ?? 0),
      pendingUpdates: Number(updatesCount?.total ?? 0),
      pendingEvents: Number(eventsCount?.total ?? 0),
      pendingAdoptTrees: Number(adoptTreesCount?.total ?? 0),
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
  const treeId = parseInt(req.params.treeId as string, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [updated] = await db
      .update(treesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treesTable.id, treeId))
      .returning({ id: treesTable.id, photoStatus: treesTable.photoStatus });
    if (!updated) { res.status(404).json({ error: "Tree not found" }); return; }
    await logAdminAction((req as any).userId, "tree_approve", "tree", treeId);
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error approving tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/trees/:treeId/reject — reject a pending tree
router.patch("/admin/trees/:treeId/reject", requireAuth, requireAdmin, async (req, res) => {
  const treeId = parseInt(req.params.treeId as string, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [updated] = await db
      .update(treesTable)
      .set({ photoStatus: "rejected" })
      .where(eq(treesTable.id, treeId))
      .returning({ id: treesTable.id, photoStatus: treesTable.photoStatus });
    if (!updated) { res.status(404).json({ error: "Tree not found" }); return; }
    await logAdminAction((req as any).userId, "tree_reject", "tree", treeId);
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error rejecting tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/trees/:treeId — delete a tree
router.delete("/admin/trees/:treeId", requireAuth, requireAdmin, async (req, res) => {
  const treeId = parseInt(req.params.treeId as string, 10);
  if (isNaN(treeId)) { res.status(400).json({ error: "Invalid treeId" }); return; }
  try {
    const [tree] = await db.select({ userId: treesTable.userId }).from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) { res.status(404).json({ error: "Tree not found" }); return; }
    await db.transaction(async (tx) => {
      await tx.delete(treeStatusReportsTable).where(eq(treeStatusReportsTable.treeId, treeId));
      await tx.delete(treeUpdatesTable).where(eq(treeUpdatesTable.treeId, treeId));
      await tx.delete(treeSunsTable).where(eq(treeSunsTable.treeId, treeId));
      await tx.delete(treesTable).where(eq(treesTable.id, treeId));
      await tx.update(usersTable)
        .set({ treesPlanted: sql`GREATEST(${usersTable.treesPlanted} - 1, 0)` })
        .where(eq(usersTable.clerkUserId, tree.userId));
    });
    await logAdminAction((req as any).userId, "tree_delete", "tree", treeId);
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
  const updateId = parseInt(req.params.updateId as string, 10);
  if (isNaN(updateId)) { res.status(400).json({ error: "Invalid updateId" }); return; }
  try {
    const [updated] = await db
      .update(treeUpdatesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treeUpdatesTable.id, updateId))
      .returning({ id: treeUpdatesTable.id, photoStatus: treeUpdatesTable.photoStatus, userId: treeUpdatesTable.userId, treeId: treeUpdatesTable.treeId });
    if (!updated) { res.status(404).json({ error: "Update not found" }); return; }

    // Notifica il proprietario della pianta
    const [treeRow] = await db.select({ plantName: treesTable.plantName }).from(treesTable).where(eq(treesTable.id, updated.treeId));
    const label = treeRow?.plantName ? `"${treeRow.plantName}"` : `#${updated.treeId}`;
    await db.insert(userNotificationsTable).values({
      userId: updated.userId,
      title: "Foto approvata ✓",
      message: `La tua foto di aggiornamento per la pianta ${label} è stata approvata e pubblicata.`,
      type: "tree_update_approved",
      relatedId: updated.id,
      isRead: false,
    });

    await logAdminAction((req as any).userId, "tree_update_approve", "tree_update", updateId);
    res.json({ id: updated.id, photoStatus: updated.photoStatus });
  } catch (err) {
    req.log.error({ err }, "Error approving tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /admin/tree-updates/:updateId/reject — reject (delete) a pending tree update
router.patch("/admin/tree-updates/:updateId/reject", requireAuth, requireAdmin, async (req, res) => {
  const updateId = parseInt(req.params.updateId as string, 10);
  if (isNaN(updateId)) { res.status(400).json({ error: "Invalid updateId" }); return; }
  try {
    // Recupera prima i dati prima di eliminare
    const [existing] = await db.select({ userId: treeUpdatesTable.userId, treeId: treeUpdatesTable.treeId })
      .from(treeUpdatesTable).where(eq(treeUpdatesTable.id, updateId));
    if (!existing) { res.status(404).json({ error: "Update not found" }); return; }

    await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.id, updateId));

    // Notifica il proprietario della pianta
    const [treeRow] = await db.select({ plantName: treesTable.plantName }).from(treesTable).where(eq(treesTable.id, existing.treeId));
    const label = treeRow?.plantName ? `"${treeRow.plantName}"` : `#${existing.treeId}`;
    await db.insert(userNotificationsTable).values({
      userId: existing.userId,
      title: "Foto rifiutata",
      message: `La tua foto di aggiornamento per la pianta ${label} non è stata approvata dall'amministratore.`,
      type: "tree_update_rejected",
      relatedId: updateId,
      isRead: false,
    });

    await logAdminAction((req as any).userId, "tree_update_reject", "tree_update", updateId);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error rejecting tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/reports/:id/delete-tree — delete tree from report and mark reviewed
router.delete("/admin/reports/:id/delete-tree", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
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

    await logAdminAction((req as any).userId, "report_delete_tree", "report", id, { treeId: report.treeId });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error deleting tree from report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /admin/reports/:id/delete-tree-update — remove a tree update photo from report and mark reviewed
router.delete("/admin/reports/:id/delete-tree-update", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }

    if (report.treeUpdateId != null) {
      const [update] = await db
        .select({ photoUrl: treeUpdatesTable.photoUrl })
        .from(treeUpdatesTable)
        .where(eq(treeUpdatesTable.id, report.treeUpdateId));
      if (update) {
        if (update.photoUrl) await deletePhotoFromStorage(update.photoUrl);
        await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.id, report.treeUpdateId));
        // Mark all pending reports for this update as reviewed
        await db
          .update(reportsTable)
          .set({ status: "reviewed" })
          .where(and(eq(reportsTable.treeUpdateId, report.treeUpdateId), eq(reportsTable.status, "pending")));
      }
    }

    const [updated] = await db
      .update(reportsTable)
      .set({ status: "reviewed" })
      .where(eq(reportsTable.id, id))
      .returning();

    await logAdminAction((req as any).userId, "report_delete_tree_update", "report", id, { treeUpdateId: report.treeUpdateId });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error deleting tree update from report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
