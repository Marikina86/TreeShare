import { db } from "@workspace/db";
import { treesTable, treeSunsTable, weeklyWinnersTable, userNotificationsTable } from "@workspace/db";
import { eq, and, gte, lt, count, inArray } from "drizzle-orm";
import { logger } from "./logger";

/** Returns Monday 00:00:00 UTC of the current week */
function getCurrentWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Returns Monday 00:00:00 UTC of the previous week */
function getPreviousWeekStart(): Date {
  const current = getCurrentWeekStart();
  current.setUTCDate(current.getUTCDate() - 7);
  return current;
}

/** Returns the set of treeIds that are current weekly winners (pinned this week) */
export async function getCurrentWinnerIds(): Promise<Set<number>> {
  try {
    const prevWeekStart = getPreviousWeekStart();
    const winners = await db
      .select({ treeId: weeklyWinnersTable.treeId })
      .from(weeklyWinnersTable)
      .where(eq(weeklyWinnersTable.weekStart, prevWeekStart));
    return new Set(winners.map((w) => w.treeId));
  } catch {
    return new Set();
  }
}

/** Returns full winner data for the current week, keyed by province */
export async function getCurrentWinnersMap(): Promise<
  Record<string, { treeId: number; userId: string; sunCount: number }>
> {
  try {
    const prevWeekStart = getPreviousWeekStart();
    const winners = await db
      .select()
      .from(weeklyWinnersTable)
      .where(eq(weeklyWinnersTable.weekStart, prevWeekStart));
    const result: Record<string, { treeId: number; userId: string; sunCount: number }> = {};
    for (const w of winners) {
      result[w.province] = { treeId: w.treeId, userId: w.userId, sunCount: w.sunCount };
    }
    return result;
  } catch {
    return {};
  }
}

/** Main calculation: find winners for each province in the previous week */
export async function calculateWeeklyWinners(): Promise<void> {
  const prevWeekStart = getPreviousWeekStart();
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setUTCDate(prevWeekEnd.getUTCDate() + 7);

  logger.info(
    { weekStart: prevWeekStart.toISOString(), weekEnd: prevWeekEnd.toISOString() },
    "[weeklyWinner] Starting calculation"
  );

  try {
    // Skip if already calculated for this week
    const existing = await db
      .select({ id: weeklyWinnersTable.id })
      .from(weeklyWinnersTable)
      .where(eq(weeklyWinnersTable.weekStart, prevWeekStart))
      .limit(1);

    if (existing.length > 0) {
      logger.info("[weeklyWinner] Already calculated for this week, skipping");
      return;
    }

    // Count suns per tree received during the previous week window
    const sunsInWeek = await db
      .select({ treeId: treeSunsTable.treeId, sunCount: count(treeSunsTable.id) })
      .from(treeSunsTable)
      .where(
        and(
          gte(treeSunsTable.createdAt, prevWeekStart),
          lt(treeSunsTable.createdAt, prevWeekEnd)
        )
      )
      .groupBy(treeSunsTable.treeId);

    if (sunsInWeek.length === 0) {
      logger.info("[weeklyWinner] No suns recorded this week, skipping");
      return;
    }

    // Fetch tree info for candidates that are approved and have province set
    const candidateTreeIds = sunsInWeek.map((s) => s.treeId);
    const trees = await db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        province: treesTable.province,
        createdAt: treesTable.createdAt,
      })
      .from(treesTable)
      .where(
        and(
          eq(treesTable.photoStatus, "approved"),
          inArray(treesTable.id, candidateTreeIds)
        )
      );

    // Build sunCount map
    const sunMap = new Map(sunsInWeek.map((s) => [s.treeId, Number(s.sunCount)]));

    // Find best tree per province (most suns, tie-break: earliest createdAt)
    type ProvinceWinner = { treeId: number; userId: string; sunCount: number; createdAt: Date };
    const provinceMap = new Map<string, ProvinceWinner>();

    for (const tree of trees) {
      if (!tree.province) continue;
      const suns = sunMap.get(tree.id) ?? 0;
      const current = provinceMap.get(tree.province);
      if (
        !current ||
        suns > current.sunCount ||
        (suns === current.sunCount && tree.createdAt < current.createdAt)
      ) {
        provinceMap.set(tree.province, {
          treeId: tree.id,
          userId: tree.userId,
          sunCount: suns,
          createdAt: tree.createdAt,
        });
      }
    }

    if (provinceMap.size === 0) {
      logger.info("[weeklyWinner] No trees with province found, skipping");
      return;
    }

    // Save winners and send notifications
    let saved = 0;
    for (const [province, winner] of provinceMap) {
      try {
        await db.insert(weeklyWinnersTable).values({
          treeId: winner.treeId,
          userId: winner.userId,
          province,
          weekStart: prevWeekStart,
          sunCount: winner.sunCount,
          notified: false,
        });

        // Send in-app notification to winner
        try {
          await db.insert(userNotificationsTable).values({
            userId: winner.userId,
            title: "🌞 Complimenti!",
            message: `La tua pianta è la Pianta della Settimana nella provincia di ${province}!`,
            type: "weekly_winner",
            relatedId: winner.treeId,
          });

          await db
            .update(weeklyWinnersTable)
            .set({ notified: true })
            .where(
              and(
                eq(weeklyWinnersTable.weekStart, prevWeekStart),
                eq(weeklyWinnersTable.province, province)
              )
            );
        } catch (notifyErr) {
          logger.error({ notifyErr, province }, "[weeklyWinner] Error sending notification");
        }

        saved++;
        logger.info({ province, treeId: winner.treeId, sunCount: winner.sunCount }, "[weeklyWinner] Winner saved");
      } catch (err) {
        logger.error({ err, province }, "[weeklyWinner] Error saving winner");
      }
    }

    logger.info({ saved, total: provinceMap.size }, "[weeklyWinner] Calculation complete");
  } catch (err) {
    logger.error({ err }, "[weeklyWinner] Fatal error during calculation");
  }
}

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes

export function startWeeklyWinnerScheduler(): void {
  // Check immediately on server start (handles server restarts on Monday)
  if (new Date().getUTCDay() === 1) {
    calculateWeeklyWinners();
  }

  setInterval(() => {
    if (new Date().getUTCDay() === 1) {
      calculateWeeklyWinners();
    }
  }, CHECK_INTERVAL_MS);

  logger.info("[weeklyWinner] Scheduler started (check interval: 15min, runs on Mondays)");
}
