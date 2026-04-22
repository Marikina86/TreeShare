import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, userNotificationsTable, tipsTable, eventsTable, usersTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

/**
 * GET /inbox — alerts + personal notifications + tips + events in ONE request.
 * Fetched only on app startup or explicit pull-to-refresh (no polling).
 */
router.get("/inbox", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [userRow] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));
    const userAccountType = userRow?.accountType ?? "user";

    const [alerts, notifications, tips, events] = await Promise.all([
      db
        .select()
        .from(alertsTable)
        .where(
          or(
            eq(alertsTable.targetGroup, "all"),
            eq(alertsTable.targetGroup, userAccountType),
          )
        )
        .orderBy(desc(alertsTable.createdAt)),
      db
        .select()
        .from(userNotificationsTable)
        .where(eq(userNotificationsTable.userId, userId))
        .orderBy(desc(userNotificationsTable.createdAt)),
      db.select().from(tipsTable).orderBy(desc(tipsTable.createdAt)),
      db
        .select({ id: eventsTable.id, createdAt: eventsTable.createdAt })
        .from(eventsTable)
        .where(eq(eventsTable.moderationStatus, "approved"))
        .orderBy(desc(eventsTable.createdAt)),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      alerts: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      notifications: notifications.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      tips: tips.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      events: events.map((e) => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching inbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
