import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { cookieConsentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";

const router = Router();

const SaveCookieConsentSchema = z.object({
  sessionId: z.string().min(1).max(128),
  necessary: z.boolean().default(true),
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  preferences: z.boolean().default(false),
  accepted: z.boolean(),
});

const UpdateCookieConsentSchema = z.object({
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  preferences: z.boolean().optional(),
});

// POST /cookie-consent — salva o aggiorna le preferenze cookie
// Funziona anche per utenti non autenticati (solo sessionId)
router.post("/cookie-consent", async (req, res) => {
  const parsed = SaveCookieConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  // Recupera userId se l'utente è autenticato (opzionale — non blocca la richiesta)
  const userId = (req as AuthenticatedRequest).userId ?? null;

  try {
    // Inserisce sempre un nuovo record (storico completo — non sovrascrive mai)
    const [record] = await db
      .insert(cookieConsentsTable)
      .values({
        userId,
        sessionId: parsed.data.sessionId,
        necessary: true, // necessary è sempre true
        analytics: parsed.data.analytics,
        marketing: parsed.data.marketing,
        preferences: parsed.data.preferences,
        accepted: parsed.data.accepted,
        ipAddress,
        userAgent,
      })
      .returning();

    res.status(201).json({
      message: "Preferenze cookie salvate",
      consent: record,
    });
  } catch (err) {
    req.log.error({ err }, "Errore nel salvataggio del cookie consent");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// GET /cookie-consent/:sessionId — recupera le preferenze cookie più recenti per sessione
router.get("/cookie-consent/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || sessionId.length > 128) {
    res.status(400).json({ error: "sessionId non valido" });
    return;
  }

  try {
    const [latest] = await db
      .select()
      .from(cookieConsentsTable)
      .where(eq(cookieConsentsTable.sessionId, sessionId))
      .orderBy(desc(cookieConsentsTable.acceptedAt))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "Nessuna preferenza cookie trovata per questa sessione" });
      return;
    }

    res.json(latest);
  } catch (err) {
    req.log.error({ err }, "Errore nel recupero del cookie consent");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

// PATCH /cookie-consent/:sessionId — aggiorna preferenze (aggiunge nuovo record storico)
router.patch("/cookie-consent/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  const parsed = UpdateCookieConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dati non validi", details: parsed.error.flatten() });
    return;
  }

  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;
  const userId = (req as AuthenticatedRequest).userId ?? null;

  try {
    // Recupera il record più recente per questa sessione
    const [current] = await db
      .select()
      .from(cookieConsentsTable)
      .where(eq(cookieConsentsTable.sessionId, sessionId))
      .orderBy(desc(cookieConsentsTable.acceptedAt))
      .limit(1);

    if (!current) {
      res.status(404).json({ error: "Nessuna preferenza cookie trovata per questa sessione" });
      return;
    }

    // Inserisce nuovo record con i valori aggiornati (storico)
    const [updated] = await db
      .insert(cookieConsentsTable)
      .values({
        userId: userId ?? current.userId,
        sessionId,
        necessary: true,
        analytics: parsed.data.analytics ?? current.analytics,
        marketing: parsed.data.marketing ?? current.marketing,
        preferences: parsed.data.preferences ?? current.preferences,
        accepted: true,
        ipAddress,
        userAgent,
      })
      .returning();

    res.json({ message: "Preferenze cookie aggiornate", consent: updated });
  } catch (err) {
    req.log.error({ err }, "Errore nell'aggiornamento del cookie consent");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
