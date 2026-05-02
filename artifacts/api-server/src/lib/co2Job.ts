import { db } from "@workspace/db";
import { treesTable, co2RankingsTable, treeStatusReportsTable } from "@workspace/db";
import { sql, and, eq, isNotNull, isNull, gte, lt, desc, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { logger } from "./logger";

// 22 kg CO₂/anno per pianta ÷ 12 mesi × 3 mesi = CO₂ trimestrale per pianta
const CO2_KG_PER_TREE_QUARTER = (22 / 12) * 3;

/**
 * Restituisce la stringa del trimestre precedente rispetto al mese corrente Roma.
 * Chiamata il 1° di aprile/luglio/ottobre/gennaio.
 * Fallback per chiamate manuali: usa il trimestre precedente a quello corrente.
 */
function getPreviousQuarterString(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  if (month === 4)  return `${year}-Q1`;
  if (month === 7)  return `${year}-Q2`;
  if (month === 10) return `${year}-Q3`;
  if (month === 1)  return `${year - 1}-Q4`;

  // Fallback per chiamate manuali fuori dal giorno esatto
  const currentQ = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  const prevQ    = currentQ === 1 ? 4 : currentQ - 1;
  const prevYear = currentQ === 1 ? year - 1 : year;
  return `${prevYear}-Q${prevQ}`;
}

/** Restituisce start/end UTC del trimestre precedente. */
function getPreviousQuarterBounds(): { start: Date; end: Date } {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month === 4)  return { start: new Date(year, 0, 1),     end: new Date(year, 3, 1) };   // Gen-Mar
  if (month === 7)  return { start: new Date(year, 3, 1),     end: new Date(year, 6, 1) };   // Apr-Giu
  if (month === 10) return { start: new Date(year, 6, 1),     end: new Date(year, 9, 1) };   // Lug-Set
  if (month === 1)  return { start: new Date(year - 1, 9, 1), end: new Date(year, 0, 1) };  // Ott-Dic anno prec.

  // Fallback
  const currentQ = month <= 3 ? 1 : month <= 6 ? 2 : month <= 9 ? 3 : 4;
  const prevQ    = currentQ === 1 ? 4 : currentQ - 1;
  const prevYear = currentQ === 1 ? year - 1 : year;
  const startMonth = (prevQ - 1) * 3; // 0-indexed
  return {
    start: new Date(prevYear, startMonth, 1),
    end:   new Date(prevYear, startMonth + 3, 1),
  };
}

/**
 * Calcola la prossima data di calcolo trimestrale:
 * 1° aprile, 1° luglio, 1° ottobre o 1° gennaio alle 00:01 ora di Roma.
 */
function getNextQuarterStartAt0001Rome(): Date {
  const now = new Date();
  const romeNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const month = romeNow.getMonth() + 1;
  const year  = romeNow.getFullYear();

  let nextMonth: number;
  let nextYear: number;
  if (month < 4)  { nextMonth = 4;  nextYear = year; }
  else if (month < 7)  { nextMonth = 7;  nextYear = year; }
  else if (month < 10) { nextMonth = 10; nextYear = year; }
  else                 { nextMonth = 1;  nextYear = year + 1; }

  const nextFirst   = new Date(nextYear, nextMonth - 1, 1, 0, 1, 0);
  const romeOffsetMs = nextFirst.getTime() - romeNow.getTime();
  return new Date(now.getTime() + romeOffsetMs);
}

/** Dato "YYYY-Qn" restituisce il trimestre precedente. */
function getQuarterBefore(quarterStr: string): string {
  const [year, q] = quarterStr.split("-Q");
  const y = parseInt(year);
  const n = parseInt(q);
  if (n === 1) return `${y - 1}-Q4`;
  return `${y}-Q${n - 1}`;
}

