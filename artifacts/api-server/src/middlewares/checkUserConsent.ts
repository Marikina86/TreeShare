import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { userConsentsTable, policiesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { type AuthenticatedRequest } from "./requireAuth";

/**
 * Middleware GDPR — verifica che l'utente autenticato abbia accettato
 * tutte le versioni attive di Privacy Policy e Termini e Condizioni.
 *
 * Se una policy è stata modificata dall'admin dopo l'ultimo consenso
 * dell'utente (lastModifiedAt > acceptedAt), il consenso è considerato
 * scaduto e l'accesso viene bloccato.
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
            // Se la policy è stata modificata dopo l'ultimo consenso, il consenso
            // è invalidato: l'utente deve ri-approvare.
            policy.lastModifiedAt ? gte(userConsentsTable.acceptedAt, policy.lastModifiedAt) : undefined,
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
    req.log.error({ err }, "[checkUserConsent] Errore nella verifica consensi");
    // In caso di errore DB, non blocchiamo l'utente
    next();
  }
};
