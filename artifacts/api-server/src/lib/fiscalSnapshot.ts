import { db } from "@workspace/db";
import { usersTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@workspace/db/schema";

export interface FiscalSnapshot {
  entityUserId: string;
  entityUserName: string | null;
  entityDenominazione: string | null;
  entityIndirizzo: string | null;
  entityPartitaIva: string | null;
  entityCodiceFiscale: string | null;
  entityCodiceUnivoco: string | null;
  entityEmail: string | null;
  entityTelefono: string | null;
  entityReferente: string | null;
}

/**
 * Fetches and freezes the fiscal data for a given clerkUserId at payment time.
 * Must be called inside a DB transaction (pass `tx`) or outside with `db`.
 */
export async function fetchFiscalSnapshot(
  clerkUserId: string,
  tx: NodePgDatabase<typeof schema> = db,
): Promise<FiscalSnapshot> {
  const [user] = await tx
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (!user) {
    return {
      entityUserId: clerkUserId,
      entityUserName: null,
      entityDenominazione: null,
      entityIndirizzo: null,
      entityPartitaIva: null,
      entityCodiceFiscale: null,
      entityCodiceUnivoco: null,
      entityEmail: null,
      entityTelefono: null,
      entityReferente: null,
    };
  }

  if (user.accountType === "organization") {
    const [org] = await tx
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.username, user.username));

    if (org) {
      const indirizzo = [
        org.indirizzoVia,
        org.indirizzoCap,
        org.indirizzoCitta,
        org.indirizzoStato,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        entityUserId: clerkUserId,
        entityUserName: user.username,
        entityDenominazione: org.ragioneSociale,
        entityIndirizzo: indirizzo,
        entityPartitaIva: org.partitaIva,
        entityCodiceFiscale: org.codiceFiscale,
        entityCodiceUnivoco: org.codiceUnivoco,
        entityEmail: org.emailUfficiale,
        entityTelefono: org.telefono,
        entityReferente: `${org.referenteNome} ${org.referenteCognome}`.trim(),
      };
    }
  }

  return {
    entityUserId: clerkUserId,
    entityUserName: user.username,
    entityDenominazione: user.username,
    entityIndirizzo: [user.city, user.country].filter(Boolean).join(", ") || null,
    entityPartitaIva: null,
    entityCodiceFiscale: null,
    entityCodiceUnivoco: null,
    entityEmail: null,
    entityTelefono: null,
    entityReferente: null,
  };
}
