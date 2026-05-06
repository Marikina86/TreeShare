import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  treesTable,
  donationCampaignsTable,
  campaignPricingTable,
  platformRevenueTable,
  discountCodesTable,
  discountCodeUsesTable,
  paymentLedgerTable,
} from "@workspace/db";
import { eq, and, desc, sql, gt, gte, lte, count, ilike } from "drizzle-orm";
import { fetchFiscalSnapshot } from "../lib/fiscalSnapshot";
import { computeDiscountedCents } from "./discountCodes";
import { isCampaignsEnabled } from "../lib/appSettings";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe";
import {
  isPayPalConfigured,
  getPayPalClientId,
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhookSignature,
} from "../lib/paypal";
import { getRomeExpiryDate } from "../lib/eventCleaner";

const MAX_CAMPAIGN_PHOTOS = 10;
const CO2_KG_PER_TREE = 21;

type CampaignPhoto = string | {
  standard: string;
  thumbnail?: string;
  original?: string;
  storageTier?: "hot" | "cold";
};

function normalizeCampaignPhotos(photos: unknown): CampaignPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos.slice(0, MAX_CAMPAIGN_PHOTOS).filter((photo): photo is CampaignPhoto => {
    if (typeof photo === "string") return photo.trim().length > 0;
    if (!photo || typeof photo !== "object") return false;
    const value = photo as Record<string, unknown>;
    return typeof value.standard === "string" && value.standard.trim().length > 0;
  }).map((photo) => {
    if (typeof photo === "string") return photo;
    return {
      standard: photo.standard,
      thumbnail: photo.thumbnail,
      original: photo.original,
      storageTier: photo.storageTier === "cold" ? "cold" : "hot",
    };
  });
}

async function getCampaignEnvironmentalStats(userId: string) {
  const [row] = await db
    .select({ treesPlanted: count() })
    .from(treesTable)
    .where(and(eq(treesTable.userId, userId), eq(treesTable.photoStatus, "approved")));
  const treesPlanted = Number(row?.treesPlanted ?? 0);
  return {
    treesPlanted,
    co2Kg: treesPlanted * CO2_KG_PER_TREE,
  };
}

async function enrichCampaign<T extends { userId: string; photos?: unknown; storageTier?: string }>(campaign: T) {
  const stats = await getCampaignEnvironmentalStats(campaign.userId);
  const photos = normalizeCampaignPhotos(campaign.photos).map((photo) => {
    if (typeof photo === "string") return photo;
    return { ...photo, storageTier: campaign.storageTier === "cold" ? "cold" : photo.storageTier };
  });
  return { ...campaign, photos, ...stats };
}

async function enrichCampaigns<T extends { userId: string; photos?: unknown; storageTier?: string }>(campaigns: T[]) {
  return Promise.all(campaigns.map((campaign) => enrichCampaign(campaign)));
}

async function ensurePlatformRevenueRow(tx: any) {
  const [existing] = await tx.select({ id: platformRevenueTable.id }).from(platformRevenueTable).where(eq(platformRevenueTable.id, 1));
  if (!existing) {
    await tx.insert(platformRevenueTable).values({
      totalCommissions: 0,
      totalPayoutFees: 0,
      transactionCount: 0,
    });
  }
}

async function activateCampaign(
  campaignId: number,
  piId: string,
  discountInfo: { codeId: number; userKey: string } | null = null,
) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.stripePaymentIntentId, piId),
        ),
      );

    if (!campaign) return { error: "not_found" };
    if (campaign.paymentStatus === "paid") return { idempotent: true, campaignId: campaign.id };

    // ── Atomic discount use recording (inside transaction = race-safe) ───────
    if (discountInfo) {
      const [alreadyUsed] = await tx
        .select({ id: discountCodeUsesTable.id })
        .from(discountCodeUsesTable)
        .where(
          and(
            eq(discountCodeUsesTable.discountCodeId, discountInfo.codeId),
            eq(discountCodeUsesTable.userKey, discountInfo.userKey),
          ),
        );
      if (alreadyUsed) return { error: "discount_used" };
      await tx
        .insert(discountCodeUsesTable)
        .values({ discountCodeId: discountInfo.codeId, userKey: discountInfo.userKey, campaignId: campaign.id });
      await tx
        .update(discountCodesTable)
        .set({ useCount: sql`${discountCodesTable.useCount} + 1` })
        .where(eq(discountCodesTable.id, discountInfo.codeId));
    }

    const durationDays = campaign.durationDays || 30;
    const expiresAt = getRomeExpiryDate(durationDays);

    await tx
      .update(donationCampaignsTable)
      .set({
        paymentStatus: "paid",
        isActive: true,
        archivedAt: null,
        storageTier: "hot",
        inAppExpiryNotifiedAt: null,
        expiryNotificationSentAt: null,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    await ensurePlatformRevenueRow(tx);

    const pricePaid = campaign.pricePaidCents || 0;
    await tx
      .update(platformRevenueTable)
      .set({
        totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${pricePaid}`,
        transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(platformRevenueTable.id, 1));

    const fiscalActivation = await fetchFiscalSnapshot(campaign.userId, tx);

    await tx.insert(paymentLedgerTable).values({
      type: "campaign_activation",
      amountCents: pricePaid,
      paymentMethod: "stripe",
      stripePaymentIntentId: piId,
      userId: campaign.userId,
      ...fiscalActivation,
      campaignId: campaign.id,
      description: `Attivazione campagna: ${campaign.title}`,
    });

    return { success: true, campaignId: campaign.id, expiresAt: expiresAt.toISOString(), durationDays };
  });
}

async function renewCampaign(campaignId: number, piId: string) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.renewalStripePaymentIntentId, piId),
        ),
      );

    if (!campaign) return { error: "not_found" };
    const durationDays = campaign.renewalDurationDays || campaign.durationDays || 30;
    const baseDate = campaign.expiresAt && campaign.expiresAt > new Date() ? campaign.expiresAt : new Date();
    const expiresAt = getRomeExpiryDate(durationDays, baseDate);

    await tx
      .update(donationCampaignsTable)
      .set({
        paymentStatus: "paid",
        isActive: true,
        archivedAt: null,
        storageTier: "hot",
        expiresAt,
        durationDays,
        pricePaidCents: campaign.renewalPriceCents ?? campaign.pricePaidCents,
        expiryNotificationSentAt: null,
        inAppExpiryNotifiedAt: null,
        renewalStripePaymentIntentId: null,
        renewalDurationDays: null,
        renewalPriceCents: null,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    await ensurePlatformRevenueRow(tx);
    const pricePaid = campaign.renewalPriceCents || 0;
    await tx
      .update(platformRevenueTable)
      .set({
        totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${pricePaid}`,
        transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(platformRevenueTable.id, 1));

    const fiscalRenewal = await fetchFiscalSnapshot(campaign.userId, tx);

    await tx.insert(paymentLedgerTable).values({
      type: "campaign_renewal",
      amountCents: pricePaid,
      paymentMethod: "stripe",
      stripePaymentIntentId: piId,
      userId: campaign.userId,
      ...fiscalRenewal,
      campaignId: campaign.id,
      description: `Rinnovo campagna: ${campaign.title}`,
    });

    return { success: true, campaignId: campaign.id, expiresAt: expiresAt.toISOString(), durationDays };
  });
}

