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

### Notification Strategy (no real-time push)
- **SSE disabled**: `useAlertSSE` hook is a no-op — no EventSource connections, no browser Notification API
- **No polling**: The 30-second `/api/inbox` polling interval has been removed
- **On app open**: Inbox (alerts, notifications, tips) is fetched once when the Layout mounts
- **On pull-to-refresh**: FeedPage dispatches `treeshare:refresh-inbox` event, which triggers Layout to re-fetch inbox counts
- **Badge counts**: Still shown in nav, but only update on app open or manual refresh

### Feed Performance Optimization
- **QueryClient**: `staleTime: Infinity`, all auto-refetch disabled (focus, mount, reconnect, interval)
- **Smart refresh**: `useFeed` hook checks lightweight `GET /api/trees/feed-meta` (returns `{total, lastUpdatedAt}`) before fetching full feed
- **Pull-to-refresh**: Touch-based on mobile, button on desktop — both use smart refresh + inbox refresh
- **Cache version control**: `lastUpdatedAt` compared between server meta and cached meta; full feed fetch only if changed

### DB Schema (16 tables)
`users`, `trees`, `treeUpdates`, `treeSuns`, `events`, `eventParticipants`, `alerts`, `tips`, `problemReports`, `userNotifications`, `organizations`, `reports`, `weeklyWinners`, `policies`, `userConsents`, `cookieConsents`
