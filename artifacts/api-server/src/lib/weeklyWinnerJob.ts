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

/**
 * Returns the Monday of the most recently *completed* week.
 * - On Sunday UTC: the current week (Mon–Sun) is ending → use getCurrentWeekStart()
 * - On Monday–Saturday UTC: the previous week already ended → use getPreviousWeekStart()
 */
function getLastCompletedWeekStart(): Date {
  const now = new Date();
  return now.getUTCDay() === 0 ? getCurrentWeekStart() : getPreviousWeekStart();
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

/** Main calculation: find winners for each province in the last completed week */
export async function calculateWeeklyWinners(): Promise<void> {
  const weekStart = getLastCompletedWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  logger.info(
    { weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString() },
    "[weeklyWinner] Starting calculation"
  );

  try {
    // Skip if already calculated for this week
    const existing = await db
      .select({ id: weeklyWinnersTable.id })
      .from(weeklyWinnersTable)
      .where(eq(weeklyWinnersTable.weekStart, weekStart))
      .limit(1);

    if (existing.length > 0) {
      logger.info("[weeklyWinner] Already calculated for this week, skipping");
      return;
    }

    // Count suns per tree received during the week window
    const sunsInWeek = await db
      .select({ treeId: treeSunsTable.treeId, sunCount: count(treeSunsTable.id) })
      .from(treeSunsTable)
      .where(
        and(
          gte(treeSunsTable.createdAt, weekStart),
          lt(treeSunsTable.createdAt, weekEnd)
        )
      )
      .groupBy(treeSunsTable.treeId);

    if (sunsInWeek.length === 0) {
      logger.info("[weeklyWinner] No suns recorded this week, skipping");
      return;
    }

    // Fetch tree info for approved candidates (province or country used as grouping key)
    const candidateTreeIds = sunsInWeek.map((s) => s.treeId);
    const trees = await db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        province: treesTable.province,
        country: treesTable.country,
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

    // Find best tree per group key: province if set, else country, else "Italia"
    type ProvinceWinner = { treeId: number; userId: string; sunCount: number; createdAt: Date };
    const provinceMap = new Map<string, ProvinceWinner>();

    for (const tree of trees) {
      const groupKey = tree.province || tree.country || "Italia";
      const suns = sunMap.get(tree.id) ?? 0;
      const current = provinceMap.get(groupKey);
      if (
        !current ||
        suns > current.sunCount ||
        (suns === current.sunCount && tree.createdAt < current.createdAt)
      ) {
        provinceMap.set(groupKey, {
          treeId: tree.id,
          userId: tree.userId,
          sunCount: suns,
          createdAt: tree.createdAt,
        });
      }
    }

    if (provinceMap.size === 0) {
      logger.info("[weeklyWinner] No approved trees found, skipping");
      return;
    }

    // Save winners and send notifications
    let saved = 0;
    for (const [groupKey, winner] of provinceMap) {
      try {
        await db.insert(weeklyWinnersTable).values({
          treeId: winner.treeId,
          userId: winner.userId,
          province: groupKey,
          weekStart: weekStart,
          sunCount: winner.sunCount,
        });

        // Send in-app notification to winner
        try {
          const isProvince = groupKey !== "Italia" && !/^[A-Z]{2,3}$/.test(groupKey);
          const locationLabel = isProvince ? `nella provincia di ${groupKey}` : `in ${groupKey}`;
          await db.insert(userNotificationsTable).values({
            userId: winner.userId,
            title: "🌞 Complimenti!",
            message: `La tua pianta è la Pianta della Settimana ${locationLabel}!`,
            isRead: false,
          });
        } catch (notifyErr) {
          logger.error({ notifyErr, groupKey }, "[weeklyWinner] Error sending notification");
        }

        saved++;
        logger.info({ groupKey, treeId: winner.treeId, sunCount: winner.sunCount }, "[weeklyWinner] Winner saved");
      } catch (err) {
        logger.error({ err, groupKey }, "[weeklyWinner] Error saving winner");
      }
    }

    logger.info({ saved, total: provinceMap.size }, "[weeklyWinner] Calculation complete");
  } catch (err) {
    logger.error({ err }, "[weeklyWinner] Fatal error during calculation");
  }
}

function getNextSundayAt2359Rome(): Date {
  const now = new Date();
  const romeNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));

  const currentDay = romeNow.getDay();
  let daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;

  if (currentDay === 0) {
    const romeHour = romeNow.getHours();
    const romeMinute = romeNow.getMinutes();
    if (romeHour > 23 || (romeHour === 23 && romeMinute >= 59)) {
      daysUntilSunday = 7;
    }
  }

  const targetRome = new Date(romeNow);
  targetRome.setDate(romeNow.getDate() + daysUntilSunday);
  targetRome.setHours(23, 59, 0, 0);

  // Subtract romeNow (not now) so the Rome→UTC offset cancels correctly
  const romeOffsetMs = targetRome.getTime() - romeNow.getTime();
  const targetUtc = new Date(now.getTime() + romeOffsetMs);

  return targetUtc;
}

function scheduleNext(): void {
  const nextRun = getNextSundayAt2359Rome();
  const delayMs = nextRun.getTime() - Date.now();

  logger.info(
    { nextRun: nextRun.toISOString(), delayMinutes: Math.round(delayMs / 60000) },
    "[weeklyWinner] Next calculation scheduled"
  );

  setTimeout(async () => {
    logger.info("[weeklyWinner] Timer fired — calculating winners");
    await calculateWeeklyWinners();
    scheduleNext();
  }, delayMs);
}

export function startWeeklyWinnerScheduler(): void {
  calculateWeeklyWinners();
  scheduleNext();
  logger.info("[weeklyWinner] Scheduler started (runs every Sunday at 23:59 Europe/Rome)");
}
