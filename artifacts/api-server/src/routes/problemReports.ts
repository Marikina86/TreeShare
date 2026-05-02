import { Router } from "express";
import { db } from "@workspace/db";
import { problemReportsTable, usersTable, userNotificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const VALID_CATEGORIES = [
  "bug",
  "contenuto_inappropriato",
  "problema_tecnico",
  "suggerimento",
  "altro",
];

// POST /problem-reports — utente invia segnalazione problema
router.post("/problem-reports", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { category, description } = req.body ?? {};

  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Categoria non valida" });
    return;
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({ error: "Descrizione troppo breve (minimo 10 caratteri)" });
    return;
  }
  if (description.trim().length > 1000) {
    res.status(400).json({ error: "Descrizione troppo lunga (massimo 1000 caratteri)" });
    return;
  }

  try {
    const [user] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    const [report] = await db
      .insert(problemReportsTable)
      .values({
        userId,
        username: user?.username ?? null,
        category,
        description: description.trim(),
        status: "new",
      })
      .returning();

    res.status(201).json({ id: report.id });
  } catch (err) {
    req.log.error({ err }, "Error creating problem report");
    res.status(500).json({ error: "Errore interno" });
  }
});

// GET /admin/problem-reports — lista segnalazioni (admin)
router.get("/admin/problem-reports", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(problemReportsTable)
      .orderBy(desc(problemReportsTable.createdAt));

    res.json(rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing problem reports");
    res.status(500).json({ error: "Errore interno" });
  }
});

// PATCH /admin/problem-reports/:id/status — aggiorna stato (admin)
router.patch("/admin/problem-reports/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }

  const { status, adminNote } = req.body ?? {};
  const VALID_STATUSES = ["new", "in_progress", "resolved", "dismissed"];
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Stato non valido" });
    return;
  }

  try {
    const [updated] = await db
      .update(problemReportsTable)
      .set({
        status,
        adminNote: typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : null,
      })
      .where(eq(problemReportsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Segnalazione non trovata" }); return; }
    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      repliedAt: updated.repliedAt ? updated.repliedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error updating problem report");
    res.status(500).json({ error: "Errore interno" });
  }
});

// PATCH /admin/problem-reports/:id/reply — salva risposta admin e crea notifica personale all'utente
router.patch("/admin/problem-reports/:id/reply", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }

  const { replyText } = req.body ?? {};
  if (!replyText || typeof replyText !== "string" || replyText.trim().length < 5) {
    res.status(400).json({ error: "Testo risposta troppo breve" });
    return;
  }
  if (replyText.trim().length > 2000) {
    res.status(400).json({ error: "Testo risposta troppo lungo (massimo 2000 caratteri)" });
    return;
  }

  try {
    const [report] = await db
      .select()
      .from(problemReportsTable)
      .where(eq(problemReportsTable.id, id));

    if (!report) { res.status(404).json({ error: "Segnalazione non trovata" }); return; }

    const [updated] = await db
      .update(problemReportsTable)
      .set({
        replyText: replyText.trim(),
        repliedAt: new Date(),
        status: report.status === "new" ? "in_progress" : report.status,
      })
      .where(eq(problemReportsTable.id, id))
      .returning();

    // Crea notifica personale nella sezione Avvisi dell'utente
    await db.insert(userNotificationsTable).values({
      userId: report.userId,
      title: "Risposta alla tua segnalazione",
      message: replyText.trim(),
      type: "admin_reply",
      relatedId: id,
      isRead: false,
    });

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      repliedAt: updated.repliedAt ? updated.repliedAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error saving admin reply");
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