async function activateCampaignByPayPalOrder(
  campaignId: number,
  orderId: string,
  discountInfo: { codeId: number; userKey: string } | null = null,
) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.paypalOrderId, orderId),
        ),
      );

    if (!campaign) return { error: "not_found" };
    if (campaign.paymentStatus === "paid") return { idempotent: true, campaignId: campaign.id };

    // ── Atomic discount use recording (inside transaction = race-safe) ───────
    if (discountInfo) {
      const [alreadyUsed] = await tx
        .select({ id: discountCodeUsesTable.id })
        .from(discountCodeUsesTable)
        .where(
          and(
            eq(discountCodeUsesTable.discountCodeId, discountInfo.codeId),
            eq(discountCodeUsesTable.userKey, discountInfo.userKey),
          ),
        );
      if (alreadyUsed) return { error: "discount_used" };
      await tx
        .insert(discountCodeUsesTable)
        .values({ discountCodeId: discountInfo.codeId, userKey: discountInfo.userKey, campaignId: campaign.id });
      await tx
        .update(discountCodesTable)
        .set({ useCount: sql`${discountCodesTable.useCount} + 1` })
        .where(eq(discountCodesTable.id, discountInfo.codeId));
    }

    const durationDays = campaign.durationDays || 30;
    const expiresAt = getRomeExpiryDate(durationDays);

    await tx
      .update(donationCampaignsTable)
      .set({
        paymentStatus: "paid",
        isActive: true,
        archivedAt: null,
        storageTier: "hot",
        inAppExpiryNotifiedAt: null,
        expiryNotificationSentAt: null,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    await ensurePlatformRevenueRow(tx);
    const pricePaid = campaign.pricePaidCents || 0;
    await tx
      .update(platformRevenueTable)
      .set({
        totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${pricePaid}`,
        transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(platformRevenueTable.id, 1));

    const fiscalPpActivation = await fetchFiscalSnapshot(campaign.userId, tx);

    await tx.insert(paymentLedgerTable).values({
      type: "campaign_activation",
      amountCents: pricePaid,
      paymentMethod: "paypal",
      paypalOrderId: orderId,
      userId: campaign.userId,
      ...fiscalPpActivation,
      campaignId: campaign.id,
      description: `Attivazione campagna (PayPal): ${campaign.title}`,
    });

    return { success: true, campaignId: campaign.id, expiresAt: expiresAt.toISOString(), durationDays };
  });
}

async function renewCampaignByPayPalOrder(campaignId: number, orderId: string) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.renewalPaypalOrderId, orderId),
        ),
      );

    if (!campaign) return { error: "not_found" };

    const durationDays = campaign.renewalDurationDays || campaign.durationDays || 30;
    const baseDate = campaign.expiresAt && campaign.expiresAt > new Date() ? campaign.expiresAt : new Date();
    const expiresAt = getRomeExpiryDate(durationDays, baseDate);

    await tx
      .update(donationCampaignsTable)
      .set({
        paymentStatus: "paid",
        isActive: true,
        archivedAt: null,
        storageTier: "hot",
        expiresAt,
        durationDays,
        pricePaidCents: campaign.renewalPriceCents ?? campaign.pricePaidCents,
        expiryNotificationSentAt: null,
        inAppExpiryNotifiedAt: null,
        renewalPaypalOrderId: null,
        renewalDurationDays: null,
        renewalPriceCents: null,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    await ensurePlatformRevenueRow(tx);
    const pricePaid = campaign.renewalPriceCents || 0;
    await tx
      .update(platformRevenueTable)
      .set({
        totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${pricePaid}`,
        transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(platformRevenueTable.id, 1));

    const fiscalPpRenewal = await fetchFiscalSnapshot(campaign.userId, tx);

    await tx.insert(paymentLedgerTable).values({
      type: "campaign_renewal",
      amountCents: pricePaid,
      paymentMethod: "paypal",
      paypalOrderId: orderId,
      userId: campaign.userId,
      ...fiscalPpRenewal,
      campaignId: campaign.id,
      description: `Rinnovo campagna (PayPal): ${campaign.title}`,
    });

    return { success: true, campaignId: campaign.id, expiresAt: expiresAt.toISOString(), durationDays };
  });
}

