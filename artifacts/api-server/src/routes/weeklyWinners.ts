import { Router } from "express";
import { db } from "@workspace/db";
import { treesTable, treeUpdatesTable, treeSunsTable, usersTable, weeklyWinnersTable } from "@workspace/db";
import { eq, count, desc, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { calculateWeeklyWinners, getCurrentWinnersMap } from "../lib/weeklyWinnerJob";

const router = Router();

function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=17`;
}

/**
 * GET /weekly-winners/current
 * Returns this week's winners with full tree data, keyed by province.
 */
router.get("/weekly-winners/current", async (req, res) => {
  try {
    const winnersMap = await getCurrentWinnersMap();
    if (Object.keys(winnersMap).length === 0) {
      res.json({});
      return;
    }

    const treeIds = Object.values(winnersMap).map((w) => w.treeId);

    const [winnerTrees, updates, suns] = await Promise.all([
      db.select().from(treesTable).where(inArray(treesTable.id, treeIds)),
      db.select({ treeId: treeUpdatesTable.treeId, cnt: count() }).from(treeUpdatesTable).groupBy(treeUpdatesTable.treeId),
      db.select({ treeId: treeSunsTable.treeId, cnt: count() }).from(treeSunsTable).groupBy(treeSunsTable.treeId),
    ]);

    const updateMap = new Map(updates.map((u) => [u.treeId, u.cnt]));
    const sunMap = new Map(suns.map((s) => [s.treeId, s.cnt]));

    // Batch load users — una query per tutti i vincitori invece di N query nel loop
    const uniqueUserIds = [...new Set(winnerTrees.map((t) => t.userId))];
    const userRows = uniqueUserIds.length > 0
      ? await db
          .select({ clerkUserId: usersTable.clerkUserId, username: usersTable.username, photoUrl: usersTable.photoUrl })
          .from(usersTable)
          .where(inArray(usersTable.clerkUserId, uniqueUserIds))
      : [];
    const userMap = new Map(userRows.map((u) => [u.clerkUserId, { username: u.username, photoUrl: u.photoUrl }]));

    const result: Record<string, object> = {};

    for (const [province, winner] of Object.entries(winnersMap)) {
      const tree = winnerTrees.find((t) => t.id === winner.treeId);
      if (!tree) continue;

      const u = userMap.get(tree.userId);

      result[province] = {
        treeId: tree.id,
        userId: tree.userId,
        username: u?.username ?? "Unknown",
        userPhotoUrl: u?.photoUrl ?? null,
        photoUrl: tree.photoUrl,
        photoThumbnailUrl: tree.photoThumbnailUrl ?? null,
        plantName: tree.plantName ?? null,
        caption: tree.caption ?? null,
        species: tree.species ?? null,
        latitude: tree.latitude,
        longitude: tree.longitude,
        locationName: tree.locationName ?? null,
        country: tree.country ?? null,
        province: tree.province ?? province,
        mapsUrl: tree.mapsUrl ?? buildMapsUrl(tree.latitude, tree.longitude),
        sunCount: Number(sunMap.get(tree.id) ?? 0),
        weekSunCount: winner.sunCount,
        updateCount: Number(updateMap.get(tree.id) ?? 0),
        isWeeklyWinner: true,
        createdAt: tree.createdAt.toISOString(),
      };
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error fetching weekly winners");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /weekly-winners
 * Returns all historical winners, ordered by most recent week first.
 */
router.get("/weekly-winners", async (req, res) => {
  try {
    const winners = await db
      .select()
      .from(weeklyWinnersTable)
      .orderBy(desc(weeklyWinnersTable.weekStart), desc(weeklyWinnersTable.sunCount));
    res.json(winners);
  } catch (err) {
    req.log.error({ err }, "Error fetching weekly winners history");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /admin/weekly-winners/calculate
 * Admin-only: manually trigger weekly winner calculation (for testing/backfill).
 */
router.post("/admin/weekly-winners/calculate", requireAdmin, async (req, res) => {
  try {
    await calculateWeeklyWinners();
    res.json({ ok: true, message: "Weekly winner calculation triggered" });
  } catch (err) {
    req.log.error({ err }, "Error triggering weekly winner calculation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
