import { db } from "@workspace/db";
import { eventsTable, donationCampaignsTable, userNotificationsTable } from "@workspace/db";
import { sql, and, eq, lt, lte, gte, isNull } from "drizzle-orm";
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

const ROME_TIME_ZONE = "Europe/Rome";

export function getRomeExpiryDate(durationDays: number, from = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(from);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const target = new Date(Date.UTC(year, month - 1, day + Math.max(0, durationDays), 23, 59, 0, 0));
  const localParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(target);
  const localAsUtc = Date.UTC(
    Number(localParts.find((p) => p.type === "year")?.value),
    Number(localParts.find((p) => p.type === "month")?.value) - 1,
    Number(localParts.find((p) => p.type === "day")?.value),
    Number(localParts.find((p) => p.type === "hour")?.value),
    Number(localParts.find((p) => p.type === "minute")?.value),
    Number(localParts.find((p) => p.type === "second")?.value),
  );
  return new Date(target.getTime() - (localAsUtc - target.getTime()));
}

export async function archiveExpiredCampaigns(): Promise<void> {
  try {
    const now = new Date();
    const result = await db
      .update(donationCampaignsTable)
      .set({
        isActive: false,
        archivedAt: now,
        storageTier: "cold",
        updatedAt: now,
      })
      .where(
        and(
          eq(donationCampaignsTable.paymentStatus, "paid"),
          eq(donationCampaignsTable.isActive, true),
          lt(donationCampaignsTable.expiresAt, now),
        ),
      )
      .returning({ id: donationCampaignsTable.id, title: donationCampaignsTable.title });

    if (result.length > 0) {
      logger.info(
        { count: result.length, ids: result.map((r) => r.id) },
        "[campaignCleaner] Archived expired campaigns"
      );
    }
  } catch (err) {
    logger.error({ err }, "[campaignCleaner] Error archiving expired campaigns");
  }
}

export async function notifyExpiringCampaigns(): Promise<void> {
  const days = Math.max(1, Number(process.env.CAMPAIGN_EXPIRY_NOTICE_DAYS || 3));
  const now = new Date();
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  try {
    const campaigns = await db
      .select({
        id: donationCampaignsTable.id,
        userId: donationCampaignsTable.userId,
        title: donationCampaignsTable.title,
        expiresAt: donationCampaignsTable.expiresAt,
      })
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.paymentStatus, "paid"),
          eq(donationCampaignsTable.isActive, true),
          isNull(donationCampaignsTable.expiryNotificationSentAt),
          gte(donationCampaignsTable.expiresAt, now),
          lte(donationCampaignsTable.expiresAt, threshold),
        ),
      );

    for (const campaign of campaigns) {
      await db.insert(userNotificationsTable).values({
        userId: campaign.userId,
        title: "Campagna in scadenza",
        message: `La campagna "${campaign.title}" scade a breve. Puoi rinnovarla dal tuo profilo.`,
        isRead: false,
      });
      await db
        .update(donationCampaignsTable)
        .set({ expiryNotificationSentAt: now, updatedAt: now })
        .where(eq(donationCampaignsTable.id, campaign.id));
    }

    if (campaigns.length > 0) {
      logger.info({ count: campaigns.length }, "[campaignNotifier] Sent expiry notifications");
    }
  } catch (err) {
    logger.error({ err }, "[campaignNotifier] Error sending expiry notifications");
  }
}

function msUntilNextRome2359(): number {
  const now = new Date();
  const today2359 = getRomeExpiryDate(0, now);
  if (today2359.getTime() > now.getTime()) return today2359.getTime() - now.getTime();
  return getRomeExpiryDate(1, now).getTime() - now.getTime();
}

const EVENT_CLEANUP_INTERVAL_MS = 60 * 1000;
const CAMPAIGN_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startEventCleaner(): void {
  deleteExpiredEvents();
  archiveExpiredCampaigns();
  setInterval(deleteExpiredEvents, EVENT_CLEANUP_INTERVAL_MS);
  setInterval(archiveExpiredCampaigns, CAMPAIGN_CLEANUP_INTERVAL_MS);
  setTimeout(() => {
    notifyExpiringCampaigns();
    setInterval(notifyExpiringCampaigns, CAMPAIGN_CLEANUP_INTERVAL_MS);
  }, msUntilNextRome2359());
  logger.info("[eventCleaner] Auto-cleanup scheduler started (events: 60s, campaign archive: 24h, expiry notifications: 23:59 Europe/Rome)");
}
