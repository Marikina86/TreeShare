import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable, userNotificationsTable, tipsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

/**
 * GET /inbox — alerts + personal notifications + tips in ONE request.
 * Replaces three separate polling endpoints (/alerts, /notifications, /tips).
 */
router.get("/inbox", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [alerts, notifications, tips] = await Promise.all([
      db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt)),
      db
        .select()
        .from(userNotificationsTable)
        .where(eq(userNotificationsTable.userId, userId))
        .orderBy(desc(userNotificationsTable.createdAt)),
      db.select().from(tipsTable).orderBy(desc(tipsTable.createdAt)),
    ]);

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
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching inbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
