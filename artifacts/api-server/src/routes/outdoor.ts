import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { trailReportsTable, trailReportConfirmationsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

const REPORT_TYPES = ["fallen_tree", "landslide", "path_interrupted", "bridge_damaged", "garbage"] as const;

const CreateReportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  description: z.string().max(500).optional(),
  photoUrl: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().max(200).optional(),
});

const ConfirmSchema = z.object({
  type: z.enum(["still_present", "not_present"]),
});

// GET /api/outdoor/reports — public
router.get("/outdoor/reports", async (req, res) => {
  try {
    const reports = await db
      .select({
        id: trailReportsTable.id,
        userId: trailReportsTable.userId,
        type: trailReportsTable.type,
        description: trailReportsTable.description,
        photoUrl: trailReportsTable.photoUrl,
        latitude: trailReportsTable.latitude,
        longitude: trailReportsTable.longitude,
        locationName: trailReportsTable.locationName,
        createdAt: trailReportsTable.createdAt,
        stillPresentCount: sql<number>`(
          SELECT COUNT(*)::int FROM trail_report_confirmations
          WHERE report_id = ${trailReportsTable.id} AND type = 'still_present'
        )`,
        notPresentCount: sql<number>`(
          SELECT COUNT(*)::int FROM trail_report_confirmations
          WHERE report_id = ${trailReportsTable.id} AND type = 'not_present'
        )`,
      })
      .from(trailReportsTable)
      .where(eq(trailReportsTable.status, "active"))
      .orderBy(desc(trailReportsTable.createdAt));

    res.json(reports);
  } catch (err) {
    req.log.error({ err }, "Error fetching trail reports");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /api/outdoor/reports/:id — public (single report with user confirmation)
router.get("/outdoor/reports/:id", async (req, res) => {
  const reportId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(reportId)) { res.status(400).json({ error: "ID non valido" }); return; }

  const userId = (req.headers.authorization ?? "").replace("Bearer ", "").trim();

  try {
    const [report] = await db
      .select({
        id: trailReportsTable.id,
        userId: trailReportsTable.userId,
        type: trailReportsTable.type,
        description: trailReportsTable.description,
        photoUrl: trailReportsTable.photoUrl,
        latitude: trailReportsTable.latitude,
        longitude: trailReportsTable.longitude,
        locationName: trailReportsTable.locationName,
        status: trailReportsTable.status,
        createdAt: trailReportsTable.createdAt,
        stillPresentCount: sql<number>`(
          SELECT COUNT(*)::int FROM trail_report_confirmations
          WHERE report_id = ${trailReportsTable.id} AND type = 'still_present'
        )`,
        notPresentCount: sql<number>`(
          SELECT COUNT(*)::int FROM trail_report_confirmations
          WHERE report_id = ${trailReportsTable.id} AND type = 'not_present'
        )`,
      })
      .from(trailReportsTable)
      .where(eq(trailReportsTable.id, reportId))
      .limit(1);

    if (!report) { res.status(404).json({ error: "Segnalazione non trovata" }); return; }
    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Error fetching trail report");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/outdoor/reports — auth required
router.post("/outdoor/reports", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;

  const parsed = CreateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  try {
    const [report] = await db
      .insert(trailReportsTable)
      .values({
        userId,
        type: parsed.data.type,
        description: parsed.data.description ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        locationName: parsed.data.locationName ?? null,
      })
      .returning();

    res.status(201).json(report);
  } catch (err) {
    req.log.error({ err }, "Error creating trail report");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// POST /api/outdoor/reports/:id/confirm — auth required
router.post("/outdoor/reports/:id/confirm", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const reportId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(reportId)) { res.status(400).json({ error: "ID non valido" }); return; }

  const parsed = ConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Tipo di conferma non valido" });
    return;
  }

  try {
    const [report] = await db
      .select({ id: trailReportsTable.id, status: trailReportsTable.status })
      .from(trailReportsTable)
      .where(and(eq(trailReportsTable.id, reportId), eq(trailReportsTable.status, "active")))
      .limit(1);

    if (!report) {
      res.status(404).json({ error: "Segnalazione non trovata o già archiviata" });
      return;
    }

    await db
      .insert(trailReportConfirmationsTable)
      .values({ reportId, userId, type: parsed.data.type })
      .onConflictDoUpdate({
        target: [trailReportConfirmationsTable.userId, trailReportConfirmationsTable.reportId],
        set: { type: parsed.data.type, createdAt: new Date() },
      });

    if (parsed.data.type === "not_present") {
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(trailReportConfirmationsTable)
        .where(and(
          eq(trailReportConfirmationsTable.reportId, reportId),
          eq(trailReportConfirmationsTable.type, "not_present"),
        ));

      if ((countResult?.count ?? 0) >= 3) {
        await db
          .update(trailReportsTable)
          .set({ status: "archived", archivedAt: new Date(), archivedReason: "resolved" })
          .where(eq(trailReportsTable.id, reportId));
      }
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error confirming trail report");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// DELETE /api/outdoor/reports/:id — owner only
router.delete("/outdoor/reports/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const reportId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(reportId)) { res.status(400).json({ error: "ID non valido" }); return; }

  try {
    const [report] = await db
      .select({ id: trailReportsTable.id, userId: trailReportsTable.userId })
      .from(trailReportsTable)
      .where(eq(trailReportsTable.id, reportId))
      .limit(1);

    if (!report) { res.status(404).json({ error: "Segnalazione non trovata" }); return; }
    if (report.userId !== userId) { res.status(403).json({ error: "Non autorizzato" }); return; }

    await db.delete(trailReportConfirmationsTable).where(eq(trailReportConfirmationsTable.reportId, reportId));
    await db.delete(trailReportsTable).where(eq(trailReportsTable.id, reportId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting trail report");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
