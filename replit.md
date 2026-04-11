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
- Clerk (`@clerk/react`) for authentication — requires `VITE_CLERK_PUBLISHABLE_KEY` env var
- Wouter for routing
- TanStack Query + generated API client hooks (`@workspace/api-client-react`)
- Tailwind CSS + Radix UI (shadcn/ui components)
- Leaflet for maps
- Framer Motion for animations
- i18n: Italian, English, French, Portuguese, Spanish, Japanese

### API Server Features
- Clerk JWT auth via JWKS (no secret key needed for dev, JWKS URL hardcoded to `humane-cod-19.clerk.accounts.dev`)
- Trees, users, events, alerts, tips, notifications, reports, admin, map, storage, organizations, weekly winners routes
- Image uploads: Cloudinary (optional) or local `uploads/` folder
- Plant verification: Google Gemini AI (`GEMINI_API_KEY`)
- Scheduled jobs: event cleanup, weekly winner selection

### Environment Variables Required
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (pk_test_... or pk_live_...) — set as shared env var
- `GEMINI_API_KEY` — (optional) for AI plant verification
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — (optional) for cloud image uploads

### GDPR Consent System
- DB tables: `policies`, `user_consents`, `cookie_consents`
- Active policies: Privacy v1.0, Terms v1.0 (Italian content)
- Consent enforced for both private users (Clerk-based, `userId` = clerk ID) and organizations (`userId` = `org:<orgId>`)
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

### Donation System (Stripe) — Fund Separation Architecture
- **Account types**: Users can be `"user"` (default) or `"organization"` — only orgs can create campaigns
- **Stripe integration**: Uses Replit Stripe connector (NOT env vars); `getUncachableStripeClient()` called fresh each request
- **Platform model**: Platform collects all funds; 20% platform fee, 80% to org; payout fee €5.00 (500 cents)
- **Amounts**: All stored in cents (integer) — `goalAmount`, `amountTotal`, `amountOrg`, `amountPlatform`
- **FUND SEPARATION** (critical design constraint):
  - `org_balances` table: ONLY org data — `total_org_received` (cumulative 80% share), `available_balance`, `total_paid_out`
  - `platform_revenue` table: ONLY platform data — `total_commissions` (cumulative 20% fees), `total_payout_fees`, `transaction_count`
  - `ledger_entries` table: Full audit trail — every credit/debit logged with `entry_type`, `amount_cents`, `org_user_id`, `donation_id`/`payout_id`, `description`
  - Org balance NEVER includes platform commission; platform revenue NEVER includes org funds
  - Payouts calculated ONLY from `available_balance` (org funds); platform fee deducted and credited to `platform_revenue.total_payout_fees`
  - Ledger entry types: `donation_org_credit`, `donation_platform_fee`, `payout_org`, `payout_fee_platform`
- **Webhook security**: Raw body via `express.raw()` mounted before `express.json()`; strict signature verification; rejects unsigned events
- **Idempotency**: Webhook uses conditional UPDATE (`WHERE status != 'completed'`) — no double-crediting
- **Payout safety**: Atomic balance deduction via conditional UPDATE with balance rollback if Stripe transfer fails; min payout €6.00 (balance must cover fee)
- **Webhook handler**: Exported as `webhookHandler` from donations.ts, mounted directly in app.ts at `/api/donations/webhook`
- **Admin endpoints**: `GET /api/donations/platform-revenue` (platform earnings), `GET /api/donations/audit` (full ledger) — admin-only
- **Frontend**: `DonationCampaignManager` in SettingsPage (org management); `DonateSection` on ProfilePage (visitor donation)
- **Stripe Connect**: Express accounts for orgs; onboarding via account links

### CO₂ Environmental Impact
- Computed client-side from `trees.data` using `plantedAt` field
- Formula: `Σ(years_since_plantedAt × 22 kg)`, fallback to `createdAt` if `plantedAt` null
- Emerald UI card on profile pages; multilingual (6 languages); no new API calls

### Public CampaignsPage
- Route `/campaigns` — public (no auth required), lists active campaigns with sort filters (Recent/Popular/Most funded)
- API: `GET /api/donations/campaigns/active` — public endpoint
- Heart icon in both desktop and mobile headers links to campaigns page

### DB Schema (22 tables)
`users`, `trees`, `treeUpdates`, `treeSuns`, `events`, `eventParticipants`, `alerts`, `tips`, `problemReports`, `userNotifications`, `organizations`, `reports`, `weeklyWinners`, `policies`, `userConsents`, `cookieConsents`, `donationCampaigns`, `donations`, `orgBalances`, `payouts`, `platformRevenue`, `ledgerEntries`
