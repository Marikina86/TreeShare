import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, treesTable, treeSunsTable, treeUpdatesTable, treeStatusReportsTable, eventsTable, eventParticipantsTable, problemReportsTable, userConsentsTable, cookieConsentsTable, userNotificationsTable, donationCampaignsTable, weeklyWinnersTable, reportsTable, organizationsTable, alertsTable } from "@workspace/db";
import { eq, desc, count, sql, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { UpsertMyProfileBody } from "@workspace/api-zod";
import { isAdmin } from "../middlewares/requireAdmin";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function isCloudinaryConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function deletePhotoFromStorage(photoUrl: string): Promise<void> {
  try {
    if (photoUrl.includes("cloudinary.com") && isCloudinaryConfigured()) {
      const parts = photoUrl.split("/");
      const uploadIdx = parts.indexOf("upload");
      if (uploadIdx !== -1) {
        const pathParts = parts.slice(uploadIdx + 2);
        const publicIdWithExt = pathParts.join("/");
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
        await cloudinary.uploader.destroy(publicId);
      }
    } else if (photoUrl.startsWith("/objects/uploads/")) {
      const filename = photoUrl.replace("/objects/uploads/", "");
      const filePath = join(process.cwd(), "uploads", filename);
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  } catch {}
}

async function collectAndDeleteUserPhotos(userId: string): Promise<void> {
  const photoUrls: string[] = [];
  const [userRow] = await db.select({ photoUrl: usersTable.photoUrl }).from(usersTable).where(eq(usersTable.clerkUserId, userId));
  if (userRow?.photoUrl) photoUrls.push(userRow.photoUrl);
  const trees = await db.select({ photoUrl: treesTable.photoUrl, thumb: treesTable.photoThumbnailUrl }).from(treesTable).where(eq(treesTable.userId, userId));
  for (const t of trees) {
    if (t.photoUrl) photoUrls.push(t.photoUrl);
    if (t.thumb) photoUrls.push(t.thumb);
  }
  const updates = await db.select({ photoUrl: treeUpdatesTable.photoUrl }).from(treeUpdatesTable).where(eq(treeUpdatesTable.userId, userId));
  for (const u of updates) { if (u.photoUrl) photoUrls.push(u.photoUrl); }
  const campaigns = await db.select({ photos: donationCampaignsTable.photos }).from(donationCampaignsTable).where(eq(donationCampaignsTable.userId, userId));
  for (const c of campaigns) {
    const arr = Array.isArray(c.photos) ? c.photos : [];
    for (const p of arr) { if (typeof p === "string" && p) photoUrls.push(p); }
  }
  await Promise.allSettled(photoUrls.map((url) => deletePhotoFromStorage(url)));
}

const router = Router();

router.get("/users/me", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));
    if (!user) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
      username: user.username,
      photoUrl: user.photoUrl ?? null,
      country: user.country ?? null,
      city: user.city ?? null,
      accountType: user.accountType ?? "user",
      stripeAccountId: user.stripeAccountId ?? null,
      treesPlanted: user.treesPlanted,
      isBlocked: user.isBlocked,
      isAdmin: isAdmin(user.clerkUserId),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = UpsertMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, photoUrl, country, city } = parsed.data;
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    let user;
    if (existing.length === 0) {
      const [created] = await db
        .insert(usersTable)
        .values({
          clerkUserId: userId,
          username,
          photoUrl: photoUrl ?? null,
          country: country ?? null,
          city: city ?? null,
        })
        .returning();
      user = created;
    } else {
      const [updated] = await db
        .update(usersTable)
        .set({
          username,
          photoUrl: photoUrl ?? null,
          country: country ?? null,
          city: city ?? null,
        })
        .where(eq(usersTable.clerkUserId, userId))
        .returning();
      user = updated;
    }

    res.json({
      id: user!.id,
      clerkUserId: user!.clerkUserId,
      username: user!.username,
      photoUrl: user!.photoUrl ?? null,
      country: user!.country ?? null,
      city: user!.city ?? null,
      treesPlanted: user!.treesPlanted,
      isBlocked: user!.isBlocked,
      isAdmin: isAdmin(user!.clerkUserId),
      createdAt: user!.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error upserting user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/top-planters", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const planters = await db
      .select({
        userId: usersTable.clerkUserId,
        username: usersTable.username,
        photoUrl: usersTable.photoUrl,
        city: usersTable.city,
        country: usersTable.country,
        treeCount: count(treesTable.id),
      })
      .from(usersTable)
      .leftJoin(treesTable, sql`${treesTable.userId} = ${usersTable.clerkUserId} AND ${treesTable.photoStatus} = 'approved'`)
      .groupBy(usersTable.clerkUserId, usersTable.username, usersTable.photoUrl, usersTable.city, usersTable.country)
      .orderBy(desc(count(treesTable.id)))
      .limit(limit);
    res.json(planters.map((p) => ({
      userId: p.userId,
      username: p.username,
      photoUrl: p.photoUrl,
      city: p.city,
      country: p.country,
      treeCount: Number(p.treeCount),
    })));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      clerkUserId: user.clerkUserId,
      username: user.username,
      photoUrl: user.photoUrl ?? null,
      country: user.country ?? null,
      city: user.city ?? null,
      accountType: user.accountType ?? "user",
      treesPlanted: user.treesPlanted,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/me/delete", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  // Recupera i dati utente prima di qualunque cancellazione
  const [targetUser] = await db
    .select({ accountType: usersTable.accountType, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId));
  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Pulizia foto da Cloudinary / storage locale (non-transazionale, eseguita prima del DB)
  try {
    await collectAndDeleteUserPhotos(userId);
    req.log.info({ userId }, "Photos deleted for self-deleted user");
  } catch (err) {
    req.log.warn({ err, userId }, "Photo deletion partial failure (proceeding with DB cleanup)");
  }

  try {
    await db.transaction(async (tx) => {
      const userTreeIds = await tx.select({ id: treesTable.id }).from(treesTable).where(eq(treesTable.userId, userId));
      const treeIds = userTreeIds.map(t => t.id);

      if (treeIds.length > 0) {
        await tx.delete(treeStatusReportsTable).where(inArray(treeStatusReportsTable.treeId, treeIds));
        await tx.delete(treeSunsTable).where(inArray(treeSunsTable.treeId, treeIds));
        await tx.delete(treeUpdatesTable).where(inArray(treeUpdatesTable.treeId, treeIds));
      }

      await tx.delete(treeSunsTable).where(eq(treeSunsTable.userId, userId));
      await tx.delete(treeUpdatesTable).where(eq(treeUpdatesTable.userId, userId));
      await tx.delete(treesTable).where(eq(treesTable.userId, userId));

      const userEvents = await tx.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.userId, userId));
      const eventIds = userEvents.map(e => e.id);
      if (eventIds.length > 0) {
        await tx.delete(eventParticipantsTable).where(inArray(eventParticipantsTable.eventId, eventIds));
      }
      await tx.delete(eventParticipantsTable).where(eq(eventParticipantsTable.userId, userId));
      await tx.delete(eventsTable).where(eq(eventsTable.userId, userId));

      await tx.delete(donationCampaignsTable).where(eq(donationCampaignsTable.userId, userId));
      await tx.delete(weeklyWinnersTable).where(eq(weeklyWinnersTable.userId, userId));
      await tx.delete(problemReportsTable).where(eq(problemReportsTable.userId, userId));
      await tx.delete(userNotificationsTable).where(eq(userNotificationsTable.userId, userId));
      await tx.delete(userConsentsTable).where(eq(userConsentsTable.userId, userId));
      await tx.delete(cookieConsentsTable).where(eq(cookieConsentsTable.userId, userId));
      await tx.delete(reportsTable).where(eq(reportsTable.reporterUserId, userId));
      await tx.delete(reportsTable).where(eq(reportsTable.reportedUserId, userId));
      await tx.delete(alertsTable).where(eq(alertsTable.createdBy, userId));

      // Fix: ricerca org per username, non per emailUfficiale
      if (targetUser.accountType === "organization" && targetUser.username) {
        const orgs = await tx.select({ id: organizationsTable.id })
          .from(organizationsTable)
          .where(eq(organizationsTable.username, targetUser.username));
        for (const org of orgs) {
          await tx.delete(userConsentsTable).where(eq(userConsentsTable.userId, `org:${org.id}`));
        }
        await tx.delete(organizationsTable).where(eq(organizationsTable.username, targetUser.username));
      }

      await tx.delete(usersTable).where(eq(usersTable.clerkUserId, userId));
    });

    // Cancella l'account Supabase Auth (dopo la transazione DB riuscita)
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        req.log.info({ userId }, "Supabase auth account deleted on self-delete");
      } catch (err) {
        req.log.warn({ err, userId }, "Failed to delete Supabase auth on self-delete (DB already cleaned)");
      }
    }

    req.log.info({ userId, username: targetUser.username }, "User self-deleted successfully");
    res.status(204).send();
  } catch (err) {
    req.log.error({ err, userId }, "Error deleting user account — transaction rolled back");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
