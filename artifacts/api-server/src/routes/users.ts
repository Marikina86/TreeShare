import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, treesTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { UpsertMyProfileBody } from "@workspace/api-zod";
import { createClerkClient } from "@clerk/backend";
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
    await db.delete(treesTable).where(eq(treesTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.clerkUserId, userId));

    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (clerkSecretKey) {
      const clerk = createClerkClient({ secretKey: clerkSecretKey });
      await clerk.users.deleteUser(userId);
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user account");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
