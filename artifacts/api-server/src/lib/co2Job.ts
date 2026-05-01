import { db } from "@workspace/db";
import { treesTable, co2RankingsTable } from "@workspace/db";
import { sql, and, eq, isNotNull, gte, lt, desc } from "drizzle-orm";
import { logger } from "./logger";

// 22 kg CO₂/anno per pianta ÷ 12 mesi = CO₂ mensile per pianta
const CO2_KG_PER_TREE_MONTH = 22 / 12;

function getPreviousMonthString(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getPreviousMonthBounds(): { start: Date; end: Date } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function getNextFirstOfMonthAt0001Rome(): Date {
  const now = new Date();
  const romeNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const nextFirst = new Date(romeNow.getFullYear(), romeNow.getMonth() + 1, 1, 0, 1, 0);
  const romeOffsetMs = nextFirst.getTime() - romeNow.getTime();
  return new Date(now.getTime() + romeOffsetMs);
}

export async function calculateCo2Rankings(): Promise<void> {
  const monthStr = getPreviousMonthString();

  logger.info({ month: monthStr }, "[co2Job] Starting CO2 ranking calculation");

  try {
    const existing = await db
      .select({ id: co2RankingsTable.id })
      .from(co2RankingsTable)
      .where(eq(co2RankingsTable.month, monthStr))
      .limit(1);

    if (existing.length > 0) {
      logger.info({ month: monthStr }, "[co2Job] Already calculated for this month, skipping");
      return;
    }

    const { start, end } = getPreviousMonthBounds();

    // Conta le piante approvate piantate nel mese precedente, raggruppate per comune
    const rows = await db
      .select({
        comune: treesTable.locationName,
        provincia: treesTable.province,
        treeCount: sql<number>`cast(count(*) as int)`,
      })
      .from(treesTable)
      .where(
        and(
          eq(treesTable.photoStatus, "approved"),
          isNotNull(treesTable.locationName),
          gte(treesTable.createdAt, start),
          lt(treesTable.createdAt, end),
        ),
      )
      .groupBy(treesTable.locationName, treesTable.province)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    if (rows.length === 0) {
      logger.info({ month: monthStr }, "[co2Job] No approved trees found for previous month, skipping");
      return;
    }

    const badges = ["gold", "silver", "bronze"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // CO₂ mensile = numero piante × (22 kg/anno ÷ 12 mesi)
      const co2Kg = Math.round(row.treeCount * CO2_KG_PER_TREE_MONTH * 100) / 100;
      await db.insert(co2RankingsTable).values({
        month: monthStr,
        rank: i + 1,
        comune: row.comune!,
        provincia: row.provincia ?? null,
        treeCount: row.treeCount,
        co2Kg,
        badge: badges[i],
      }).onConflictDoNothing();
    }

    logger.info({ month: monthStr, winners: rows.length }, "[co2Job] CO2 rankings saved");
  } catch (err) {
    logger.error({ err }, "[co2Job] Fatal error during CO2 ranking calculation");
  }
}

const MAX_TIMEOUT_MS = 2_000_000_000;

function scheduleNext(): void {
  const nextRun = getNextFirstOfMonthAt0001Rome();
  const delayMs = nextRun.getTime() - Date.now();

  logger.info(
    { nextRun: nextRun.toISOString(), delayHours: Math.round(delayMs / 3600000) },
    "[co2Job] Next calculation scheduled"
  );

  function waitChunked(remaining: number): void {
    if (remaining <= 0) {
      logger.info("[co2Job] Timer fired — calculating CO2 rankings");
      calculateCo2Rankings().then(() => scheduleNext());
      return;
    }
    const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
    setTimeout(() => waitChunked(remaining - chunk), chunk);
  }

  waitChunked(delayMs);
}

export function startCo2Scheduler(): void {
  calculateCo2Rankings();
  scheduleNext();
  logger.info("[co2Job] Scheduler started (runs on 1st of each month at 00:01 Europe/Rome)");
}
