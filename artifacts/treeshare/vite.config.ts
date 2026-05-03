import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

function cspPlugin(): Plugin {
  const BASE = [
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com https://*.tile.openstreetmap.org https://server.arcgisonline.com https://unpkg.com",
    "frame-src https://js.stripe.com",
    "worker-src 'self' blob:",
  ];
  const STRICT_CSP = [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.com",
    ...BASE,
  ].join("; ");
  const DEV_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
    "connect-src 'self' ws: wss: https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://m.stripe.com",
    ...BASE,
  ].join("; ");

  const setHeader = (csp: string) => (_req: any, res: any, next: () => void) => {
    res.setHeader("Content-Security-Policy", csp);
    next();
  };
  return {
    name: "csp-headers",
    configureServer(server) { server.middlewares.use(setHeader(DEV_CSP)); },
    configurePreviewServer(server) { server.middlewares.use(setHeader(STRICT_CSP)); },
  };
}

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  define: {
    // Espone i domini Replit al frontend come costanti compile-time (non sono segreti)
    __REPLIT_DEV_DOMAIN__: JSON.stringify(process.env.REPLIT_DEV_DOMAIN ?? ""),
    __REPLIT_DOMAINS__: JSON.stringify(process.env.REPLIT_DOMAINS ?? ""),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    cspPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "leaflet";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "framer-motion";
          }
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "tanstack";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      // SSE endpoint: timeout 0 + no buffering
      "/api/alerts/sse": {
        target: "http://localhost:8080",
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on("proxyRes", (_proxyRes, _req, res) => {
            res.setHeader("X-Accel-Buffering", "no");
          });
        },
      },
      // Tutto il resto dell'API
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
