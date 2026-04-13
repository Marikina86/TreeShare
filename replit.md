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
- **On app open**: Inbox fetched once (module-level guard `_inboxFetchedOnce`); events/profile fetched once via react-query cache
- **On pull-to-refresh**: FeedPage dispatches `treeshare:refresh-inbox` event → Layout re-fetches inbox counts
- **On navigation**: Data loaded per-page on first visit, then cached indefinitely until manual refresh
- **Smart feed refresh**: `useFeed` hook checks lightweight `GET /api/trees/feed-meta` before full feed fetch
- **Badge counts**: Shown in nav, only update on app open or manual refresh

### Donation System (Stripe Connect — Destination Charges)
- **Campaign photos**: Max 3 photos per campaign; stored as JSON array of paths in `donation_campaigns.photos`; upload via existing `/api/storage/uploads/request-url` flow; photos shown on campaigns page, profile (DonateSection for visitors, ProfileCampaignSection for owner), and DonationCampaignManager
- **Account types**: Users can be `"user"` (default) or `"organization"` — only orgs can create campaigns
- **Stripe integration**: Uses Replit Stripe connector (NOT env vars); `getUncachableStripeClient()` called fresh each request
- **Stripe Connect model**: Destination charges — 80% goes directly to org's Stripe Connect account, 20% kept by platform as `application_fee_amount`
- **No manual payouts**: Funds route automatically via Stripe Connect; no `request-payout` endpoint, no payout fees, no `org_balances` updates
- **Amounts**: All stored in cents (integer) — `goalAmount`, `amountTotal`, `amountOrg`, `amountPlatform`
- **Ledger tracking**:
  - `platform_revenue` table: `total_commissions` (cumulative 20% application fees), `transaction_count`
  - `ledger_entries` table: Full audit trail — `donation_org_credit`, `donation_platform_fee`
  - `org_balances`, `payouts` tables retained in schema for legacy data but no longer written to
- **Webhook security**: Raw body via `express.raw()` mounted before `express.json()`; strict signature verification; rejects unsigned events
- **Idempotency**: Webhook uses conditional UPDATE (`WHERE status != 'completed'`) — no double-crediting
- **Webhook handler**: Exported as `webhookHandler` from donations.ts, mounted directly in app.ts at `/api/donations/webhook`
- **Admin endpoints**: `GET /api/donations/platform-revenue` (platform earnings), `GET /api/donations/admin-finance` (full overview) — admin-only
- **Frontend**: `DonationCampaignManager` in SettingsPage (org management); `DonateSection` on ProfilePage (visitor donation)
- **Stripe Connect**: Express accounts for orgs; onboarding via account links

### CO₂ Environmental Impact
- Computed client-side from `trees.data` using `plantedAt` field
- Formula: `Σ(years_since_plantedAt × 22 kg)`, fallback to `createdAt` if `plantedAt` null
- Emerald UI card on profile pages; multilingual (6 languages); no new API calls

### Share Feature (Campaigns & Events)
- Reusable `useShare` hook (`src/hooks/useShare.ts`) — uses Web Share API when available, falls back to clipboard copy with toast
- Share buttons on: CampaignsPage cards, EventCard action bar, ProfileCampaignSection
- Accessible to all users (no auth required to share)
- Multilingual toast messages (6 languages)

### Public CampaignsPage
- Route `/campaigns` — public (no auth required), lists active campaigns with sort filters (Recent/Popular/Most funded)
- API: `GET /api/donations/campaigns/active` — public endpoint
- Heart icon in both desktop and mobile headers links to campaigns page

### Organization Signup Email Verification
- Org signup (`POST /api/register-ente`) uses `supabase.auth.signUp()` with ANON key — this actually sends the verification email (unlike `admin.createUser` + `generateLink` which doesn't)
- DB writes (users, organizations, consents) wrapped in a Drizzle transaction; if DB fails, Supabase auth user is cleaned up via `admin.deleteUser()`
- Frontend shows verify step with instructions (check email → click link → sign in) and resend capability
- Resend uses `supabase.auth.resend()` client-side with fallback to `POST /api/register-ente/resend-verification` backend endpoint (also uses anon key `resend`)
- **Login page resend**: When sign-in returns "Email not confirmed", shows a "Rinvia email di verifica" button; uses `supabase.auth.resend()` with backend fallback
- Redirect URLs use server-side `APP_ORIGIN` / `REPLIT_DEV_DOMAIN` env vars for security

### DB Schema (22 tables)
`users`, `trees`, `treeUpdates`, `treeSuns`, `events`, `eventParticipants`, `alerts`, `tips`, `problemReports`, `userNotifications`, `organizations`, `reports`, `weeklyWinners`, `policies`, `userConsents`, `cookieConsents`, `donationCampaigns`, `donations`, `orgBalances`, `payouts`, `platformRevenue`, `ledgerEntries`
