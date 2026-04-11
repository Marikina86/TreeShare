import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { organizationsTable, registerEnteSchema, userConsentsTable, policiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/register-ente", async (req, res) => {
  const parsed = registerEnteSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (field) fieldErrors[field] = issue.message;
    }
    res.status(400).json({ error: "Dati non validi", fields: fieldErrors });
    return;
  }

  const data = parsed.data;

  try {
    const existing = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.username, data.username))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        error: "Username già in uso",
        fields: { username: "Questo username è già registrato." },
      });
      return;
    }

    const existingEmail = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.emailUfficiale, data.emailUfficiale))
      .limit(1);

    if (existingEmail.length > 0) {
      res.status(409).json({
        error: "Email già registrata",
        fields: { emailUfficiale: "Questa email è già associata a un ente." },
      });
      return;
    }

    const existingPiva = await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.partitaIva, data.partitaIva))
      .limit(1);

    if (existingPiva.length > 0) {
      res.status(409).json({
        error: "Partita IVA già registrata",
        fields: { partitaIva: "Questa Partita IVA è già registrata." },
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const [org] = await db
      .insert(organizationsTable)
      .values({
        ragioneSociale: data.ragioneSociale,
        partitaIva: data.partitaIva,
        codiceFiscale: data.codiceFiscale,
        codiceUnivoco: data.codiceUnivoco.toUpperCase(),
        formaGiuridica: data.formaGiuridica,
        numeroRegistroImprese: data.numeroRegistroImprese ?? null,
        indirizzoVia: data.indirizzoVia,
        indirizzoCitta: data.indirizzoCitta,
        indirizzoCap: data.indirizzoCap,
        indirizzoStato: data.indirizzoStato,
        emailUfficiale: data.emailUfficiale,
        telefono: data.telefono,
        referenteNome: data.referenteNome,
        referenteCognome: data.referenteCognome,
        username: data.username,
        hashedPassword,
        ruoloUtente: data.ruoloUtente,
        numeroLicenze: data.numeroLicenze,
      })
      .returning();

    const orgUserId = `org:${org!.id}`;
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;

    const activePolicies = await db
      .select({ id: policiesTable.id, type: policiesTable.type })
      .from(policiesTable)
      .where(eq(policiesTable.isActive, true));

    const privacyPolicy = activePolicies.find((p) => p.type === "privacy");
    const termsPolicy = activePolicies.find((p) => p.type === "terms");

    const consentRecords: { userId: string; policyId: string; accepted: boolean; ipAddress: string | null; userAgent: string | null }[] = [];
    if (privacyPolicy) consentRecords.push({ userId: orgUserId, policyId: privacyPolicy.id, accepted: true, ipAddress, userAgent });
    if (termsPolicy) consentRecords.push({ userId: orgUserId, policyId: termsPolicy.id, accepted: true, ipAddress, userAgent });

    if (consentRecords.length > 0) {
      await db.insert(userConsentsTable).values(consentRecords);
    }

    res.status(201).json({
      id: org!.id,
      ragioneSociale: org!.ragioneSociale,
      username: org!.username,
      emailUfficiale: org!.emailUfficiale,
      createdAt: org!.createdAt.toISOString(),
    });
  } catch (err) {
    req.log?.error?.({ err }, "Error registering organization");
    res.status(500).json({ error: "Errore interno del server" });
  }
});

export default router;
