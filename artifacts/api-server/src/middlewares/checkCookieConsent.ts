import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { cookieConsentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

/**
 * Middleware GDPR — verifica se esiste un cookie consent per il sessionId
 * passato nell'header X-Session-Id o nel query param ?sessionId=...
 *
 * Aggiunge a req le proprietà:
 *   req.cookieConsent — oggetto con le preferenze (null se non trovato)
 *   req.hasCookieConsent — boolean
 *
 * Non blocca la richiesta: lascia passare sempre, ma segnala lo stato.
 *
 * Uso:
 *   router.get("/analytics-data", checkCookieConsent, (req, res) => {
 *     if (!req.hasCookieConsent || !req.cookieConsent?.analytics) {
 *       return res.status(403).json({ error: "Analytics consent required" });
 *     }
 *     ...
 *   });
 */

export interface CookieConsentData {
  id: string;
  sessionId: string;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  accepted: boolean;
  acceptedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      cookieConsent: CookieConsentData | null;
      hasCookieConsent: boolean;
    }
  }
}

export const checkCookieConsent = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const sessionId =
    (req.headers["x-session-id"] as string) ||
    (req.query["sessionId"] as string) ||
    null;

  if (!sessionId) {
    req.cookieConsent = null;
    req.hasCookieConsent = false;
    next();
    return;
  }

  try {
    const [latest] = await db
      .select({
        id: cookieConsentsTable.id,
        sessionId: cookieConsentsTable.sessionId,
        necessary: cookieConsentsTable.necessary,
        analytics: cookieConsentsTable.analytics,
        marketing: cookieConsentsTable.marketing,
        preferences: cookieConsentsTable.preferences,
        accepted: cookieConsentsTable.accepted,
        acceptedAt: cookieConsentsTable.acceptedAt,
      })
      .from(cookieConsentsTable)
      .where(eq(cookieConsentsTable.sessionId, sessionId))
      .orderBy(desc(cookieConsentsTable.acceptedAt))
      .limit(1);

    req.cookieConsent = latest ?? null;
    req.hasCookieConsent = !!latest && latest.accepted;
  } catch {
    req.cookieConsent = null;
    req.hasCookieConsent = false;
  }

  next();
};
