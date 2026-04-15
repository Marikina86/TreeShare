import { pgTable, text, serial, integer, boolean, real, timestamp, index, uniqueIndex, varchar, json } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  username: text("username").notNull(),
  photoUrl: text("photo_url"),
  country: text("country"),
  city: text("city"),
  accountType: text("account_type").notNull().default("user"),
  stripeAccountId: text("stripe_account_id"),
  treesPlanted: integer("trees_planted").notNull().default(0),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const treesTable = pgTable("trees", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  photoThumbnailUrl: text("photo_thumbnail_url"),
  plantName: text("plant_name"),
  caption: text("caption"),
  species: text("species"),
  plantedAt: timestamp("planted_at"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  locationName: text("location_name"),
  country: text("country"),
  province: text("province"),
  mapsUrl: text("maps_url"),
  verificationBypassed: boolean("verification_bypassed").notNull().default(false),
  photoStatus: text("photo_status").notNull().default("pending"),
  sunCount: integer("sun_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("trees_user_id_idx").on(table.userId),
  index("trees_photo_status_idx").on(table.photoStatus),
]);

export const treeUpdatesTable = pgTable("tree_updates", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  userId: text("user_id").notNull(),
  photoUrl: text("photo_url"),
  note: text("note"),
  photoStatus: text("photo_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("tree_updates_tree_id_idx").on(table.treeId),
]);

export const treeSunsTable = pgTable("tree_suns", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("tree_suns_tree_id_idx").on(table.treeId),
  index("tree_suns_user_id_idx").on(table.userId),
]);

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  endDate: text("end_date"),
  endTime: text("end_time"),
  moderationStatus: text("moderation_status").notNull().default("approved"),
  moderationMessage: text("moderation_message"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("events_moderation_status_idx").on(table.moderationStatus),
  index("events_user_id_idx").on(table.userId),
]);

export const eventParticipantsTable = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("normal"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tipsTable = pgTable("tips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const problemReportsTable = pgTable("problem_reports", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("new"),
  adminNote: text("admin_note"),
  repliedAt: timestamp("replied_at"),
  replyText: text("reply_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userNotificationsTable = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("user_notifications_user_id_idx").on(table.userId),
]);

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  ragioneSociale: text("ragione_sociale").notNull(),
  partitaIva: text("partita_iva").notNull().unique(),
  codiceFiscale: text("codice_fiscale").notNull(),
  codiceUnivoco: text("codice_univoco").notNull(),
  formaGiuridica: text("forma_giuridica").notNull(),
  numeroRegistroImprese: text("numero_registro_imprese"),
  indirizzoVia: text("indirizzo_via").notNull(),
  indirizzoCitta: text("indirizzo_citta").notNull(),
  indirizzoCap: text("indirizzo_cap").notNull(),
  indirizzoStato: text("indirizzo_stato").notNull(),
  emailUfficiale: text("email_ufficiale").notNull().unique(),
  telefono: text("telefono").notNull(),
  referenteNome: text("referente_nome").notNull(),
  referenteCognome: text("referente_cognome").notNull(),
  username: text("username").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  ruoloUtente: text("ruolo_utente").notNull(),
  numeroLicenze: integer("numero_licenze").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterUserId: text("reporter_user_id").notNull(),
  reportedUserId: text("reported_user_id"),
  reportedUsername: text("reported_username"),
  treeId: integer("tree_id"),
  eventId: integer("event_id"),
  eventTitle: text("event_title"),
  reason: text("reason").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weeklyWinnersTable = pgTable("weekly_winners", {
  id: serial("id").primaryKey(),
  treeId: integer("tree_id").notNull(),
  userId: text("user_id").notNull(),
  province: text("province").notNull(),
  sunCount: integer("sun_count").notNull(),
  weekStart: timestamp("week_start").notNull(),
});

// ── GDPR ────────────────────────────────────────────────────────────────────

export const policiesTable = pgTable("policies", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "privacy" | "terms"
  version: text("version").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("policies_type_active_idx").on(table.type, table.isActive),
]);

