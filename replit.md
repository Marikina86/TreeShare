# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: TreeShare

A plant/tree sharing social app. Community members document trees/plants they plant with GPS-precise location, photos, and a world map.

### Artifacts
- **TreeShare frontend** (`artifacts/treeshare`) — React + Vite, port 19256, preview path `/`
- **API Server** (`artifacts/api-server`) — Express 5, port 8080

### Frontend Stack
- React 19 + Vite
- Supabase Auth (`@supabase/supabase-js`) for authentication — requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- Wouter for routing
- TanStack Query + generated API client hooks (`@workspace/api-client-react`)
- Tailwind CSS + Radix UI (shadcn/ui components)
- Leaflet for maps
- Framer Motion for animations
- i18n: Italian, English, French, Portuguese, Spanish, Japanese

### API Server Features
- Supabase JWT auth via HMAC-SHA256 (`SUPABASE_JWT_SECRET`); `sub` claim = Supabase UUID stored in `usersTable.clerkUserId` column
- Trees, users, events, alerts, tips, notifications, reports, admin, map, storage, organizations, weekly winners routes
- Image uploads: Cloudinary (optional) or local `uploads/` folder
- Plant verification: Google Gemini AI (`GEMINI_API_KEY`)
- Scheduled jobs: event cleanup, weekly winner selection

### Environment Variables Required
- `VITE_SUPABASE_URL` — Supabase project URL — set as shared env var
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key — set as shared env var
- `SUPABASE_JWT_SECRET` — Supabase JWT secret for backend token verification
- `GEMINI_API_KEY` — (optional) for AI plant verification
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — (optional) for cloud image uploads

### GDPR Consent System
- DB tables: `policies`, `user_consents`, `cookie_consents`
- Active policies: Privacy v1.0, Terms v1.0 (Italian content)
- Consent enforced for both private users (Supabase-based, `userId` = Supabase UUID) and organizations (`userId` = `org:<orgId>`)
- Endpoints: `GET /policies/:type`, `POST /consent`, `GET /consent/status`, `DELETE /consent/:policyId`, `GET /users/:id/consents`
- Cookie consent: `POST /cookie-consent`, `GET /cookie-consent/:sessionId`, `PATCH /cookie-consent/:sessionId`

### Zero-Polling Architecture
- **No SSE**: `useAlertSSE` hook is a no-op — no EventSource connections, no browser Notification API
- **No polling**: All `setInterval`-based server polling removed (inbox 30s, events 60s, map 60s)
- **No auto-refetch**: Global `QueryClient` has `staleTime: Infinity`, all auto-refetch disabled (focus, mount, reconnect, interval)
- **On app open**: Inbox fetched once (module-level guard `_inboxFetchedOnce`); profile fetched once via react-query cache
- **Single inbox endpoint**: `GET /api/inbox` now returns alerts + notifications + tips + events (for badge counts) — Layout no longer uses `useListEvents` separately
- **On pull-to-refresh**: FeedPage dispatches `treeshare:refresh-inbox` event → Layout re-fetches inbox counts
- **On navigation**: Data loaded per-page on first visit, then cached indefinitely until manual refresh
- **Smart feed refresh**: `useFeed` hook checks lightweight `GET /api/trees/feed-meta` before full feed fetch
- **Badge counts**: Shown in nav, only update on app open or manual refresh

### Campaign System (Paid Publication Model)
- **Model**: Organizations pay the platform to publish campaigns for a selectable duration. No donations, no Stripe Connect destination charges.
- **Campaign photos**: Max 3 photos per campaign; stored as JSON array in `donation_campaigns.photos`; upload via `/api/storage/uploads/request-url`
- **Account types**: Users `"user"` (default) or `"organization"` — only orgs can create campaigns
- **Stripe integration**: Uses Replit Stripe connector; `getUncachableStripeClient()` called fresh each request; simple PaymentIntents to platform (no Connect accounts)
- **Pricing**: Admin-managed `campaign_pricing` table with duration/price tiers; orgs select a tier when publishing
- **Campaign lifecycle**: form → initiate-payment (pending row in DB, invisible to user) → Stripe payment → confirm-payment (activates campaign, sets `expiresAt`) or failed
- **Auto-deletion**: Expired campaigns (`expiresAt < now`) are automatically deleted every 60s by `eventCleaner.ts` scheduler
- **Amounts**: All stored in cents (integer) — `pricePaidCents` on campaigns, `priceCents` on pricing tiers
- **Revenue tracking**: `platform_revenue` table: `total_commissions` (cumulative campaign payments), `transaction_count`
- **Payment Ledger**: `payment_ledger` table — immutable audit trail for all settled payments. Types: `campaign_activation`, `campaign_renewal`, `adoption_payment`, `platform_commission`, `refund`. Inserted inside the same DB transaction as activation/adoption confirm. Soft-delete only (admin sets `deletedAt`+`deletedBy`); no automatic cleanup.
  - `GET /api/admin/payment-ledger` — returns all active entries + summary stats (totalCents, commissionCents, campaignCents, adoptionCents, refundCents)
  - `POST /api/admin/payment-ledger/refund` — creates a refund entry manually, optionally linked to an existing entry via `linkedLedgerId`; copies fiscal snapshot from linked entry
  - `DELETE /api/admin/payment-ledger/:id` — soft-delete; sets `deletedAt` + `deletedBy` (admin userId)
  - `GET /api/admin/ledger/billing/:entityUserId` — returns current billing data for an entity user (fallback for old entries)
  - Per ogni adozione: 2 righe ledger (pagamento utente + commissione piattaforma 30%)
  - **Fiscal snapshot**: 8 columns embedded at payment time (entityDenominazione, entityIndirizzo, entityPartitaIva, entityCodiceFiscale, entityCodiceUnivoco, entityEmail, entityTelefono, entityReferente) via `fetchFiscalSnapshot()` helper. Refunds inherit snapshot from linked entry.
  - **`linkedLedgerId`**: foreign key on `payment_ledger.id` for refund→original link
  - Admin UI: tab "Ledger" nel pannello admin — 5 summary cards (totale/campagne/adozioni/commissioni/rimborsi), filtro per tipo incl. rimborsi, billing modal mostra dati congelati, bottone rimborso per ogni voce (apre modal con form)