export async function calculateCo2Rankings(): Promise<void> {
  const quarterStr = getPreviousQuarterString();

  logger.info({ quarter: quarterStr }, "[co2Job] Starting CO2 ranking calculation");

  try {
    const existing = await db
      .select({ id: co2RankingsTable.id })
      .from(co2RankingsTable)
      .where(eq(co2RankingsTable.month, quarterStr))
      .limit(1);

    if (existing.length > 0) {
      logger.info({ quarter: quarterStr }, "[co2Job] Already calculated for this quarter, skipping");
      return;
    }

    const { start, end } = getPreviousQuarterBounds();

    logger.info(
      { quarter: quarterStr, start: start.toISOString(), end: end.toISOString() },
      "[co2Job] Querying trees for quarter"
    );

    const aliveReports = alias(treeStatusReportsTable, "alive_reports");
    const deadReports  = alias(treeStatusReportsTable, "dead_reports");

    // Cutoff "6 mesi": inizio del trimestre precedente a quello in calcolo
    const prevQuarterStr = getQuarterBefore(quarterStr);
    const sixMonthCutoff = new Date(start.getFullYear(), start.getMonth() - 3, 1);

    // Conta solo alberi "vivi confermati":
    // - Piantati negli ultimi 6 mesi (createdAt >= sixMonthCutoff): contano se non morti
    // - Piantati da più di 6 mesi: devono avere un alive report nel trimestre corrente
    //   O nel trimestre precedente (altrimenti 6+ mesi senza aggiornamenti → esclusi)
    const rows = await db
      .select({
        comune: treesTable.locationName,
        provincia: treesTable.province,
        treeCount: sql<number>`cast(count(*) as int)`,
      })
      .from(treesTable)
      .leftJoin(
        aliveReports,
        and(
          eq(aliveReports.treeId, treesTable.id),
          eq(aliveReports.status, "alive"),
          or(
            eq(aliveReports.quarter, quarterStr),
            eq(aliveReports.quarter, prevQuarterStr),
          ),
        )
      )
      .leftJoin(
        deadReports,
        and(
          eq(deadReports.treeId, treesTable.id),
          eq(deadReports.quarter, quarterStr),
          eq(deadReports.status, "dead"),
        )
      )
      .where(
        and(
          eq(treesTable.photoStatus, "approved"),
          isNotNull(treesTable.locationName),
          lt(treesTable.createdAt, end),
          isNull(deadReports.id),
          or(
            gte(treesTable.createdAt, sixMonthCutoff),  // < 6 mesi: conta sempre
            isNotNull(aliveReports.id),                  // > 6 mesi: serve alive report recente
          )
        )
      )
      .groupBy(treesTable.locationName, treesTable.province)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    if (rows.length === 0) {
      logger.info({ quarter: quarterStr }, "[co2Job] No approved trees found for this quarter, skipping");
      return;
    }

    const badges = ["gold", "silver", "bronze"];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // CO₂ trimestrale = piante × (22 kg/anno ÷ 12 mesi × 3 mesi)
      const co2Kg = Math.round(row.treeCount * CO2_KG_PER_TREE_QUARTER * 100) / 100;
      await db.insert(co2RankingsTable).values({
        month: quarterStr,
        rank: i + 1,
        comune: row.comune!,
        provincia: row.provincia ?? null,
        treeCount: row.treeCount,
        co2Kg,
        badge: badges[i],
      }).onConflictDoNothing();
    }

    logger.info({ quarter: quarterStr, winners: rows.length }, "[co2Job] CO2 rankings saved");
  } catch (err) {
    logger.error({ err }, "[co2Job] Fatal error during CO2 ranking calculation");
  }
}

const MAX_TIMEOUT_MS = 2_000_000_000;

function scheduleNext(): void {
  const nextRun = getNextQuarterStartAt0001Rome();
  const delayMs = nextRun.getTime() - Date.now();

  logger.info(
    { nextRun: nextRun.toISOString(), delayDays: Math.round(delayMs / 86400000) },
    "[co2Job] Next quarterly calculation scheduled"
  );

  function waitChunked(remaining: number): void {
    if (remaining <= 0) {
      logger.info("[co2Job] Timer fired — calculating quarterly CO2 rankings");
      calculateCo2Rankings().then(() => scheduleNext());
      return;
    }
    const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
    setTimeout(() => waitChunked(remaining - chunk), chunk);
  }

  waitChunked(delayMs);
}

export function startCo2Scheduler(): void {
  scheduleNext();
  logger.info("[co2Job] Scheduler started (runs quarterly: 1 Apr, 1 Jul, 1 Oct, 1 Jan at 00:01 Europe/Rome)");
}
