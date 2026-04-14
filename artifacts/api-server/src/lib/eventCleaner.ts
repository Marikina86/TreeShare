import { db } from "@workspace/db";
import { eventsTable, donationCampaignsTable } from "@workspace/db";
import { sql, and, eq, lt } from "drizzle-orm";
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

export async function deleteExpiredCampaigns(): Promise<void> {
  try {
    const now = new Date();
    const result = await db
      .delete(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.paymentStatus, "paid"),
          lt(donationCampaignsTable.expiresAt, now),
        ),
      )
      .returning({ id: donationCampaignsTable.id, title: donationCampaignsTable.title });

    if (result.length > 0) {
      logger.info(
        { count: result.length, ids: result.map((r) => r.id) },
        "[campaignCleaner] Deleted expired campaigns"
      );
    }
  } catch (err) {
    logger.error({ err }, "[campaignCleaner] Error deleting expired campaigns");
  }
}

const EVENT_CLEANUP_INTERVAL_MS = 60 * 1000;
const CAMPAIGN_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startEventCleaner(): void {
  deleteExpiredEvents();
  deleteExpiredCampaigns();
  setInterval(deleteExpiredEvents, EVENT_CLEANUP_INTERVAL_MS);
  setInterval(deleteExpiredCampaigns, CAMPAIGN_CLEANUP_INTERVAL_MS);
  logger.info("[eventCleaner] Auto-cleanup scheduler started (events: 60s, campaigns: 24h)");
}
