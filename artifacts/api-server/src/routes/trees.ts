import { Router } from "express";
import { db } from "@workspace/db";
import { treesTable, treeUpdatesTable, usersTable, treeSunsTable, userNotificationsTable, treeStatusReportsTable } from "@workspace/db";
import { eq, desc, count, sql, and, ne, inArray } from "drizzle-orm";
import { getCurrentWinnerIds } from "../lib/weeklyWinnerJob";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { getAdminIds } from "../middlewares/requireAdmin";
import { enqueueVerification } from "../lib/photoVerificationQueue";
import { parseBase64Image } from "../lib/geminiUtils";
import {
  CreateTreeBody,
  ListTreesQueryParams,
  GetTreeParams,
  DeleteTreeParams,
  GetTreeUpdatesParams,
  AddTreeUpdateParams,
  AddTreeUpdateBody,
  DeleteTreeUpdateParams,
  GetRecentTreesQueryParams,
} from "@workspace/api-zod";
import { z } from "zod";
import { getUnlockedPhotoSlots, getCurrentQuarterString } from "@workspace/treeshare-utils";

const PatchTreeBody = z.object({
  plantName: z.string().max(100).nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  species: z.string().max(100).nullable().optional(),
  plantedAt: z.string().nullable().optional(),
  locationName: z.string().max(200).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const router = Router();

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=17`;
}

const StatusReportParams = z.object({ treeId: z.coerce.number().int().positive() });
const StatusReportBody = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  status: z.enum(["alive", "dead"]),
  photoUrl: z.string().nullable().optional(),
  imageBase64: z.string().optional(),
});

// ── Formattazione sincrona: nessuna query aggiuntiva ──────────────────────────
// username e userPhotoUrl vengono passati già risolti dal chiamante.
function formatTree(
  tree: typeof treesTable.$inferSelect,
  username: string,
  userPhotoUrl: string | null,
  updateCount: number,
  sunCount = 0,
  userHasSunned = false,
  isWeeklyWinner = false,
  isDead = false,
) {
  return {
    id: tree.id,
    userId: tree.userId,
    username,
    userPhotoUrl,
    photoUrl: tree.photoUrl,
    photoThumbnailUrl: tree.photoThumbnailUrl ?? null,
    plantName: tree.plantName ?? null,
    caption: tree.caption ?? null,
    species: tree.species ?? null,
    plantedAt: tree.plantedAt ? tree.plantedAt.toISOString() : null,
    latitude: tree.latitude,
    longitude: tree.longitude,
    locationName: tree.locationName ?? null,
    country: tree.country ?? null,
    province: tree.province ?? null,
    mapsUrl: tree.mapsUrl ?? buildMapsUrl(tree.latitude, tree.longitude),
    verificationBypassed: tree.verificationBypassed,
    photoStatus: (tree.photoStatus as "approved" | "pending" | "rejected") ?? "approved",
    updateCount,
    sunCount,
    userHasSunned,
    isWeeklyWinner,
    isDead,
    createdAt: tree.createdAt.toISOString(),
  };
}

// ── Helper: risolve username/photoUrl in un'unica query batch ─────────────────
// Restituisce una Map clerkUserId → { username, photoUrl }
async function batchLoadUsers(userIds: string[]): Promise<Map<string, { username: string; photoUrl: string | null }>> {
  if (userIds.length === 0) return new Map();
  const unique = [...new Set(userIds)];
  const rows = await db
    .select({ clerkUserId: usersTable.clerkUserId, username: usersTable.username, photoUrl: usersTable.photoUrl })
    .from(usersTable)
    .where(inArray(usersTable.clerkUserId, unique));
  return new Map(rows.map((r) => [r.clerkUserId, { username: r.username, photoUrl: r.photoUrl }]));
}

// ── GET /trees/feed-meta — versione leggera per smart-refresh ─────────────────
// Restituisce solo total + lastUpdatedAt (timestamp più recente tra creazione e
// aggiornamento degli alberi approvati). Il client confronta lastUpdatedAt con
// il valore in cache: se è uguale, evita la chiamata completa al feed.
// Costo: 2 query aggregate COUNT + MAX su indici, nessun join, nessun dato pesante.
router.get("/trees/feed-meta", async (req, res) => {
  try {
    // 2 query parallele invece di 3 sequenziali:
    // – trees: count + MAX(createdAt) in un'unica aggregate query
    // – updates: MAX(createdAt) solo su aggiornamenti approvati (evita refresh spurio per pending)
    const [[treeAgg], [{ latestUpdate }]] = await Promise.all([
      db.select({
        cnt: count(),
        latest: sql<string>`COALESCE(MAX(${treesTable.createdAt}), '1970-01-01')`,
      })
        .from(treesTable)
        .where(eq(treesTable.photoStatus, "approved")),
      db.select({ latestUpdate: sql<string>`COALESCE(MAX(${treeUpdatesTable.createdAt}), '1970-01-01')` })
        .from(treeUpdatesTable)
        .where(eq(treeUpdatesTable.photoStatus, "approved")),
    ]);

    const latestTree = new Date(treeAgg.latest).getTime();
    const latestUpd = new Date(latestUpdate).getTime();
    const lastUpdatedAt = new Date(Math.max(latestTree, latestUpd)).toISOString();

    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.json({ total: Number(treeAgg.cnt), lastUpdatedAt });
  } catch (err) {
    req.log.error({ err }, "Error fetching feed meta");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /trees — feed paginato ────────────────────────────────────────────────
// Query: 1 per alberi + 1 per conteggio + 1 per winner IDs + 1 batch utenti
//        + 1 GROUP BY update scoped ai soli ID della pagina
// sunCount: letto direttamente da trees.sun_count (colonna pre-calcolata)
router.get("/trees", async (req, res) => {
  const parsed = ListTreesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { page = 1, limit = 20, userId } = parsed.data;
  const offset = (page - 1) * limit;
  try {
    const query = db.select().from(treesTable);
    const countQuery = db.select({ count: count() }).from(treesTable);
    if (userId) {
      const condition = and(eq(treesTable.userId, userId), ne(treesTable.photoStatus, "rejected"));
      query.where(condition);
      countQuery.where(condition);
    } else {
      query.where(eq(treesTable.photoStatus, "approved"));
      countQuery.where(eq(treesTable.photoStatus, "approved"));
    }

    const [trees, [{ count: total }], winnerIds] = await Promise.all([
      query.orderBy(desc(treesTable.createdAt)).limit(limit).offset(offset),
      countQuery,
      getCurrentWinnerIds(),
    ]);

    if (trees.length === 0) {
      res.json({ trees: [], total: Number(total), page, limit });
      return;
    }

    // Una sola query utenti per tutti gli alberi della pagina (no N+1)
    const treeIds = trees.map((t) => t.id);
    const currentQuarter = getCurrentQuarterString();
    const [userMap, updates, deadReports] = await Promise.all([
      batchLoadUsers(trees.map((t) => t.userId)),
      // GROUP BY scoped ai soli ID della pagina (non a tutta la tabella) — solo aggiornamenti approvati
      db.select({ treeId: treeUpdatesTable.treeId, cnt: count() })
        .from(treeUpdatesTable)
        .where(and(inArray(treeUpdatesTable.treeId, treeIds), eq(treeUpdatesTable.photoStatus, "approved")))
        .groupBy(treeUpdatesTable.treeId),
      // Status report del trimestre corrente per sapere quali alberi sono morti
      db.select({ treeId: treeStatusReportsTable.treeId, status: treeStatusReportsTable.status })
        .from(treeStatusReportsTable)
        .where(and(
          inArray(treeStatusReportsTable.treeId, treeIds),
          eq(treeStatusReportsTable.quarter, currentQuarter),
          eq(treeStatusReportsTable.status, "dead"),
        )),
    ]);

    const updateMap = new Map(updates.map((u) => [u.treeId, u.cnt]));
    const deadSet = new Set(deadReports.map((r) => r.treeId));

    const formatted = trees.map((t) => {
      const u = userMap.get(t.userId);
      const { mapsUrl: _m, verificationBypassed: _v, ...slim } = formatTree(
        t,
        u?.username ?? "Unknown",
        u?.photoUrl ?? null,
        updateMap.get(t.id) ?? 0,
        t.sunCount,          // colonna pre-calcolata — nessuna query aggregata
        false,
        winnerIds.has(t.id),
        deadSet.has(t.id),
      );
      return slim;
    });

    res.json({ trees: formatted, total: Number(total), page, limit });
  } catch (err) {
    req.log.error({ err }, "Error listing trees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /trees/recent — ultimi N alberi per la mappa ─────────────────────────
router.get("/trees/recent", async (req, res) => {
  const parsed = GetRecentTreesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { limit = 10 } = parsed.data;
  try {
    const trees = await db
      .select()
      .from(treesTable)
      .where(eq(treesTable.photoStatus, "approved"))
      .orderBy(desc(treesTable.createdAt))
      .limit(limit);

    if (trees.length === 0) {
      res.json([]);
      return;
    }

    const treeIds = trees.map((t) => t.id);
    const [userMap, updates] = await Promise.all([
      batchLoadUsers(trees.map((t) => t.userId)),
      db.select({ treeId: treeUpdatesTable.treeId, cnt: count() })
        .from(treeUpdatesTable)
        .where(and(inArray(treeUpdatesTable.treeId, treeIds), eq(treeUpdatesTable.photoStatus, "approved")))
        .groupBy(treeUpdatesTable.treeId),
    ]);

    const updateMap = new Map(updates.map((u) => [u.treeId, u.cnt]));

    const formatted = trees.map((t) => {
      const u = userMap.get(t.userId);
      return formatTree(t, u?.username ?? "Unknown", u?.photoUrl ?? null, updateMap.get(t.id) ?? 0, t.sunCount);
    });
    res.json(formatted);
  } catch (err) {
    req.log.error({ err }, "Error fetching recent trees");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /trees — crea albero ─────────────────────────────────────────────────
router.post("/trees", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateTreeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { photoUrl, photoThumbnailUrl, plantName, caption, species, plantedAt, latitude, longitude, locationName, country, province, verificationBypassed, photoStatus } = parsed.data;
  const mapsUrl = buildMapsUrl(latitude, longitude);
  try {
    const [[tree], userMap] = await Promise.all([
      db.insert(treesTable).values({
        userId,
        photoUrl,
        photoThumbnailUrl: photoThumbnailUrl ?? null,
        plantName: plantName ?? null,
        caption: caption ?? null,
        species: species ?? null,
        plantedAt: plantedAt ? new Date(plantedAt) : null,
        latitude,
        longitude,
        locationName: locationName ?? null,
        country: country ?? null,
        province: province ?? null,
        mapsUrl,
        verificationBypassed: verificationBypassed ?? false,
        photoStatus: photoStatus ?? "approved",
      }).returning(),
      db.update(usersTable)
        .set({ treesPlanted: sql`${usersTable.treesPlanted} + 1` })
        .where(eq(usersTable.clerkUserId, userId))
        .returning({ username: usersTable.username, photoUrl: usersTable.photoUrl }),
    ]);

    const u = userMap[0];

    // Enqueue AI photo verification if base64 provided (fire-and-forget)
    if ((photoStatus ?? "approved") === "pending") {
      const rawBase64 = typeof (req.body as any).imageBase64 === "string" ? (req.body as any).imageBase64 as string : null;
      if (rawBase64) {
        const { base64, mimeType } = parseBase64Image(rawBase64);
        enqueueVerification({ kind: "tree", treeId: tree!.id, userId, imageBase64: base64, mimeType });
      }
    }

    res.status(201).json(formatTree(tree!, u?.username ?? "Unknown", u?.photoUrl ?? null, 0));
  } catch (err) {
    req.log.error({ err }, "Error creating tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /trees/:treeId — dettaglio singolo albero ─────────────────────────────
router.get("/trees/:treeId", async (req, res) => {
  const parsed = GetTreeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tree ID" });
    return;
  }
  const { treeId } = parsed.data;
  const requestingUserId = (req as any).userId as string | undefined;
  try {
    const [tree] = await db.select().from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    // 3 query in parallelo invece di 4 sequenziali (no query separata per sunCount)
    const [[{ cnt }], userMap, userSun] = await Promise.all([
      db.select({ cnt: count() }).from(treeUpdatesTable).where(and(eq(treeUpdatesTable.treeId, treeId), eq(treeUpdatesTable.photoStatus, "approved"))),
      batchLoadUsers([tree.userId]),
      requestingUserId
        ? db.select().from(treeSunsTable).where(and(eq(treeSunsTable.treeId, treeId), eq(treeSunsTable.userId, requestingUserId)))
        : Promise.resolve([]),
    ]);

    const u = userMap.get(tree.userId);
    res.json(formatTree(tree, u?.username ?? "Unknown", u?.photoUrl ?? null, cnt, tree.sunCount, userSun.length > 0));
  } catch (err) {
    req.log.error({ err }, "Error fetching tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /trees/:treeId/sun — toggle 🌞 ──────────────────────────────────────
// Nessuna COUNT query dopo il toggle: aggiornamento atomico di sun_count con ±1
// e lettura del valore aggiornato tramite RETURNING.
router.post("/trees/:treeId/sun", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const treeId = parseInt((req.params.treeId as string) ?? "0");
  if (!treeId) { res.status(400).json({ error: "Invalid tree ID" }); return; }
  try {
    const [existing] = await db
      .select({ id: treeSunsTable.id })
      .from(treeSunsTable)
      .where(and(eq(treeSunsTable.treeId, treeId), eq(treeSunsTable.userId, userId)));

    let newSunCount: number;
    if (existing) {
      // Rimozione + decremento atomico
      const [, [updated]] = await Promise.all([
        db.delete(treeSunsTable).where(eq(treeSunsTable.id, existing.id)),
        db.update(treesTable)
          .set({ sunCount: sql`GREATEST(${treesTable.sunCount} - 1, 0)` })
          .where(eq(treesTable.id, treeId))
          .returning({ sunCount: treesTable.sunCount }),
      ]);
      newSunCount = updated?.sunCount ?? 0;
    } else {
      // Inserimento + incremento atomico
      const [, [updated]] = await Promise.all([
        db.insert(treeSunsTable).values({ treeId, userId }),
        db.update(treesTable)
          .set({ sunCount: sql`${treesTable.sunCount} + 1` })
          .where(eq(treesTable.id, treeId))
          .returning({ sunCount: treesTable.sunCount }),
      ]);
      newSunCount = updated?.sunCount ?? 0;
    }

    res.json({ sunCount: newSunCount, userHasSunned: !existing });
  } catch (err) {
    req.log.error({ err }, "Error toggling sun");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /trees/:treeId — modifica metadati albero ──────────────────────────
router.patch("/trees/:treeId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = GetTreeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tree ID" });
    return;
  }
  const body = PatchTreeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", details: body.error.flatten() });
    return;
  }
  const { treeId } = parsed.data;
  try {
    const [existing] = await db.select().from(treesTable).where(eq(treesTable.id, treeId));
    if (!existing) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const updateData: Partial<typeof treesTable.$inferInsert> = {};
    const b = body.data;
    if (b.plantName !== undefined) updateData.plantName = b.plantName;
    if (b.caption !== undefined) updateData.caption = b.caption;
    if (b.species !== undefined) updateData.species = b.species;
    if (b.plantedAt !== undefined) updateData.plantedAt = b.plantedAt ? new Date(b.plantedAt) : null;
    if (b.locationName !== undefined) updateData.locationName = b.locationName;
    if (b.country !== undefined) updateData.country = b.country;
    if (b.latitude !== undefined) updateData.latitude = b.latitude;
    if (b.longitude !== undefined) updateData.longitude = b.longitude;
    if (b.latitude !== undefined && b.longitude !== undefined) {
      updateData.mapsUrl = buildMapsUrl(b.latitude, b.longitude);
    } else if (b.latitude !== undefined) {
      updateData.mapsUrl = buildMapsUrl(b.latitude, existing.longitude);
    } else if (b.longitude !== undefined) {
      updateData.mapsUrl = buildMapsUrl(existing.latitude, b.longitude);
    }

    const [[updated], [{ cnt }], userMap] = await Promise.all([
      db.update(treesTable).set(updateData).where(eq(treesTable.id, treeId)).returning(),
      db.select({ cnt: count() }).from(treeUpdatesTable).where(and(eq(treeUpdatesTable.treeId, treeId), eq(treeUpdatesTable.photoStatus, "approved"))),
      batchLoadUsers([userId]),
    ]);

    const u = userMap.get(userId);
    res.json(formatTree(updated!, u?.username ?? "Unknown", u?.photoUrl ?? null, cnt, updated!.sunCount));
  } catch (err) {
    req.log.error({ err }, "Error updating tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /trees/:treeId ─────────────────────────────────────────────────────
router.delete("/trees/:treeId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = DeleteTreeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tree ID" });
    return;
  }
  const { treeId } = parsed.data;
  try {
    const [tree] = await db.select().from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }
    if (tree.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(treeStatusReportsTable).where(eq(treeStatusReportsTable.treeId, treeId));
      await tx.delete(treeUpdatesTable).where(eq(treeUpdatesTable.treeId, treeId));
      await tx.delete(treeSunsTable).where(eq(treeSunsTable.treeId, treeId));
      await tx.delete(treesTable).where(eq(treesTable.id, treeId));
      await tx
        .update(usersTable)
        .set({ treesPlanted: sql`GREATEST(${usersTable.treesPlanted} - 1, 0)` })
        .where(eq(usersTable.clerkUserId, userId));
    });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting tree");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /trees/:treeId/updates ────────────────────────────────────────────────
router.get("/trees/:treeId/updates", async (req, res) => {
  const parsed = GetTreeUpdatesParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tree ID" });
    return;
  }
  const { treeId } = parsed.data;
  try {
    const updates = await db
      .select()
      .from(treeUpdatesTable)
      .where(and(eq(treeUpdatesTable.treeId, treeId), eq(treeUpdatesTable.photoStatus, "approved")))
      .orderBy(treeUpdatesTable.createdAt);
    res.json(
      updates.map((u) => ({
        id: u.id,
        treeId: u.treeId,
        photoUrl: u.photoUrl,
        note: u.note ?? null,
        photoStatus: u.photoStatus,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching tree updates");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /trees/:treeId/updates — aggiunge aggiornamento (max 2) ──────────────
router.post("/trees/:treeId/updates", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const paramsResult = AddTreeUpdateParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: "Invalid tree ID" });
    return;
  }
  const bodyResult = AddTreeUpdateBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { treeId } = paramsResult.data;
  const { photoUrl, note, photoStatus } = bodyResult.data;
  try {
    const [tree] = await db.select().from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }
    if (tree.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const existingUpdates = await db
      .select({ id: treeUpdatesTable.id })
      .from(treeUpdatesTable)
      .where(eq(treeUpdatesTable.treeId, treeId));
    const unlockedSlots = getUnlockedPhotoSlots(tree.createdAt);
    if (unlockedSlots === 0) {
      res.status(422).json({ error: "Nessuno slot foto disponibile. Gli slot si sbloccano ogni trimestre (15 feb, 15 mag, 15 ago, 15 nov) a partire dalla data di piantagione." });
      return;
    }
    if (existingUpdates.length >= unlockedSlots) {
      res.status(422).json({ error: `Hai esaurito i ${unlockedSlots} slot foto disponibili. Il prossimo si sblocca al trimestre successivo.` });
      return;
    }
    const finalStatus = photoStatus ?? "approved";
    const [update] = await db
      .insert(treeUpdatesTable)
      .values({ treeId, userId, photoUrl, note: note ?? null, photoStatus: finalStatus })
      .returning();

    // Se la foto è pending: verifica AI in background oppure notifica admin (legacy)
    if (finalStatus === "pending") {
      const rawBase64 = typeof (req.body as any).imageBase64 === "string" ? (req.body as any).imageBase64 as string : null;
      if (rawBase64) {
        const { base64, mimeType } = parseBase64Image(rawBase64);
        enqueueVerification({
          kind: "update",
          updateId: update!.id,
          treeId,
          userId,
          imageBase64: base64,
          mimeType,
          referencePhotoUrl: tree.photoUrl ?? null,
          species: tree.species ?? null,
        });
      } else {
        // Nessun base64 fornito: notifica admin per revisione manuale
        const adminIds = getAdminIds();
        if (adminIds.length > 0) {
          const label = tree.plantName ? `"${tree.plantName}"` : `#${treeId}`;
          await db.insert(userNotificationsTable).values(
            adminIds.map((adminId) => ({
              userId: adminId,
              title: "Aggiornamento foto in attesa",
              message: `Una nuova foto per la pianta ${label} richiede approvazione. Vai nel pannello admin → Aggiorn. in attesa.`,
              type: "pending_tree_update",
              relatedId: update!.id,
              isRead: false,
            }))
          );
        }
      }
    }

    res.status(201).json({
      id: update!.id,
      treeId: update!.treeId,
      photoUrl: update!.photoUrl,
      note: update!.note ?? null,
      photoStatus: update!.photoStatus,
      createdAt: update!.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error adding tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /trees/:treeId/updates/:updateId ───────────────────────────────────
router.delete("/trees/:treeId/updates/:updateId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = DeleteTreeUpdateParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  const { treeId, updateId } = parsed.data;
  try {
    const [tree] = await db.select().from(treesTable).where(eq(treesTable.id, treeId));
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }
    if (tree.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [deleted] = await db
      .delete(treeUpdatesTable)
      .where(and(eq(treeUpdatesTable.id, updateId), eq(treeUpdatesTable.treeId, treeId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Update not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting tree update");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /trees/:treeId/status-report?quarter=2026-Q2 ─────────────────────────
router.get("/trees/:treeId/status-report", async (req, res) => {
  const parsed = StatusReportParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid tree ID" }); return; }
  const { treeId } = parsed.data;
  const { quarter } = req.query;
  if (typeof quarter !== "string" || !/^\d{4}-Q[1-4]$/.test(quarter)) {
    res.status(400).json({ error: "Parametro quarter mancante o non valido (es. 2026-Q2)" });
    return;
  }
  try {
    const [report] = await db
      .select()
      .from(treeStatusReportsTable)
      .where(and(eq(treeStatusReportsTable.treeId, treeId), eq(treeStatusReportsTable.quarter, quarter)));
    if (!report) { res.json(null); return; }
    res.json({
      id: report.id,
      treeId: report.treeId,
      quarter: report.quarter,
      status: report.status,
      photoUrl: report.photoUrl ?? null,
      reportedAt: report.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching status report");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /trees/:treeId/status-report ────────────────────────────────────────
router.post("/trees/:treeId/status-report", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsedParams = StatusReportParams.safeParse(req.params);
  if (!parsedParams.success) { res.status(400).json({ error: "Invalid tree ID" }); return; }
  const parsedBody = StatusReportBody.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Dati non validi", details: parsedBody.error.flatten() });
    return;
  }
  const { treeId } = parsedParams.data;
  const { quarter, status, photoUrl } = parsedBody.data;
  if (quarter !== getCurrentQuarterString()) {
    res.status(422).json({ error: "Puoi segnalare solo il trimestre corrente." });
    return;
  }
  if (status === "alive" && !photoUrl) {
    res.status(422).json({ error: "Foto obbligatoria per segnalare l'albero come vivo." });
    return;
  }
  try {
    const [tree] = await db
      .select({ userId: treesTable.userId, createdAt: treesTable.createdAt })
      .from(treesTable)
      .where(eq(treesTable.id, treeId));
    if (!tree) { res.status(404).json({ error: "Tree not found" }); return; }
    if (tree.userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (getUnlockedPhotoSlots(tree.createdAt) === 0) {
      res.status(422).json({ error: "Nessuna finestra disponibile. La prima segnalazione si sblocca alla prossima finestra trimestrale (15 feb, 15 mag, 15 ago, 15 nov) successiva alla data di registrazione della pianta." });
      return;
    }
    const { imageBase64 } = parsedBody.data;
    const [report] = await db
      .insert(treeStatusReportsTable)
      .values({ treeId, quarter, status, photoUrl: photoUrl ?? null, photoStatus: photoUrl ? "pending" : null })
      .onConflictDoUpdate({
        target: [treeStatusReportsTable.treeId, treeStatusReportsTable.quarter],
        set: { status, photoUrl: photoUrl ?? null, photoStatus: photoUrl ? "pending" : null, reportedAt: new Date() },
      })
      .returning();

    // Se foto presente con imageBase64: verifica AI in background
    if (status === "alive" && photoUrl && imageBase64) {
      const { base64, mimeType } = parseBase64Image(imageBase64);
      enqueueVerification({
        kind: "status",
        reportId: report!.id,
        treeId,
        userId,
        imageBase64: base64,
        mimeType,
      });
    } else if (status === "alive" && photoUrl && !imageBase64) {
      // Nessun base64: notifica admin per revisione manuale
      const adminIds = getAdminIds();
      if (adminIds.length > 0) {
        await db.insert(userNotificationsTable).values(
          adminIds.map((adminId) => ({
            userId: adminId,
            title: "Segnalazione stato in attesa",
            message: `La foto per la segnalazione trimestrale della pianta #${treeId} richiede approvazione. Vai nel pannello admin.`,
            type: "pending_tree_update",
            relatedId: report!.id,
            isRead: false,
          }))
        );
      }
    }

    res.status(201).json({
      id: report!.id,
      treeId: report!.treeId,
      quarter: report!.quarter,
      status: report!.status,
      photoUrl: report!.photoUrl ?? null,
      photoStatus: report!.photoStatus ?? null,
      reportedAt: report!.reportedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error saving status report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
