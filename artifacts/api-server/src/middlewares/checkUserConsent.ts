import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { userConsentsTable, policiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { type AuthenticatedRequest } from "./requireAuth";

/**
 * Middleware GDPR — verifica che l'utente autenticato abbia accettato
 * tutte le versioni attive di Privacy Policy e Termini e Condizioni.
 *
 * Se mancano consensi, risponde con 403 e l'elenco delle policy da accettare.
 *
 * Uso:
 *   router.post("/some-protected-route", requireAuth, checkUserConsent, handler);
 */
export const checkUserConsent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  if (!userId) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }

  try {
    // Recupera tutte le policy attive
    const activePolicies = await db
      .select()
      .from(policiesTable)
      .where(eq(policiesTable.isActive, true));

    if (activePolicies.length === 0) {
      // Nessuna policy attiva: non c'è nulla da verificare
      next();
      return;
    }

    const missing: { policyId: string; type: string; version: string }[] = [];

    for (const policy of activePolicies) {
      const [consent] = await db
        .select({ id: userConsentsTable.id })
        .from(userConsentsTable)
        .where(
          and(
            eq(userConsentsTable.userId, userId),
            eq(userConsentsTable.policyId, policy.id),
            eq(userConsentsTable.accepted, true),
          )
        )
        .limit(1);

      if (!consent) {
        missing.push({
          policyId: policy.id,
          type: policy.type,
          version: policy.version,
        });
      }
    }

    if (missing.length > 0) {
      res.status(403).json({
        error: "Consenso richiesto",
        code: "CONSENT_REQUIRED",
        missing,
      });
      return;
    }

    next();
  } catch (err) {
    console.error("[checkUserConsent] Errore:", err);
    // In caso di errore DB, non blocchiamo l'utente
    next();
  }
};