const router = Router();

router.get("/campaigns/stripe-config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    console.error("[campaigns] stripe-config error:", err);
    res.status(500).json({ error: "Stripe not configured" });
  }
});

router.get("/campaigns/paypal-config", async (_req, res) => {
  try {
    if (!isPayPalConfigured()) {
      res.status(503).json({ error: "PayPal not configured", available: false });
      return;
    }
    const clientId = await getPayPalClientId();
    res.json({
      clientId,
      available: true,
      environment: process.env.PAYPAL_ENV === "production" ? "production" : "sandbox",
    });
  } catch (err) {
    console.error("[campaigns] paypal-config error:", err);
    res.status(500).json({ error: "PayPal config failed", available: false });
  }
});

router.get("/campaigns/pricing", async (_req, res) => {
  try {
    const pricing = await db
      .select()
      .from(campaignPricingTable)
      .where(eq(campaignPricingTable.isActive, true))
      .orderBy(campaignPricingTable.durationDays);
    res.json(pricing);
  } catch (err) {
    console.error("[campaigns] pricing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/campaign-pricing", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { durationDays, priceCents, label } = req.body;
    if (!durationDays || !priceCents || !label) {
      res.status(400).json({ error: "durationDays, priceCents, label required" });
      return;
    }
    const [created] = await db
      .insert(campaignPricingTable)
      .values({
        durationDays: Number(durationDays),
        priceCents: Number(priceCents),
        label: String(label).trim(),
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error("[campaigns] create pricing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/campaign-pricing/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updates: Record<string, any> = {};
    if (req.body.durationDays !== undefined) updates.durationDays = Number(req.body.durationDays);
    if (req.body.priceCents !== undefined) updates.priceCents = Number(req.body.priceCents);
    if (req.body.label !== undefined) updates.label = String(req.body.label).trim();
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

    const [updated] = await db
      .update(campaignPricingTable)
      .set(updates)
      .where(eq(campaignPricingTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Pricing not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error("[campaigns] update pricing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/campaign-pricing/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(campaignPricingTable).where(eq(campaignPricingTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("[campaigns] delete pricing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/my-campaigns", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
        ),
      )
      .orderBy(desc(donationCampaignsTable.createdAt));
    res.json(await enrichCampaigns(campaigns));
  } catch (err) {
    console.error("[campaigns] my-campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function resolveDiscountCode(
  code: string,
  userId: string,
  originalCents: number,
): Promise<
  | { discountCodeId: number; finalCents: number; savedCents: number }
  | { error: string; status: number }
> {
  const now = new Date();
  const [dc] = await db
    .select()
    .from(discountCodesTable)
    .where(
      and(
        eq(discountCodesTable.code, code.trim().toUpperCase()),
        eq(discountCodesTable.isActive, true),
        gt(discountCodesTable.expiresAt, now),
      ),
    );
  if (!dc) return { error: "Codice sconto non valido o scaduto", status: 400 };
  if (dc.maxUses !== null && dc.useCount >= dc.maxUses) {
    return { error: "Codice sconto esaurito", status: 400 };
  }
  const userKey = `user:${userId}`;
  const [alreadyUsed] = await db
    .select()
    .from(discountCodeUsesTable)
    .where(and(eq(discountCodeUsesTable.discountCodeId, dc.id), eq(discountCodeUsesTable.userKey, userKey)));
  if (alreadyUsed) return { error: "Hai già utilizzato questo codice sconto", status: 400 };

  const finalCents = computeDiscountedCents(originalCents, dc.discountType, dc.discountValue);
  return { discountCodeId: dc.id, finalCents, savedCents: originalCents - finalCents };
}


router.post("/campaigns/initiate-payment", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    if (!(await isCampaignsEnabled())) {
      res.status(503).json({ error: "La pubblicazione di campagne è temporaneamente disabilitata dall'amministratore." });
      return;
    }

    const [user] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations can create campaigns" });
      return;
    }

    const { title, description, photos, pricingId, discountCode, comune, provincia } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description required" });
      return;
    }
    if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 200) {
      res.status(400).json({ error: "Title must be 1-200 characters" });
      return;
    }
    if (typeof description !== "string" || description.trim().length === 0 || description.trim().length > 2000) {
      res.status(400).json({ error: "Description must be 1-2000 characters" });
      return;
    }
    if (Array.isArray(photos) && photos.length > MAX_CAMPAIGN_PHOTOS) {
      res.status(400).json({ error: `Maximum ${MAX_CAMPAIGN_PHOTOS} photos allowed` });
      return;
    }
    const finalPhotos = normalizeCampaignPhotos(photos);
    if (!pricingId) {
      res.status(400).json({ error: "pricingId required" });
      return;
    }

    const [pricing] = await db
      .select()
      .from(campaignPricingTable)
      .where(
        and(
          eq(campaignPricingTable.id, Number(pricingId)),
          eq(campaignPricingTable.isActive, true),
        ),
      );

    if (!pricing) {
      res.status(404).json({ error: "Pricing option not found" });
      return;
    }

    let finalPriceCents = pricing.priceCents;
    let appliedDiscountCodeId: number | null = null;
    let discountAppliedCents = 0;

    if (discountCode && typeof discountCode === "string" && discountCode.trim()) {
      const discountResult = await resolveDiscountCode(discountCode, userId, pricing.priceCents);
      if ("error" in discountResult) {
        res.status(discountResult.status).json({ error: discountResult.error });
        return;
      }
      finalPriceCents = discountResult.finalCents;
      appliedDiscountCodeId = discountResult.discountCodeId;
      discountAppliedCents = discountResult.savedCents;
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(50, finalPriceCents),
      currency: "eur",
      metadata: {
        userId,
        pricingId: String(pricing.id),
        durationDays: String(pricing.durationDays),
        priceCents: String(pricing.priceCents),
        finalPriceCents: String(finalPriceCents),
        discountCodeId: appliedDiscountCodeId ? String(appliedDiscountCodeId) : "",
        type: "campaign_publication",
      },
    });

    const [pendingCampaign] = await db
      .insert(donationCampaignsTable)
      .values({
        userId,
        title: title.trim(),
        description: description.trim(),
        photos: finalPhotos,
        isActive: false,
        paymentStatus: "pending",
        stripePaymentIntentId: paymentIntent.id,
        durationDays: pricing.durationDays,
        pricePaidCents: finalPriceCents,
        discountCodeId: appliedDiscountCodeId,
        discountAppliedCents: discountAppliedCents > 0 ? discountAppliedCents : null,
        comune: typeof comune === "string" && comune.trim() ? comune.trim() : null,
        provincia: typeof provincia === "string" && provincia.trim() ? provincia.trim() : null,
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      campaignId: pendingCampaign.id,
      priceCents: finalPriceCents,
      originalPriceCents: pricing.priceCents,
      savedCents: discountAppliedCents,
      durationDays: pricing.durationDays,
      label: pricing.label,
    });
  } catch (err) {
    console.error("[campaigns] initiate-payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/activate-free", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations can create campaigns" });
      return;
    }

    const { title, description, photos, pricingId, discountCode, comune, provincia } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description required" });
      return;
    }
    if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 200) {
      res.status(400).json({ error: "Title must be 1-200 characters" });
      return;
    }
    if (typeof description !== "string" || description.trim().length === 0 || description.trim().length > 2000) {
      res.status(400).json({ error: "Description must be 1-2000 characters" });
      return;
    }
    if (Array.isArray(photos) && photos.length > MAX_CAMPAIGN_PHOTOS) {
      res.status(400).json({ error: `Maximum ${MAX_CAMPAIGN_PHOTOS} photos allowed` });
      return;
    }
    if (!pricingId) {
      res.status(400).json({ error: "pricingId required" });
      return;
    }
    if (!discountCode || typeof discountCode !== "string" || !discountCode.trim()) {
      res.status(400).json({ error: "discountCode required for free activation" });
      return;
    }

    const [pricing] = await db
      .select()
      .from(campaignPricingTable)
      .where(
        and(
          eq(campaignPricingTable.id, Number(pricingId)),
          eq(campaignPricingTable.isActive, true),
        ),
      );
    if (!pricing) {
      res.status(404).json({ error: "Pricing option not found" });
      return;
    }

    const discountResult = await resolveDiscountCode(discountCode, userId, pricing.priceCents);
    if ("error" in discountResult) {
      res.status(discountResult.status).json({ error: discountResult.error });
      return;
    }
    if (discountResult.finalCents !== 0) {
      res.status(400).json({ error: "This endpoint is only for 100% discount codes" });
      return;
    }

    const finalPhotos = normalizeCampaignPhotos(photos);
    const userKey = `user:${userId}`;
    const durationDays = pricing.durationDays;
    const expiresAt = getRomeExpiryDate(durationDays);

    const result = await db.transaction(async (tx) => {
      const [alreadyUsed] = await tx
        .select({ id: discountCodeUsesTable.id })
        .from(discountCodeUsesTable)
        .where(
          and(
            eq(discountCodeUsesTable.discountCodeId, discountResult.discountCodeId),
            eq(discountCodeUsesTable.userKey, userKey),
          ),
        );
      if (alreadyUsed) return { error: "discount_used" };

      const [campaign] = await tx
        .insert(donationCampaignsTable)
        .values({
          userId,
          title: title.trim(),
          description: description.trim(),
          photos: finalPhotos,
          isActive: true,
          paymentStatus: "paid",
          stripePaymentIntentId: `free_${Date.now()}`,
          durationDays,
          pricePaidCents: 0,
          discountCodeId: discountResult.discountCodeId,
          discountAppliedCents: discountResult.savedCents,
          expiresAt,
          comune: typeof comune === "string" && comune.trim() ? comune.trim() : null,
          provincia: typeof provincia === "string" && provincia.trim() ? provincia.trim() : null,
        })
        .returning();

      await tx.insert(discountCodeUsesTable).values({
        discountCodeId: discountResult.discountCodeId,
        userKey,
        campaignId: campaign.id,
      });
      await tx
        .update(discountCodesTable)
        .set({ useCount: sql`${discountCodesTable.useCount} + 1` })
        .where(eq(discountCodesTable.id, discountResult.discountCodeId));

      await ensurePlatformRevenueRow(tx);
      await tx
        .update(platformRevenueTable)
        .set({
          transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(platformRevenueTable.id, 1));

      const fiscalActivation = await fetchFiscalSnapshot(userId, tx);
      await tx.insert(paymentLedgerTable).values({
        type: "campaign_activation",
        amountCents: 0,
        paymentMethod: "discount_100",
        userId,
        ...fiscalActivation,
        campaignId: campaign.id,
        description: `Attivazione gratuita campagna (100% sconto): ${campaign.title}`,
      });

      return { success: true, campaignId: campaign.id };
    });

    if (!result.success) {
      res.status(400).json({ error: result.error === "discount_used" ? "Hai già utilizzato questo codice sconto" : "Activation failed" });
      return;
    }

    res.json({
      campaignId: result.campaignId,
      expiresAt: expiresAt.toISOString(),
      durationDays,
      savedCents: discountResult.savedCents,
    });
  } catch (err) {
    req.log.error({ err }, "[campaigns] activate-free error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/confirm-payment", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      res.status(400).json({ error: "paymentIntentId required" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      res.status(400).json({ error: "Payment not yet succeeded", stripeStatus: paymentIntent.status });
      return;
    }

    if (paymentIntent.metadata?.userId !== userId) {
      res.status(403).json({ error: "Payment does not belong to this user" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(eq(donationCampaignsTable.stripePaymentIntentId, paymentIntentId));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const discountInfo = campaign.discountCodeId
      ? { codeId: campaign.discountCodeId, userKey: `user:${userId}` }
      : null;

    const result = await activateCampaign(campaign.id, paymentIntentId, discountInfo);

    if ((result as any).error === "discount_used") {
      res.status(400).json({ error: "Hai già utilizzato questo codice sconto" });
      return;
    }
    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    console.error("[campaigns] confirm-payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/initiate-payment-paypal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    if (!(await isCampaignsEnabled())) {
      res.status(503).json({ error: "La pubblicazione di campagne è temporaneamente disabilitata dall'amministratore." });
      return;
    }

    if (!isPayPalConfigured()) {
      res.status(503).json({ error: "PayPal not configured" });
      return;
    }

    const [user] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations can create campaigns" });
      return;
    }

    const { title, description, photos, pricingId, discountCode, comune, provincia } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description required" });
      return;
    }
    if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 200) {
      res.status(400).json({ error: "Title must be 1-200 characters" });
      return;
    }
    if (typeof description !== "string" || description.trim().length === 0 || description.trim().length > 2000) {
      res.status(400).json({ error: "Description must be 1-2000 characters" });
      return;
    }
    if (Array.isArray(photos) && photos.length > MAX_CAMPAIGN_PHOTOS) {
      res.status(400).json({ error: `Maximum ${MAX_CAMPAIGN_PHOTOS} photos allowed` });
      return;
    }
    const finalPhotos = normalizeCampaignPhotos(photos);
    if (!pricingId) {
      res.status(400).json({ error: "pricingId required" });
      return;
    }

    const [pricing] = await db
      .select()
      .from(campaignPricingTable)
      .where(and(eq(campaignPricingTable.id, Number(pricingId)), eq(campaignPricingTable.isActive, true)));

    if (!pricing) {
      res.status(404).json({ error: "Pricing option not found" });
      return;
    }

    let finalPriceCents = pricing.priceCents;
    let appliedDiscountCodeId: number | null = null;
    let discountAppliedCents = 0;

    if (discountCode && typeof discountCode === "string" && discountCode.trim()) {
      const discountResult = await resolveDiscountCode(discountCode, userId, pricing.priceCents);
      if ("error" in discountResult) {
        res.status(discountResult.status).json({ error: discountResult.error });
        return;
      }
      finalPriceCents = discountResult.finalCents;
      appliedDiscountCodeId = discountResult.discountCodeId;
      discountAppliedCents = discountResult.savedCents;
    }

    const customId = `campaign_pub_${userId}_${Date.now()}`;
    const { orderId } = await createPayPalOrder(
      Math.max(1, finalPriceCents),
      "EUR",
      customId,
      title.trim(),
    );

    const [pendingCampaign] = await db
      .insert(donationCampaignsTable)
      .values({
        userId,
        title: title.trim(),
        description: description.trim(),
        photos: finalPhotos,
        isActive: false,
        paymentStatus: "pending",
        paypalOrderId: orderId,
        durationDays: pricing.durationDays,
        pricePaidCents: finalPriceCents,
        discountCodeId: appliedDiscountCodeId,
        discountAppliedCents: discountAppliedCents > 0 ? discountAppliedCents : null,
        comune: typeof comune === "string" && comune.trim() ? comune.trim() : null,
        provincia: typeof provincia === "string" && provincia.trim() ? provincia.trim() : null,
      })
      .returning();

    res.json({
      orderId,
      campaignId: pendingCampaign.id,
      priceCents: finalPriceCents,
      originalPriceCents: pricing.priceCents,
      savedCents: discountAppliedCents,
      durationDays: pricing.durationDays,
      label: pricing.label,
    });
  } catch (err) {
    console.error("[campaigns] initiate-payment-paypal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/confirm-payment-paypal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { orderId, campaignId } = req.body;
    if (!orderId || !campaignId) {
      res.status(400).json({ error: "orderId and campaignId required" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, Number(campaignId)),
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paypalOrderId, orderId),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found or not authorized" });
      return;
    }

    if (campaign.paymentStatus === "paid") {
      res.json({ idempotent: true, campaignId: campaign.id });
      return;
    }

    const { captured, status } = await capturePayPalOrder(orderId);

    if (!captured) {
      res.status(400).json({ error: "PayPal order not completed", paypalStatus: status });
      return;
    }

    const discountInfo = campaign.discountCodeId
      ? { codeId: campaign.discountCodeId, userKey: `user:${userId}` }
      : null;

    const result = await activateCampaignByPayPalOrder(Number(campaignId), orderId, discountInfo);

    if ((result as any).error === "discount_used") {
      res.status(400).json({ error: "Hai già utilizzato questo codice sconto" });
      return;
    }
    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    console.error("[campaigns] confirm-payment-paypal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/campaigns/:campaignId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || req.body.title.trim().length === 0 || req.body.title.trim().length > 200) {
        res.status(400).json({ error: "Title must be 1-200 characters" });
        return;
      }
      updates.title = req.body.title.trim();
    }
    if (req.body.description !== undefined) {
      if (typeof req.body.description !== "string" || req.body.description.trim().length === 0 || req.body.description.trim().length > 2000) {
        res.status(400).json({ error: "Description must be 1-2000 characters" });
        return;
      }
      updates.description = req.body.description.trim();
    }
    if (req.body.photos !== undefined) {
      if (!Array.isArray(req.body.photos)) {
        res.status(400).json({ error: "Photos must be an array" });
        return;
      }
      if (req.body.photos.length > MAX_CAMPAIGN_PHOTOS) {
        res.status(400).json({ error: `Maximum ${MAX_CAMPAIGN_PHOTOS} photos allowed` });
        return;
      }
      const photos = normalizeCampaignPhotos(req.body.photos);
      if (photos.length !== req.body.photos.length) {
        res.status(400).json({ error: "Each photo must be a valid uploaded image reference" });
        return;
      }
      updates.photos = photos;
    }
    if (req.body.comune !== undefined) {
      updates.comune = typeof req.body.comune === "string" && req.body.comune.trim() ? req.body.comune.trim() : null;
    }
    if (req.body.provincia !== undefined) {
      updates.provincia = typeof req.body.provincia === "string" && req.body.provincia.trim() ? req.body.provincia.trim() : null;
    }

    const [updated] = await db
      .update(donationCampaignsTable)
      .set(updates)
      .where(eq(donationCampaignsTable.id, campaignId))
      .returning();

    res.json(await enrichCampaign(updated));
  } catch (err) {
    console.error("[campaigns] update campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/campaigns/:campaignId", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.userId, userId),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    await db
      .delete(donationCampaignsTable)
      .where(eq(donationCampaignsTable.id, campaignId));

    res.json({ success: true });
  } catch (err) {
    console.error("[campaigns] delete campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/expiring-soon", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const now = new Date();
  const threshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  try {
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
          eq(donationCampaignsTable.isActive, true),
          gte(donationCampaignsTable.expiresAt, now),
          lte(donationCampaignsTable.expiresAt, threshold),
          sql`${donationCampaignsTable.inAppExpiryNotifiedAt} IS NULL`,
        ),
      )
      .orderBy(donationCampaignsTable.expiresAt);

    if (campaigns.length > 0) {
      await db
        .update(donationCampaignsTable)
        .set({ inAppExpiryNotifiedAt: now, updatedAt: now })
        .where(sql`${donationCampaignsTable.id} IN (${sql.join(campaigns.map((c) => sql`${c.id}`), sql`,`)})`);
    }

    res.json(await enrichCampaigns(campaigns));
  } catch (err) {
    console.error("[campaigns] expiring-soon error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/:campaignId/initiate-renewal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    const { pricingId } = req.body;
    if (!pricingId) {
      res.status(400).json({ error: "pricingId required" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const [pricing] = await db
      .select()
      .from(campaignPricingTable)
      .where(and(eq(campaignPricingTable.id, Number(pricingId)), eq(campaignPricingTable.isActive, true)));

    if (!pricing) {
      res.status(404).json({ error: "Pricing option not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.priceCents,
      currency: "eur",
      metadata: {
        userId,
        campaignId: String(campaign.id),
        pricingId: String(pricing.id),
        durationDays: String(pricing.durationDays),
        priceCents: String(pricing.priceCents),
        type: "campaign_renewal",
      },
    });

    await db
      .update(donationCampaignsTable)
      .set({
        renewalStripePaymentIntentId: paymentIntent.id,
        renewalDurationDays: pricing.durationDays,
        renewalPriceCents: pricing.priceCents,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      campaignId: campaign.id,
      priceCents: pricing.priceCents,
      durationDays: pricing.durationDays,
      label: pricing.label,
    });
  } catch (err) {
    console.error("[campaigns] initiate-renewal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/:campaignId/confirm-renewal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      res.status(400).json({ error: "paymentIntentId required" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      res.status(400).json({ error: "Payment not yet succeeded", stripeStatus: paymentIntent.status });
      return;
    }
    if (paymentIntent.metadata?.userId !== userId || paymentIntent.metadata?.campaignId !== String(campaignId)) {
      res.status(403).json({ error: "Payment does not belong to this campaign" });
      return;
    }

    const result = await renewCampaign(campaignId, paymentIntentId);
    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("[campaigns] confirm-renewal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/:campaignId/initiate-renewal-paypal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    if (!isPayPalConfigured()) {
      res.status(503).json({ error: "PayPal not configured" });
      return;
    }

    const { pricingId } = req.body;
    if (!pricingId) {
      res.status(400).json({ error: "pricingId required" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const [pricing] = await db
      .select()
      .from(campaignPricingTable)
      .where(and(eq(campaignPricingTable.id, Number(pricingId)), eq(campaignPricingTable.isActive, true)));

    if (!pricing) {
      res.status(404).json({ error: "Pricing option not found" });
      return;
    }

    const customId = `campaign_renew_${campaignId}_${Date.now()}`;
    const { orderId } = await createPayPalOrder(
      pricing.priceCents,
      "EUR",
      customId,
      `Rinnovo campagna: ${campaign.title}`,
    );

    await db
      .update(donationCampaignsTable)
      .set({
        renewalPaypalOrderId: orderId,
        renewalDurationDays: pricing.durationDays,
        renewalPriceCents: pricing.priceCents,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, campaign.id));

    res.json({
      orderId,
      campaignId: campaign.id,
      priceCents: pricing.priceCents,
      durationDays: pricing.durationDays,
      label: pricing.label,
    });
  } catch (err) {
    console.error("[campaigns] initiate-renewal-paypal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/:campaignId/confirm-renewal-paypal", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const campaignId = Number(req.params.campaignId);
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ error: "orderId required" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, campaignId),
          eq(donationCampaignsTable.userId, userId),
          eq(donationCampaignsTable.renewalPaypalOrderId, orderId),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found or not authorized" });
      return;
    }

    const { captured, status } = await capturePayPalOrder(orderId);

    if (!captured) {
      res.status(400).json({ error: "PayPal order not completed", paypalStatus: status });
      return;
    }

    const result = await renewCampaignByPayPalOrder(campaignId, orderId);
    if ((result as any).error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("[campaigns] confirm-renewal-paypal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/webhook/paypal", async (req, res) => {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const event = req.body;

    if (webhookId) {
      const valid = await verifyPayPalWebhookSignature({
        authAlgo: req.headers["paypal-auth-algo"] as string,
        certUrl: req.headers["paypal-cert-url"] as string,
        transmissionId: req.headers["paypal-transmission-id"] as string,
        transmissionSig: req.headers["paypal-transmission-sig"] as string,
        transmissionTime: req.headers["paypal-transmission-time"] as string,
        webhookId,
        webhookEvent: event,
      });
      if (!valid) {
        console.warn("[campaigns] PayPal webhook signature verification failed");
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    const eventType = event?.event_type as string;
    const resource = event?.resource as any;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const orderId = resource?.id as string;
      if (orderId) {
        const [campaign] = await db
          .select()
          .from(donationCampaignsTable)
          .where(eq(donationCampaignsTable.paypalOrderId, orderId));

        if (campaign && campaign.paymentStatus !== "paid") {
          try {
            const { captured } = await capturePayPalOrder(orderId);
            if (captured) {
              await activateCampaignByPayPalOrder(campaign.id, orderId);
              console.info(`[campaigns] PayPal webhook activated campaign=${campaign.id} for order=${orderId}`);
            }
          } catch (captureErr) {
            console.error(`[campaigns] PayPal webhook capture failed for order=${orderId}:`, captureErr);
          }
        }

        const [renewalCampaign] = await db
          .select()
          .from(donationCampaignsTable)
          .where(eq(donationCampaignsTable.renewalPaypalOrderId, orderId));

        if (renewalCampaign) {
          try {
            const { captured } = await capturePayPalOrder(orderId);
            if (captured) {
              await renewCampaignByPayPalOrder(renewalCampaign.id, orderId);
              console.info(`[campaigns] PayPal webhook renewed campaign=${renewalCampaign.id} for order=${orderId}`);
            }
          } catch (captureErr) {
            console.error(`[campaigns] PayPal webhook renewal capture failed for order=${orderId}:`, captureErr);
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[campaigns] PayPal webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

router.get("/campaigns/active", async (req, res) => {
  try {
    const now = new Date();
    const filterComune = typeof req.query.comune === "string" && req.query.comune.trim() ? req.query.comune.trim() : null;
    const filterProvincia = typeof req.query.provincia === "string" && req.query.provincia.trim() ? req.query.provincia.trim() : null;

    const conditions = [
      eq(donationCampaignsTable.isActive, true),
      eq(donationCampaignsTable.paymentStatus, "paid"),
      gt(donationCampaignsTable.expiresAt, now),
      ...(filterComune ? [ilike(donationCampaignsTable.comune, `%${filterComune}%`)] : []),
      ...(filterProvincia ? [ilike(donationCampaignsTable.provincia, `%${filterProvincia}%`)] : []),
    ];

    const campaigns = await db
      .select({
        id: donationCampaignsTable.id,
        userId: donationCampaignsTable.userId,
        title: donationCampaignsTable.title,
        description: donationCampaignsTable.description,
        photos: donationCampaignsTable.photos,
        durationDays: donationCampaignsTable.durationDays,
        expiresAt: donationCampaignsTable.expiresAt,
        comune: donationCampaignsTable.comune,
        provincia: donationCampaignsTable.provincia,
        createdAt: donationCampaignsTable.createdAt,
        orgUsername: usersTable.username,
        orgPhotoUrl: usersTable.photoUrl,
      })
      .from(donationCampaignsTable)
      .innerJoin(usersTable, eq(donationCampaignsTable.userId, usersTable.clerkUserId))
      .where(and(...conditions))
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(50);

    res.json(await enrichCampaigns(campaigns));
  } catch (err) {
    console.error("[campaigns] active campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/user/:userId", async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.userId, targetUserId),
          eq(donationCampaignsTable.paymentStatus, "paid"),
        ),
      )
      .orderBy(desc(donationCampaignsTable.isActive), desc(donationCampaignsTable.createdAt))
      .limit(1);

    res.json(campaigns[0] ? await enrichCampaign(campaigns[0]) : null);
  } catch (err) {
    console.error("[campaigns] get campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/finance", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [revenue] = await db.select().from(platformRevenueTable).where(eq(platformRevenueTable.id, 1));

    const recentCampaigns = await db
      .select({
        id: donationCampaignsTable.id,
        title: donationCampaignsTable.title,
        userId: donationCampaignsTable.userId,
        paymentStatus: donationCampaignsTable.paymentStatus,
        pricePaidCents: donationCampaignsTable.pricePaidCents,
        durationDays: donationCampaignsTable.durationDays,
        expiresAt: donationCampaignsTable.expiresAt,
        createdAt: donationCampaignsTable.createdAt,
        orgUsername: usersTable.username,
        // Fiscal snapshot frozen at activation time (from payment_ledger)
        fiscalDenominazione: paymentLedgerTable.entityDenominazione,
        fiscalIndirizzo: paymentLedgerTable.entityIndirizzo,
        fiscalPartitaIva: paymentLedgerTable.entityPartitaIva,
        fiscalCodiceFiscale: paymentLedgerTable.entityCodiceFiscale,
        fiscalCodiceUnivoco: paymentLedgerTable.entityCodiceUnivoco,
        fiscalEmail: paymentLedgerTable.entityEmail,
        fiscalTelefono: paymentLedgerTable.entityTelefono,
        fiscalReferente: paymentLedgerTable.entityReferente,
      })
      .from(donationCampaignsTable)
      .leftJoin(usersTable, eq(donationCampaignsTable.userId, usersTable.clerkUserId))
      .leftJoin(
        paymentLedgerTable,
        and(
          eq(paymentLedgerTable.campaignId, donationCampaignsTable.id),
          eq(paymentLedgerTable.type, "campaign_activation"),
        ),
      )
      .where(eq(donationCampaignsTable.paymentStatus, "paid"))
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(20);

    const pricingTiers = await db
      .select()
      .from(campaignPricingTable)
      .orderBy(campaignPricingTable.durationDays);

    res.json({
      platformRevenue: revenue || { totalCommissions: 0, transactionCount: 0 },
      recentPaidCampaigns: recentCampaigns,
      pricingTiers,
    });
  } catch (err) {
    console.error("[campaigns] admin-finance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export async function webhookHandler(req: Request, res: Response) {
  try {
    const stripe = await getUncachableStripeClient();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[campaigns] STRIPE_WEBHOOK_SECRET not configured");
      res.status(500).json({ error: "Webhook not configured" });
      return;
    }

    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event;
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("[campaigns] webhook signature verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const piId = paymentIntent.id;

      if (paymentIntent.metadata?.type === "campaign_publication") {
        const [campaign] = await db
          .select({ id: donationCampaignsTable.id, paymentStatus: donationCampaignsTable.paymentStatus })
          .from(donationCampaignsTable)
          .where(eq(donationCampaignsTable.stripePaymentIntentId, piId));

        if (campaign && campaign.paymentStatus !== "paid") {
          const result = await activateCampaign(campaign.id, piId);
          if (!(result as any).idempotent) {
            console.info(`[campaigns] webhook activated campaign=${campaign.id} for PI=${piId}`);
          }
        }
      }

      if (paymentIntent.metadata?.type === "campaign_renewal") {
        const campaignId = Number(paymentIntent.metadata?.campaignId);
        if (campaignId) {
          const result = await renewCampaign(campaignId, piId);
          if (!(result as any).error) {
            console.info(`[campaigns] webhook renewed campaign=${campaignId} for PI=${piId}`);
          }
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const piId = paymentIntent.id;

      if (paymentIntent.metadata?.type === "campaign_publication") {
        await db
          .update(donationCampaignsTable)
          .set({ paymentStatus: "failed", updatedAt: new Date() })
          .where(eq(donationCampaignsTable.stripePaymentIntentId, piId));

        console.warn(`[campaigns] payment_intent.payment_failed: ${piId}`);
      }

      if (paymentIntent.metadata?.type === "campaign_renewal") {
        await db
          .update(donationCampaignsTable)
          .set({
            renewalStripePaymentIntentId: null,
            renewalDurationDays: null,
            renewalPriceCents: null,
            updatedAt: new Date(),
          })
          .where(eq(donationCampaignsTable.renewalStripePaymentIntentId, piId));

        console.warn(`[campaigns] renewal payment_intent.payment_failed: ${piId}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[campaigns] webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

export default router;
