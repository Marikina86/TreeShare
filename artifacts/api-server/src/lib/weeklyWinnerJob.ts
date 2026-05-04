import { db } from "@workspace/db";
import { treesTable, weeklyWinnersTable, userNotificationsTable, treeStatusReportsTable } from "@workspace/db";
import { eq, desc, asc, and, notInArray } from "drizzle-orm";
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

/** Main calculation: winner = approved tree with most total suns; tie-break → earliest publication */
export async function calculateWeeklyWinners(): Promise<void> {
  const weekStart = getLastCompletedWeekStart();

  logger.info(
    { weekStart: weekStart.toISOString() },
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

    // Collect treeIds reported as dead (any quarter) — these are excluded from the ranking
    const deadRows = await db
      .select({ treeId: treeStatusReportsTable.treeId })
      .from(treeStatusReportsTable)
      .where(eq(treeStatusReportsTable.status, "dead"));
    const deadIds = deadRows.map((r) => r.treeId);
    logger.info({ deadCount: deadIds.length }, "[weeklyWinner] Dead trees excluded from ranking");

    // Find the approved, non-dead tree with the most total suns; tie-break → earliest publication
    const whereClause =
      deadIds.length > 0
        ? and(eq(treesTable.photoStatus, "approved"), notInArray(treesTable.id, deadIds))
        : eq(treesTable.photoStatus, "approved");

    const [topTree] = await db
      .select({
        id: treesTable.id,
        userId: treesTable.userId,
        province: treesTable.province,
        country: treesTable.country,
        sunCount: treesTable.sunCount,
        createdAt: treesTable.createdAt,
      })
      .from(treesTable)
      .where(whereClause)
      .orderBy(desc(treesTable.sunCount), asc(treesTable.createdAt))
      .limit(1);

    if (!topTree) {
      logger.info("[weeklyWinner] No approved trees found, skipping");
      return;
    }

    const province = topTree.province || topTree.country || "Italia";

    // Save the single winner
    await db.insert(weeklyWinnersTable).values({
      treeId: topTree.id,
      userId: topTree.userId,
      province,
      weekStart,
      sunCount: topTree.sunCount,
    });

    logger.info(
      { treeId: topTree.id, sunCount: topTree.sunCount, province },
      "[weeklyWinner] Winner saved"
    );

    // Send in-app notification to the winner
    try {
      await db.insert(userNotificationsTable).values({
        userId: topTree.userId,
        title: "🌞 Complimenti!",
        message: "La tua pianta è la Pianta della Settimana di TreeShare! Tocca per vederla.",
        type: "weekly_winner",
        relatedId: topTree.id,
        isRead: false,
      });
      logger.info({ userId: topTree.userId, treeId: topTree.id }, "[weeklyWinner] Notification sent");
    } catch (notifyErr) {
      logger.error({ notifyErr }, "[weeklyWinner] Error sending notification");
    }

    logger.info("[weeklyWinner] Calculation complete");
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
