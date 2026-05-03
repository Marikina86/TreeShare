import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { webhookHandler } from "./routes/donations";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

app.use(cors({ credentials: true, origin: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Troppe richieste. Riprova tra qualche minuto." },
  skip: (req) => req.path === "/api/health",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Troppi tentativi. Riprova tra 15 minuti." },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Troppi upload. Riprova tra qualche minuto." },
});

app.use(globalLimiter);

app.use(
  [
    "/api/auth/signup-user",
    "/api/auth/resend-verification",
    "/api/auth/banned",
    "/api/register-ente",
    "/api/register-ente/resend-verification",
  ],
  authLimiter,
);

app.use("/api/storage/upload-direct", uploadLimiter);

app.post("/api/campaigns/webhook", express.raw({ type: "application/json" }), webhookHandler);
app.post("/api/donations/webhook", express.raw({ type: "application/json" }), webhookHandler);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