- **Webhook**: `payment_intent.succeeded` activates campaign + records revenue; `payment_intent.payment_failed` marks campaign failed; mounted at `/api/campaigns/webhook` and `/api/donations/webhook`
- **Idempotency**: Unique index on `stripePaymentIntentId`; `activateCampaign()` shared helper checks `paymentStatus !== 'paid'` — no double-crediting
- **Admin endpoints**: CRUD for campaign pricing (`POST/PATCH/DELETE /api/donations/admin/campaign-pricing`); `GET /api/donations/admin/finance` (revenue overview + pricing tiers)
- **Admin pricing management**: Full CRUD in finance tab — create, edit, enable/disable, delete pricing tiers; each tier has label, durationDays, priceCents, isActive
- **Frontend**: `DonationCampaignManager` in SettingsPage — 3-step flow (details → plan → payment); only paid campaigns shown in "my campaigns" list; `ProfileCampaignSection` on ProfilePage (display only); `CampaignsPage` lists active campaigns (display + share)
- **Removed**: DonateSection, MyDonationsSection, Stripe Connect onboarding, donations/orgBalances/payouts/ledgerEntries tables

### CO₂ Environmental Impact
- Computed client-side from `trees.data` using `plantedAt` field
- Formula: `Σ(years_since_plantedAt × 22 kg)`, fallback to `createdAt` if `plantedAt` null
- Emerald UI card on profile pages; multilingual (6 languages); no new API calls

### Share Feature (Campaigns & Events)
- Reusable `useShare` hook (`src/hooks/useShare.ts`) — uses Web Share API when available, falls back to clipboard copy with toast
- Share buttons on: CampaignsPage cards, EventCard action bar, ProfileCampaignSection
- Accessible to all users (no auth required to share)
- Multilingual toast messages (6 languages)

### Event Moderation
- New and edited events are saved with `moderationStatus = "pending"` and are not listed publicly until approved.
- Existing events remain approved by default when the moderation columns are added.
- Admin review endpoints: `GET /api/admin/events/pending`, `PATCH /api/admin/events/:eventId/approve`, `PATCH /api/admin/events/:eventId/reject`.
- Admin approval/rejection supports an optional message; the event creator receives it as a personal notification in the Avvisi page.

### Public CampaignsPage
- Route `/campaigns` — public (no auth required), lists active paid campaigns
- API: `GET /api/donations/campaigns/active` — public endpoint (only shows paid + not-expired)
- Heart icon in both desktop and mobile headers links to campaigns page

### Organization Signup Email Verification
- Org signup (`POST /api/register-ente`) uses `admin.createUser()` + `admin.generateLink()` with service role key
- DB writes (users, organizations, consents) wrapped in a Drizzle transaction; if DB fails, Supabase auth user is cleaned up via `admin.deleteUser()`
- Frontend shows verify step with instructions (check email → click link → sign in) and resend capability
- Resend uses `supabase.auth.resend()` client-side with fallback to `POST /api/register-ente/resend-verification` backend endpoint (also uses anon key `resend`)
- **Login page resend**: When sign-in returns "Email not confirmed", shows a "Rinvia email di verifica" button; uses `supabase.auth.resend()` with backend fallback
- Redirect URLs use server-side `APP_ORIGIN` / `REPLIT_DEV_DOMAIN` env vars for security

### DB Schema (18 tables)
`users`, `trees`, `treeUpdates`, `treeSuns`, `events`, `eventParticipants`, `alerts`, `tips`, `problemReports`, `userNotifications`, `organizations`, `reports`, `weeklyWinners`, `policies`, `userConsents`, `cookieConsents`, `donationCampaigns`, `campaignPricing`, `platformRevenue`
