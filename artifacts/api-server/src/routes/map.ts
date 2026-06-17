import { Router } from "express";
import { db } from "@workspace/db";
import { treesTable, usersTable } from "@workspace/db";
import { count, countDistinct, sql, gte, lte, and, eq } from "drizzle-orm";
import { parseBbox } from "../lib/bbox";

const router = Router();

const CLUSTER_LIMIT = 500;
const INDIVIDUAL_LIMIT = 300;

router.get("/stats/global", async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [[{ totalTrees }], [{ totalUsers }], [{ totalCountries }], [{ recentPlanters }]] = await Promise.all([
      db.select({ totalTrees: count() }).from(treesTable).where(eq(treesTable.photoStatus, "approved")),
      db.select({ totalUsers: count() }).from(usersTable),
      db.select({ totalCountries: countDistinct(treesTable.country) }).from(treesTable).where(eq(treesTable.photoStatus, "approved")),
      db.select({ recentPlanters: countDistinct(treesTable.userId) })
        .from(treesTable)
        .where(sql`${treesTable.createdAt} > ${thirtyDaysAgo} AND ${treesTable.photoStatus} = 'approved'`),
    ]);
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json({
      totalTrees: Number(totalTrees),
      totalUsers: Number(totalUsers),
      totalCountries: Number(totalCountries),
      recentPlanters: Number(recentPlanters),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /map/markers — clusters within optional bounding box
router.get("/map/markers", async (req, res) => {
  try {
    const rawPrecision = parseInt(req.query.precision as string);
    const precision = isNaN(rawPrecision) ? 2 : Math.min(4, Math.max(1, rawPrecision));
    const multiplier = Math.pow(10, precision);
    const bbox = parseBbox(req.query as Record<string, unknown>);

    const whereClause = bbox
      ? and(
          eq(treesTable.photoStatus, "approved"),
          gte(treesTable.latitude, bbox.minLat),
          lte(treesTable.latitude, bbox.maxLat),
          gte(treesTable.longitude, bbox.minLng),
          lte(treesTable.longitude, bbox.maxLng),
        )
      : eq(treesTable.photoStatus, "approved");

    const rows = await db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        latitude: treesTable.latitude,
        longitude: treesTable.longitude,
        photoUrl: treesTable.photoUrl,
        locationName: treesTable.locationName,
        plantName: treesTable.plantName,
        species: treesTable.species,
        createdAt: treesTable.createdAt,
        username: usersTable.username,
        userPhotoUrl: usersTable.photoUrl,
      })
      .from(treesTable)
      .leftJoin(usersTable, eq(usersTable.clerkUserId, treesTable.userId))
      .where(whereClause)
      .limit(CLUSTER_LIMIT);

    type TreeItem = {
      id: number;
      userId: string;
      username: string | null;
      userPhotoUrl: string | null;
      photoUrl: string;
      plantName: string | null;
      species: string | null;
    };

    type ClusterEntry = {
      latitude: number;
      longitude: number;
      locationName: string | null;
      latestCreatedAt: Date;
      trees: TreeItem[];
    };

    const markerMap = new Map<string, ClusterEntry>();

    for (const row of rows) {
      if (row.latitude === 0 && row.longitude === 0) continue;
      const lat = Math.round(row.latitude * multiplier) / multiplier;
      const lng = Math.round(row.longitude * multiplier) / multiplier;
      const key = `${lat},${lng}`;
      if (!markerMap.has(key)) {
        markerMap.set(key, {
          latitude: lat,
          longitude: lng,
          locationName: row.locationName ?? null,
          latestCreatedAt: row.createdAt,
          trees: [],
        });
      }
      const entry = markerMap.get(key)!;
      if (row.createdAt >= entry.latestCreatedAt) {
        entry.latestCreatedAt = row.createdAt;
        if (row.locationName) entry.locationName = row.locationName;
      }
      entry.trees.push({
        id: row.id,
        userId: row.userId,
        username: row.username ?? null,
        userPhotoUrl: row.userPhotoUrl ?? null,
        photoUrl: row.photoUrl,
        plantName: row.plantName ?? null,
        species: row.species ?? null,
      });
    }

    const markers = Array.from(markerMap.values()).map((entry) => ({
      latitude: entry.latitude,
      longitude: entry.longitude,
      count: entry.trees.length,
      locationName: entry.locationName,
      trees: entry.trees.slice(0, 30),
    }));

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(markers);
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error fetching map markers");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /map/individual — individual markers within optional bounding box
router.get("/map/individual", async (req, res) => {
  try {
    const bbox = parseBbox(req.query as Record<string, unknown>);

    const whereClause = bbox
      ? and(
          eq(treesTable.photoStatus, "approved"),
          gte(treesTable.latitude, bbox.minLat),
          lte(treesTable.latitude, bbox.maxLat),
          gte(treesTable.longitude, bbox.minLng),
          lte(treesTable.longitude, bbox.maxLng),
        )
      : eq(treesTable.photoStatus, "approved");

    const trees = await db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        latitude: treesTable.latitude,
        longitude: treesTable.longitude,
        photoUrl: treesTable.photoUrl,
        locationName: treesTable.locationName,
        plantName: treesTable.plantName,
        species: treesTable.species,
        username: usersTable.username,
        userPhotoUrl: usersTable.photoUrl,
      })
      .from(treesTable)
      .leftJoin(usersTable, eq(usersTable.clerkUserId, treesTable.userId))
      .where(whereClause)
      .limit(INDIVIDUAL_LIMIT);

    const result = trees
      .filter((t) => !(t.latitude === 0 && t.longitude === 0))
      .map((t) => ({
        id: t.id,
        userId: t.userId,
        username: t.username ?? null,
        userPhotoUrl: t.userPhotoUrl ?? null,
        latitude: t.latitude,
        longitude: t.longitude,
        photoUrl: t.photoUrl,
        locationName: t.locationName ?? null,
        plantName: t.plantName ?? null,
        species: t.species ?? null,
      }));

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(result);
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error fetching individual map markers");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
