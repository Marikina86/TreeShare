import { db } from "@workspace/db";
import { eventsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Deletes expired events according to these rules:
 *  1. endDate + endTime both set  → delete after that exact datetime
 *  2. endDate set, endTime absent → delete after midnight of endDate
 *  3. No endDate at all           → delete after midnight of eventDate
 */
export async function deleteExpiredEvents(): Promise<void> {
  try {
    const result = await db
      .delete(eventsTable)
      .where(
        sql`(
          -- Case 1: endDate AND endTime set → delete after that moment
          (
            ${eventsTable.endDate} IS NOT NULL
            AND ${eventsTable.endTime} IS NOT NULL
            AND (${eventsTable.endDate}::text || ' ' || ${eventsTable.endTime}::text)::timestamp < NOW()
          )
          OR
          -- Case 2: endDate set but no endTime → delete after midnight of endDate
          (
            ${eventsTable.endDate} IS NOT NULL
            AND ${eventsTable.endTime} IS NULL
            AND (${eventsTable.endDate}::timestamp + INTERVAL '1 day') < NOW()
          )
          OR
          -- Case 3: no endDate → delete after midnight of eventDate
          (
            ${eventsTable.endDate} IS NULL
            AND (${eventsTable.eventDate}::timestamp + INTERVAL '1 day') < NOW()
          )
        )`
      )
      .returning({ id: eventsTable.id });

    if (result.length > 0) {
      logger.info(
        { count: result.length, ids: result.map((r) => r.id) },
        "[eventCleaner] Deleted expired events"
      );
    }
  } catch (err) {
    logger.error({ err }, "[eventCleaner] Error deleting expired events");
  }
}

const INTERVAL_MS = 60 * 1000; // every 60 seconds

export function startEventCleaner(): void {
  deleteExpiredEvents();
  setInterval(deleteExpiredEvents, INTERVAL_MS);
  logger.info("[eventCleaner] Event auto-cleanup scheduler started (interval: 60s)");
}
