import { Router } from "express";
import { db } from "@workspace/db";
import { userNotificationsTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// GET /notifications — notifiche personali dell'utente autenticato
router.get("/notifications", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const rows = await db
      .select()
      .from(userNotificationsTable)
      .where(eq(userNotificationsTable.userId, userId))
      .orderBy(desc(userNotificationsTable.createdAt));

    res.json(rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Error fetching notifications");
    res.status(500).json({ error: "Errore interno" });
  }
});

// PATCH /notifications/read-all — segna tutte come lette
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    await db
      .update(userNotificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(userNotificationsTable.userId, userId),
        eq(userNotificationsTable.isRead, false),
      ));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error marking notifications read");
    res.status(500).json({ error: "Errore interno" });
  }
});

// PATCH /notifications/:id/read — segna una come letta
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const [updated] = await db
      .update(userNotificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(userNotificationsTable.id, id),
        eq(userNotificationsTable.userId, userId),
      ))
      .returning();
    if (!updated) { res.status(404).json({ error: "Notifica non trovata" }); return; }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error marking notification read");
    res.status(500).json({ error: "Errore interno" });
  }
});

// POST /admin/notifications/user — invia notifica personale a un utente specifico
router.post("/admin/notifications/user", requireAuth, requireAdmin, async (req, res) => {
  const { userId, title, message } = req.body ?? {};

  if (typeof userId !== "string" || !userId.trim()) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title required" });
    return;
  }
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message required" });
    return;
  }

  try {
    const [targetUser] = await db
      .select({ clerkUserId: usersTable.clerkUserId, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!targetUser) {
      res.status(404).json({ error: "Utente non trovato" });
      return;
    }

    const [notif] = await db
      .insert(userNotificationsTable)
      .values({
        userId: targetUser.clerkUserId,
        title: title.trim().slice(0, 200),
        message: message.trim().slice(0, 2000),
        isRead: false,
      })
      .returning();

    res.status(201).json({ ...notif, createdAt: notif.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error sending personal notification");
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
