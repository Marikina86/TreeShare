import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, treesTable, treeSunsTable, treeUpdatesTable, eventsTable, eventParticipantsTable, problemReportsTable, userConsentsTable, cookieConsentsTable, userNotificationsTable, donationCampaignsTable, donationsTable, orgBalancesTable, ledgerEntriesTable, payoutsTable, weeklyWinnersTable, reportsTable, organizationsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { UpsertMyProfileBody } from "@workspace/api-zod";
import { isAdmin } from "../middlewares/requireAdmin";

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
  try {
    const userTreeIds = await db.select({ id: treesTable.id }).from(treesTable).where(eq(treesTable.userId, userId));
    const treeIds = userTreeIds.map(t => t.id);

    if (treeIds.length > 0) {
      for (const treeId of treeIds) {
        await db.delete(treeSunsTable).where(eq(treeSunsTable.treeId, treeId));
        await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.treeId, treeId));
      }
    }

    await db.delete(treeSunsTable).where(eq(treeSunsTable.userId, userId));
    await db.delete(treeUpdatesTable).where(eq(treeUpdatesTable.userId, userId));
    await db.delete(treesTable).where(eq(treesTable.userId, userId));

    const userEvents = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.userId, userId));
    for (const ev of userEvents) {
      await db.delete(eventParticipantsTable).where(eq(eventParticipantsTable.eventId, ev.id));
    }
    await db.delete(eventParticipantsTable).where(eq(eventParticipantsTable.userId, userId));
    await db.delete(eventsTable).where(eq(eventsTable.userId, userId));

    await db.delete(donationsTable).where(eq(donationsTable.donorUserId, userId));
    await db.delete(donationCampaignsTable).where(eq(donationCampaignsTable.userId, userId));

    await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.orgUserId, userId));
    await db.delete(payoutsTable).where(eq(payoutsTable.userId, userId));
    await db.delete(orgBalancesTable).where(eq(orgBalancesTable.userId, userId));

    await db.delete(weeklyWinnersTable).where(eq(weeklyWinnersTable.userId, userId));
    await db.delete(problemReportsTable).where(eq(problemReportsTable.userId, userId));
    await db.delete(userNotificationsTable).where(eq(userNotificationsTable.userId, userId));
    await db.delete(userConsentsTable).where(eq(userConsentsTable.userId, userId));
    await db.delete(cookieConsentsTable).where(eq(cookieConsentsTable.userId, userId));
    await db.delete(reportsTable).where(eq(reportsTable.reporterUserId, userId));

    const [user] = await db.select({ accountType: usersTable.accountType }).from(usersTable).where(eq(usersTable.clerkUserId, userId));
    if (user?.accountType === "organization") {
      const orgs = await db.select({ id: organizationsTable.id }).from(organizationsTable)
        .where(eq(organizationsTable.emailUfficiale, userId));
      for (const org of orgs) {
        await db.delete(userConsentsTable).where(eq(userConsentsTable.userId, `org:${org.id}`));
        await db.delete(organizationsTable).where(eq(organizationsTable.id, org.id));
      }
    }

    await db.delete(usersTable).where(eq(usersTable.clerkUserId, userId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user account");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
