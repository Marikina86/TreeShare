import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  adoptableTreesTable,
  treeAdoptionsTable,
  usersTable,
  userNotificationsTable,
  paymentLedgerTable,
} from "@workspace/db";
import { eq, and, desc, lt, lte, gte, isNull, inArray } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe";
import { getRomeExpiryDate } from "../lib/eventCleaner";
import { logger } from "../lib/logger";

function generateAdoptionCode(): string {
  return "ADO-" + randomUUID().replace(/-/g, "").toUpperCase().substring(0, 8);
}

const router = Router();

const PLATFORM_FEE_PCT = 30;

function computeFees(amountCents: number) {
  const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PCT / 100);
  const netToEntityCents = amountCents - platformFeeCents;
  return { platformFeeCents, netToEntityCents };
}

async function getAccountType(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ accountType: usersTable.accountType })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId));
  return user?.accountType ?? null;
}

async function getOwnerStripeAccountId(ownerId: string): Promise<string | null> {
  const [user] = await db
    .select({ stripeAccountId: usersTable.stripeAccountId })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, ownerId));
  return user?.stripeAccountId ?? null;
}

async function isStripeAccountReady(accountId: string): Promise<boolean> {
  try {
    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(accountId);
    return account.charges_enabled === true;
  } catch {
    return false;
  }
}

// ─── Public: list active adoptable trees ─────────────────────────────────────