export const userConsentsTable = pgTable("user_consents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  policyId: varchar("policy_id", { length: 36 }).notNull(),
  accepted: boolean("accepted").notNull(),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => [
  index("user_consents_user_id_idx").on(table.userId),
  index("user_consents_policy_id_idx").on(table.policyId),
]);

export const cookieConsentsTable = pgTable("cookie_consents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  necessary: boolean("necessary").notNull().default(true),
  analytics: boolean("analytics").notNull().default(false),
  marketing: boolean("marketing").notNull().default(false),
  preferences: boolean("preferences").notNull().default(false),
  accepted: boolean("accepted").notNull(),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => [
  index("cookie_consents_session_id_idx").on(table.sessionId),
]);

// ── Campaigns (paid publication) ─────────────────────────────────────────────

export const campaignPricingTable = pgTable("campaign_pricing", {
  id: serial("id").primaryKey(),
  durationDays: integer("duration_days").notNull(),
  priceCents: integer("price_cents").notNull(),
  label: text("label").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const donationCampaignsTable = pgTable("donation_campaigns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  photos: json("photos").notNull().default([]),
  durationDays: integer("duration_days"),
  expiresAt: timestamp("expires_at"),
  archivedAt: timestamp("archived_at"),
  storageTier: text("storage_tier").notNull().default("hot"),
  expiryNotificationSentAt: timestamp("expiry_notification_sent_at"),
  inAppExpiryNotifiedAt: timestamp("in_app_expiry_notified_at"),
  paymentStatus: text("payment_status").notNull().default("draft"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paypalOrderId: text("paypal_order_id"),
  renewalStripePaymentIntentId: text("renewal_stripe_payment_intent_id"),
  renewalPaypalOrderId: text("renewal_paypal_order_id"),
  renewalDurationDays: integer("renewal_duration_days"),
  renewalPriceCents: integer("renewal_price_cents"),
  pricePaidCents: integer("price_paid_cents"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("donation_campaigns_user_id_idx").on(table.userId),
  index("donation_campaigns_payment_status_idx").on(table.paymentStatus),
  index("donation_campaigns_expires_at_idx").on(table.expiresAt),
  uniqueIndex("donation_campaigns_stripe_pi_idx").on(table.stripePaymentIntentId),
  uniqueIndex("donation_campaigns_paypal_order_idx").on(table.paypalOrderId),
  uniqueIndex("donation_campaigns_renewal_stripe_pi_idx").on(table.renewalStripePaymentIntentId),
  uniqueIndex("donation_campaigns_renewal_paypal_order_idx").on(table.renewalPaypalOrderId),
]);

export const platformRevenueTable = pgTable("platform_revenue", {
  id: serial("id").primaryKey(),
  totalCommissions: integer("total_commissions").notNull().default(0),
  totalPayoutFees: integer("total_payout_fees").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertTreeSchema = createInsertSchema(treesTable).omit({ id: true, createdAt: true });
export type InsertTree = z.infer<typeof insertTreeSchema>;
export type Tree = typeof treesTable.$inferSelect;

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

export const registerEnteSchema = z.object({
  ragioneSociale: z.string().min(2).max(200),
  partitaIva: z.string().min(11).max(11),
  codiceFiscale: z.string().min(11).max(16),
  codiceUnivoco: z.string().min(6).max(7),
  formaGiuridica: z.string().min(2).max(100),
  numeroRegistroImprese: z.string().max(50).optional(),
  indirizzoVia: z.string().min(2).max(200),
  indirizzoCitta: z.string().min(2).max(100),
  indirizzoCap: z.string().min(5).max(10),
  indirizzoStato: z.string().min(2).max(100),
  emailUfficiale: z.string().email(),
  telefono: z.string().min(7).max(20),
  referenteNome: z.string().min(2).max(100),
  referenteCognome: z.string().min(2).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(100),
  ruoloUtente: z.string().min(2).max(100),
  numeroLicenze: z.coerce.number().int().min(1).max(1000),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: "Devi accettare l'informativa sulla privacy" }) }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Devi accettare i termini e condizioni" }) }),
});

export type RegisterEnte = z.infer<typeof registerEnteSchema>;
