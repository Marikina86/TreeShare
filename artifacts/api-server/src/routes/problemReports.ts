import { Router } from "express";
import { db } from "@workspace/db";
import { problemReportsTable, usersTable, userNotificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { z } from "zod";

const router = Router();

const VALID_CATEGORIES = [
  "bug",
  "contenuto_inappropriato",
  "problema_tecnico",
  "suggerimento",
  "altro",
];

const CreateProblemReportBody = z.object({
  category: z.string().refine((v) => VALID_CATEGORIES.includes(v), { message: "Categoria non valida" }),
  description: z.string().trim().min(10, { message: "Descrizione troppo breve (minimo 10 caratteri)" }).max(1000, { message: "Descrizione troppo lunga (massimo 1000 caratteri)" }),
});

const PatchProblemReportStatusBody = z.object({
  status: z.enum(["new", "in_progress", "resolved", "dismissed"]),
  adminNote: z.string().max(500).optional(),
});

const PatchProblemReportReplyBody = z.object({
  replyText: z.string().trim().min(5, { message: "Testo risposta troppo breve" }).max(2000, { message: "Testo risposta troppo lungo (massimo 2000 caratteri)" }),
});

// POST /problem-reports — utente invia segnalazione problema
router.post("/problem-reports", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateProblemReportBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dati non validi";
    res.status(400).json({ error: msg });
    return;
  }
  const { category, description } = parsed.data;

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

  const parsed = PatchProblemReportStatusBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Stato non valido" });
    return;
  }
  const { status, adminNote } = parsed.data;

  try {
    const [updated] = await db
      .update(problemReportsTable)
      .set({
        status,
        adminNote: adminNote?.trim() ?? null,
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

  const parsed = PatchProblemReportReplyBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Testo risposta non valido";
    res.status(400).json({ error: msg });
    return;
  }
  const { replyText } = parsed.data;

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
