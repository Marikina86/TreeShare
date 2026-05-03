# Deploy su VPS

## Build

```bash
# Frontend
pnpm --filter @workspace/treeshare run build
# Output: artifacts/treeshare/dist/public/

# API server (opzionale — per verificare che compili)
pnpm --filter @workspace/api-server run build
```

## Variabili d'ambiente richieste (API server)

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=8080
NODE_ENV=production
```

## Variabili d'ambiente frontend (build-time)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Reverse proxy

Scegli uno tra:
- **nginx** → vedi `nginx.conf.example`
- **Caddy** → vedi `Caddyfile.example`

Caddy è più semplice da configurare (SSL automatico, nessun Certbot necessario).

## Processo API server (PM2)

```bash
npm install -g pm2
pm2 start artifacts/api-server/dist/index.js --name treeshare-api
pm2 save
pm2 startup
```

## Dependency audit (CI/CD)

```bash
pnpm audit --audit-level=moderate
```

Aggiungilo come step nel tuo pipeline (GitHub Actions, GitLab CI, ecc.) prima del deploy.