router.get("/adopt/trees", async (req, res) => {
  try {
    const trees = await db
      .select({
        id: adoptableTreesTable.id,
        ownerId: adoptableTreesTable.ownerId,
        ownerEmail: adoptableTreesTable.ownerEmail,
        title: adoptableTreesTable.title,
        description: adoptableTreesTable.description,
        speciesName: adoptableTreesTable.speciesName,
        locationName: adoptableTreesTable.locationName,
        latitude: adoptableTreesTable.latitude,
        longitude: adoptableTreesTable.longitude,
        imageUrl: adoptableTreesTable.imageUrl,
        thumbnailUrl: adoptableTreesTable.thumbnailUrl,
        productDescription: adoptableTreesTable.productDescription,
        priceCents: adoptableTreesTable.priceCents,
        durationDays: adoptableTreesTable.durationDays,
        maxAdoptions: adoptableTreesTable.maxAdoptions,
        currentAdoptions: adoptableTreesTable.currentAdoptions,
        status: adoptableTreesTable.status,
        paused: adoptableTreesTable.paused,
        createdAt: adoptableTreesTable.createdAt,
        updatedAt: adoptableTreesTable.updatedAt,
        ownerUsername: usersTable.username,
        ownerPhotoUrl: usersTable.photoUrl,
      })
      .from(adoptableTreesTable)
      .leftJoin(usersTable, eq(usersTable.clerkUserId, adoptableTreesTable.ownerId))
      .orderBy(desc(adoptableTreesTable.createdAt));
    res.json(trees.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "[adopt] list trees error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: list my trees ───────────────────────────────────────────────────────

router.get("/adopt/my-trees", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Solo le organizzazioni possono gestire gli alberi" });
      return;
    }
    const trees = await db
      .select()
      .from(adoptableTreesTable)
      .where(eq(adoptableTreesTable.ownerId, userId))
      .orderBy(desc(adoptableTreesTable.createdAt));
    res.json(trees.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "[adopt] my-trees error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Public: tree detail (includes ownerStripeReady) ─────────────────────────

router.get("/adopt/trees/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const [row] = await db
      .select({
        id: adoptableTreesTable.id,
        ownerId: adoptableTreesTable.ownerId,
        ownerEmail: adoptableTreesTable.ownerEmail,
        title: adoptableTreesTable.title,
        description: adoptableTreesTable.description,
        speciesName: adoptableTreesTable.speciesName,
        locationName: adoptableTreesTable.locationName,
        latitude: adoptableTreesTable.latitude,
        longitude: adoptableTreesTable.longitude,
        imageUrl: adoptableTreesTable.imageUrl,
        thumbnailUrl: adoptableTreesTable.thumbnailUrl,
        productDescription: adoptableTreesTable.productDescription,
        priceCents: adoptableTreesTable.priceCents,
        durationDays: adoptableTreesTable.durationDays,
        maxAdoptions: adoptableTreesTable.maxAdoptions,
        currentAdoptions: adoptableTreesTable.currentAdoptions,
        status: adoptableTreesTable.status,
        paused: adoptableTreesTable.paused,
        createdAt: adoptableTreesTable.createdAt,
        updatedAt: adoptableTreesTable.updatedAt,
        ownerUsername: usersTable.username,
        ownerPhotoUrl: usersTable.photoUrl,
      })
      .from(adoptableTreesTable)
      .leftJoin(usersTable, eq(usersTable.clerkUserId, adoptableTreesTable.ownerId))
      .where(eq(adoptableTreesTable.id, id));
    if (!row) { res.status(404).json({ error: "Albero non trovato" }); return; }

    const stripeAccountId = await getOwnerStripeAccountId(row.ownerId);
    let ownerStripeReady = false;
    if (stripeAccountId) {
      ownerStripeReady = await isStripeAccountReady(stripeAccountId);
    }

    res.json({
      ...row,
      ownerStripeReady,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[adopt] tree detail error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: create adoptable tree ───────────────────────────────────────────────

router.post("/adopt/trees", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Solo le organizzazioni possono creare alberi in adozione" });
      return;
    }

    const {
      title, description, speciesName, locationName, latitude, longitude,
      imageUrl, thumbnailUrl, productDescription,
      priceCents, durationDays, maxAdoptions, ownerEmail,
    } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Titolo obbligatorio" }); return;
    }
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      res.status(400).json({ error: "Descrizione obbligatoria" }); return;
    }
    if (!ownerEmail || typeof ownerEmail !== "string") {
      res.status(400).json({ error: "Email dell'ente obbligatoria" }); return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: "Coordinate non valide" }); return;
    }
    const price = Number(priceCents);
    if (isNaN(price) || price < 50) {
      res.status(400).json({ error: "Prezzo minimo 50 centesimi" }); return;
    }
    const days = Number(durationDays);
    if (isNaN(days) || days < 1) {
      res.status(400).json({ error: "Durata minima 1 giorno" }); return;
    }
    const maxAdopt = maxAdoptions !== undefined ? Number(maxAdoptions) : 10;
    if (isNaN(maxAdopt) || maxAdopt < 1 || maxAdopt > 100) {
      res.status(400).json({ error: "maxAdoptions deve essere tra 1 e 100" }); return;
    }

    const [created] = await db
      .insert(adoptableTreesTable)
      .values({
        ownerId: userId,
        ownerEmail: ownerEmail.trim(),
        title: title.trim(),
        description: description.trim(),
        speciesName: speciesName?.trim() || null,
        locationName: locationName?.trim() || null,
        latitude: lat,
        longitude: lng,
        imageUrl: imageUrl?.trim() || null,
        thumbnailUrl: thumbnailUrl?.trim() || null,
        productDescription: productDescription?.trim() || null,
        priceCents: price,
        durationDays: days,
        maxAdoptions: maxAdopt,
        status: "active",
      })
      .returning();

    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "[adopt] create tree error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: update adoptable tree ───────────────────────────────────────────────

router.patch("/adopt/trees/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Solo le organizzazioni possono modificare gli alberi" }); return;
    }
    const [tree] = await db.select().from(adoptableTreesTable).where(eq(adoptableTreesTable.id, id));
    if (!tree) { res.status(404).json({ error: "Albero non trovato" }); return; }
    if (tree.ownerId !== userId) { res.status(403).json({ error: "Non autorizzato" }); return; }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.speciesName !== undefined) updates.speciesName = req.body.speciesName ? String(req.body.speciesName).trim() : null;
    if (req.body.locationName !== undefined) updates.locationName = req.body.locationName ? String(req.body.locationName).trim() : null;
    if (req.body.imageUrl !== undefined) updates.imageUrl = req.body.imageUrl || null;
    if (req.body.thumbnailUrl !== undefined) updates.thumbnailUrl = req.body.thumbnailUrl || null;
    if (req.body.productDescription !== undefined) updates.productDescription = req.body.productDescription?.trim() || null;
    if (req.body.priceCents !== undefined) updates.priceCents = Number(req.body.priceCents);
    if (req.body.durationDays !== undefined) updates.durationDays = Number(req.body.durationDays);
    if (req.body.maxAdoptions !== undefined) updates.maxAdoptions = Number(req.body.maxAdoptions);
    if (req.body.ownerEmail !== undefined) updates.ownerEmail = String(req.body.ownerEmail).trim();

    const [updated] = await db
      .update(adoptableTreesTable)
      .set(updates)
      .where(eq(adoptableTreesTable.id, id))
      .returning();

    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "[adopt] update tree error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: delete adoptable tree ───────────────────────────────────────────────

router.delete("/adopt/trees/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Non autorizzato" }); return;
    }
    const [tree] = await db.select({ ownerId: adoptableTreesTable.ownerId }).from(adoptableTreesTable).where(eq(adoptableTreesTable.id, id));
    if (!tree) { res.status(404).json({ error: "Albero non trovato" }); return; }
    if (tree.ownerId !== userId) { res.status(403).json({ error: "Non autorizzato" }); return; }

    await db.delete(adoptableTreesTable).where(eq(adoptableTreesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[adopt] delete tree error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: pause adoptable tree ────────────────────────────────────────────────

router.patch("/adopt/trees/:id/pause", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") { res.status(403).json({ error: "Non autorizzato" }); return; }
    const [tree] = await db.select({ ownerId: adoptableTreesTable.ownerId }).from(adoptableTreesTable).where(eq(adoptableTreesTable.id, id));
    if (!tree) { res.status(404).json({ error: "Albero non trovato" }); return; }
    if (tree.ownerId !== userId) { res.status(403).json({ error: "Non autorizzato" }); return; }
    const [updated] = await db
      .update(adoptableTreesTable)
      .set({ paused: true, updatedAt: new Date() })
      .where(eq(adoptableTreesTable.id, id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "[adopt] pause tree error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: resume adoptable tree ───────────────────────────────────────────────

router.patch("/adopt/trees/:id/resume", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") { res.status(403).json({ error: "Non autorizzato" }); return; }
    const [tree] = await db.select({ ownerId: adoptableTreesTable.ownerId }).from(adoptableTreesTable).where(eq(adoptableTreesTable.id, id));
    if (!tree) { res.status(404).json({ error: "Albero non trovato" }); return; }
    if (tree.ownerId !== userId) { res.status(403).json({ error: "Non autorizzato" }); return; }
    const [updated] = await db
      .update(adoptableTreesTable)
      .set({ paused: false, updatedAt: new Date() })
      .where(eq(adoptableTreesTable.id, id))
      .returning();
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "[adopt] resume tree error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── User: get my adoptions ───────────────────────────────────────────────────

router.get("/adopt/my-adoptions", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const adoptions = await db
      .select()
      .from(treeAdoptionsTable)
      .where(eq(treeAdoptionsTable.userId, userId))
      .orderBy(desc(treeAdoptionsTable.createdAt));
    res.json(adoptions.map((a) => ({
      ...a,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      expiryNotifiedAt: a.expiryNotifiedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    logger.error({ err }, "[adopt] my-adoptions error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Stripe config ────────────────────────────────────────────────────────────

router.get("/adopt/stripe-config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch {
    res.status(500).json({ error: "Stripe non configurato" });
  }
});

// ─── Stripe Connect: get onboarding URL ──────────────────────────────────────

router.post("/adopt/connect/onboard", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Solo le organizzazioni possono collegarsi a Stripe Connect" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const appOrigin = process.env.APP_ORIGIN
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:19256");

    const rawReturnPath: unknown = req.body.returnPath;
    const safePath =
      typeof rawReturnPath === "string" &&
      rawReturnPath.startsWith("/") &&
      !rawReturnPath.includes("//") &&
      !rawReturnPath.includes(":")
        ? rawReturnPath
        : "/adopt";
    const returnUrl = `${appOrigin}${safePath}?stripe_connect=success`;
    const refreshUrl = `${appOrigin}${safePath}?stripe_connect=refresh`;

    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    let accountId = user?.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await db
        .update(usersTable)
        .set({ stripeAccountId: accountId })
        .where(eq(usersTable.clerkUserId, userId));
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url, accountId });
  } catch (err) {
    logger.error({ err }, "[adopt] connect onboard error");
    res.status(500).json({ error: "Errore interno durante la configurazione di Stripe Connect" });
  }
});

// ─── Stripe Connect: check status ────────────────────────────────────────────

router.get("/adopt/connect/status", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user?.stripeAccountId) {
      res.json({ connected: false, chargesEnabled: false });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    let onboardingUrl: string | undefined;
    if (!account.charges_enabled) {
      const appOrigin = process.env.APP_ORIGIN
        || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:19256");
      const rawReturnPath: unknown = req.query.returnPath;
      const safePath =
        typeof rawReturnPath === "string" &&
        rawReturnPath.startsWith("/") &&
        !rawReturnPath.includes("//") &&
        !rawReturnPath.includes(":")
          ? rawReturnPath
          : "/adopt";
      const link = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${appOrigin}${safePath}?stripe_connect=refresh`,
        return_url: `${appOrigin}${safePath}?stripe_connect=success`,
        type: "account_onboarding",
      });
      onboardingUrl = link.url;
    }

    res.json({
      connected: true,
      chargesEnabled: account.charges_enabled,
      onboardingUrl,
      accountId: user.stripeAccountId,
      detailsSubmitted: account.details_submitted,
    });
  } catch (err) {
    logger.error({ err }, "[adopt] connect status error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── User: initiate adoption payment (Stripe Connect Destination Charge) ──────

router.post("/adopt/initiate", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const accountType = await getAccountType(userId);
    if (accountType === "organization") {
      res.status(403).json({ error: "Le organizzazioni non possono adottare alberi" });
      return;
    }

    const { treeId, selectedDurationDays } = req.body;
    if (!treeId) { res.status(400).json({ error: "treeId obbligatorio" }); return; }

    const [tree] = await db
      .select()
      .from(adoptableTreesTable)
      .where(eq(adoptableTreesTable.id, Number(treeId)));

    if (!tree) { res.status(404).json({ error: "Albero non trovato" }); return; }
    if (tree.paused) {
      res.status(400).json({ error: "Questo albero è attualmente in pausa e non è adottabile" });
      return;
    }
    if (tree.status === "full" || tree.currentAdoptions >= tree.maxAdoptions) {
      res.status(400).json({ error: "Questo albero ha raggiunto il numero massimo di adozioni" });
      return;
    }

    const existingAdoption = await db
      .select({ id: treeAdoptionsTable.id })
      .from(treeAdoptionsTable)
      .where(
        and(
          eq(treeAdoptionsTable.userId, userId),
          eq(treeAdoptionsTable.treeId, tree.id),
          eq(treeAdoptionsTable.status, "active"),
        ),
      );
    if (existingAdoption.length > 0) {
      res.status(400).json({ error: "Hai già un'adozione attiva per questo albero" });
      return;
    }

    const orgStripeAccountId = await getOwnerStripeAccountId(tree.ownerId);
    if (!orgStripeAccountId) {
      res.status(400).json({
        error: "L'ente non ha ancora attivato i pagamenti Stripe. Contatta l'organizzazione.",
        code: "ORG_STRIPE_NOT_CONFIGURED",
      });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(orgStripeAccountId);
    if (!account.charges_enabled) {
      res.status(400).json({
        error: "L'ente non ha completato la configurazione dei pagamenti Stripe.",
        code: "ORG_STRIPE_NOT_READY",
      });
      return;
    }

    const reqDays = selectedDurationDays ? Number(selectedDurationDays) : tree.durationDays;
    const safeDays = Math.max(1, reqDays);
    const pricePerDay = tree.priceCents / tree.durationDays;
    const calculatedCents = Math.round(pricePerDay * safeDays);
    const amount = Math.max(50, calculatedCents);
    const { platformFeeCents, netToEntityCents } = computeFees(amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: orgStripeAccountId,
      },
      metadata: {
        type: "tree_adoption",
        userId,
        treeId: String(tree.id),
        treeName: tree.title,
        durationDays: String(safeDays),
        amountCents: String(amount),
        platformFeeCents: String(platformFeeCents),
        netToEntityCents: String(netToEntityCents),
        orgStripeAccountId,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      priceCents: amount,
      platformFeeCents,
      netToEntityCents,
      durationDays: safeDays,
      treeName: tree.title,
    });
  } catch (err) {
    logger.error({ err }, "[adopt] initiate error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── User: confirm adoption after payment ─────────────────────────────────────

router.post("/adopt/confirm", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) { res.status(400).json({ error: "paymentIntentId obbligatorio" }); return; }

    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      res.status(400).json({ error: "Pagamento non ancora completato", stripeStatus: pi.status });
      return;
    }
    if (pi.metadata?.userId !== userId) {
      res.status(403).json({ error: "Pagamento non appartiene a questo utente" });
      return;
    }
    if (pi.metadata?.type !== "tree_adoption") {
      res.status(400).json({ error: "Tipo di pagamento non valido" });
      return;
    }

    const existingAdoption = await db
      .select({ id: treeAdoptionsTable.id })
      .from(treeAdoptionsTable)
      .where(eq(treeAdoptionsTable.stripePaymentIntentId, paymentIntentId));
    if (existingAdoption.length > 0) {
      res.json({ idempotent: true, adoptionId: existingAdoption[0].id });
      return;
    }

    const treeId = Number(pi.metadata.treeId);
    const durationDays = Number(pi.metadata.durationDays);
    const amountCents = Number(pi.metadata.amountCents);
    const platformFeeCents = Number(pi.metadata.platformFeeCents);
    const netToEntityCents = Number(pi.metadata.netToEntityCents);
    const treeName = pi.metadata.treeName;

    const result = await db.transaction(async (tx) => {
      const [tree] = await tx
        .select()
        .from(adoptableTreesTable)
        .where(eq(adoptableTreesTable.id, treeId));

      if (!tree) return { error: "Albero non trovato" };
      if (tree.currentAdoptions >= tree.maxAdoptions) {
        return { error: "Albero pieno: numero massimo di adozioni raggiunto" };
      }

      const startDate = new Date();
      const endDate = getRomeExpiryDate(durationDays, startDate);

      const adoptionCode = generateAdoptionCode();

      const [adoption] = await tx
        .insert(treeAdoptionsTable)
        .values({
          adoptionCode,
          userId,
          treeId,
          treeName,
          durationDays,
          startDate,
          endDate,
          amountCents,
          platformFeeCents,
          netToEntityCents,
          stripePaymentIntentId: paymentIntentId,
          status: "active",
        })
        .returning();

      const newCount = tree.currentAdoptions + 1;
      const newStatus = newCount >= tree.maxAdoptions ? "full" : "active";

      await tx
        .update(adoptableTreesTable)
        .set({ currentAdoptions: newCount, status: newStatus, updatedAt: new Date() })
        .where(eq(adoptableTreesTable.id, treeId));

      await tx.insert(paymentLedgerTable).values([
        {
          type: "adoption_payment",
          amountCents,
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntentId,
          userId,
          entityUserId: tree.ownerId,
          adoptionId: adoption.id,
          description: `Adozione albero: ${treeName}`,
        },
        {
          type: "platform_commission",
          amountCents: platformFeeCents,
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentIntentId,
          userId,
          entityUserId: tree.ownerId,
          adoptionId: adoption.id,
          description: `Commissione piattaforma 30%: ${treeName}`,
        },
      ]);

      return { success: true, adoptionId: adoption.id, adoptionCode, endDate: endDate.toISOString(), treeName: tree.title, ownerEmail: tree.ownerEmail };
    });

    if ((result as any).error) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    logger.error({ err }, "[adopt] confirm error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── User: submit shipping data ───────────────────────────────────────────────

router.post("/adopt/my-adoptions/:id/shipping", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const [adoption] = await db
      .select()
      .from(treeAdoptionsTable)
      .where(and(eq(treeAdoptionsTable.id, id), eq(treeAdoptionsTable.userId, userId)));
    if (!adoption) { res.status(404).json({ error: "Adozione non trovata" }); return; }

    const { fullName, phone, address, city, postalCode, country, notes } = req.body;
    if (!fullName || typeof fullName !== "string") {
      res.status(400).json({ error: "Nome completo obbligatorio" }); return;
    }
    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "Indirizzo obbligatorio" }); return;
    }
    if (!city || typeof city !== "string") {
      res.status(400).json({ error: "Città obbligatoria" }); return;
    }
    if (!country || typeof country !== "string") {
      res.status(400).json({ error: "Paese obbligatorio" }); return;
    }

    const shippingData = JSON.stringify({
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      address: address.trim(),
      city: city.trim(),
      postalCode: postalCode?.trim() || null,
      country: country.trim(),
      notes: notes?.trim() || null,
      submittedAt: new Date().toISOString(),
    });

    await db
      .update(treeAdoptionsTable)
      .set({ shippingData, orgStatus: "pending_shipping", userName: fullName.trim(), userPhone: phone?.trim() || null })
      .where(eq(treeAdoptionsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[adopt] shipping data error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: list adoptions for my trees ────────────────────────────────────────

router.get("/adopt/org/adoptions", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Accesso riservato alle organizzazioni" }); return;
    }

    const myTrees = await db
      .select({ id: adoptableTreesTable.id, title: adoptableTreesTable.title })
      .from(adoptableTreesTable)
      .where(eq(adoptableTreesTable.ownerId, userId));

    if (myTrees.length === 0) {
      res.json([]); return;
    }

    const treeIds = myTrees.map((t) => t.id);
    const treeMap = Object.fromEntries(myTrees.map((t) => [t.id, t.title]));

    const adoptions = await db
      .select()
      .from(treeAdoptionsTable)
      .where(inArray(treeAdoptionsTable.treeId, treeIds))
      .orderBy(desc(treeAdoptionsTable.createdAt));

    res.json(adoptions.map((a) => ({
      ...a,
      treeTitle: treeMap[a.treeId] ?? a.treeName,
      shippingData: a.shippingData ? JSON.parse(a.shippingData) : null,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      expiryNotifiedAt: a.expiryNotifiedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    logger.error({ err }, "[adopt] org adoptions error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Org: update adoption org-status ─────────────────────────────────────────

router.patch("/adopt/org/adoptions/:id/status", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const accountType = await getAccountType(userId);
    if (accountType !== "organization") {
      res.status(403).json({ error: "Accesso riservato alle organizzazioni" }); return;
    }

    const { orgStatus } = req.body;
    const validStatuses = ["pending_shipping", "shipping_received", "shipped"];
    if (!orgStatus || !validStatuses.includes(orgStatus)) {
      res.status(400).json({ error: `Stato non valido. Valori ammessi: ${validStatuses.join(", ")}` }); return;
    }

    const [adoption] = await db
      .select({ id: treeAdoptionsTable.id, treeId: treeAdoptionsTable.treeId })
      .from(treeAdoptionsTable)
      .where(eq(treeAdoptionsTable.id, id));
    if (!adoption) { res.status(404).json({ error: "Adozione non trovata" }); return; }

    const [tree] = await db
      .select({ ownerId: adoptableTreesTable.ownerId })
      .from(adoptableTreesTable)
      .where(eq(adoptableTreesTable.id, adoption.treeId));
    if (!tree || tree.ownerId !== userId) {
      res.status(403).json({ error: "Non autorizzato" }); return;
    }

    await db
      .update(treeAdoptionsTable)
      .set({ orgStatus })
      .where(eq(treeAdoptionsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[adopt] update org status error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── Scheduled jobs (exported for eventCleaner) ───────────────────────────────

export async function expireTreeAdoptions(): Promise<void> {
  try {
    const now = new Date();
    const expired = await db
      .select({ id: treeAdoptionsTable.id, treeId: treeAdoptionsTable.treeId, userId: treeAdoptionsTable.userId, treeName: treeAdoptionsTable.treeName })
      .from(treeAdoptionsTable)
      .where(
        and(
          eq(treeAdoptionsTable.status, "active"),
          lt(treeAdoptionsTable.endDate, now),
        ),
      );

    if (expired.length === 0) return;

    await db
      .update(treeAdoptionsTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(treeAdoptionsTable.status, "active"),
          lt(treeAdoptionsTable.endDate, now),
        ),
      );

    const treeCountDeltas: Record<number, number> = {};
    for (const a of expired) {
      treeCountDeltas[a.treeId] = (treeCountDeltas[a.treeId] ?? 0) + 1;
    }

    for (const [treeId, delta] of Object.entries(treeCountDeltas)) {
      const id = Number(treeId);
      const [tree] = await db
        .select({ currentAdoptions: adoptableTreesTable.currentAdoptions, maxAdoptions: adoptableTreesTable.maxAdoptions })
        .from(adoptableTreesTable)
        .where(eq(adoptableTreesTable.id, id));
      if (!tree) continue;
      const newCount = Math.max(0, tree.currentAdoptions - delta);
      const newStatus = newCount < tree.maxAdoptions ? "active" : "full";
      await db
        .update(adoptableTreesTable)
        .set({ currentAdoptions: newCount, status: newStatus, updatedAt: new Date() })
        .where(eq(adoptableTreesTable.id, id));
    }

    logger.info({ count: expired.length }, "[adoptCleaner] Expired adoptions processed");
  } catch (err) {
    logger.error({ err }, "[adoptCleaner] Error expiring adoptions");
  }
}

export async function notifyExpiringAdoptions(): Promise<void> {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiring = await db
      .select()
      .from(treeAdoptionsTable)
      .where(
        and(
          eq(treeAdoptionsTable.status, "active"),
          gte(treeAdoptionsTable.endDate, now),
          lte(treeAdoptionsTable.endDate, tomorrow),
          isNull(treeAdoptionsTable.expiryNotifiedAt),
        ),
      );

    for (const a of expiring) {
      await db.insert(userNotificationsTable).values({
        userId: a.userId,
        title: "Adozione in scadenza",
        message: `La tua adozione dell'albero "${a.treeName}" scade entro 24 ore.`,
        isRead: false,
      });
      await db
        .update(treeAdoptionsTable)
        .set({ expiryNotifiedAt: now })
        .where(eq(treeAdoptionsTable.id, a.id));
    }

    if (expiring.length > 0) {
      logger.info({ count: expiring.length }, "[adoptCleaner] Expiry notifications sent");
    }
  } catch (err) {
    logger.error({ err }, "[adoptCleaner] Error sending expiry notifications");
  }
}

export default router;
