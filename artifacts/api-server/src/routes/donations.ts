import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  donationCampaignsTable,
  campaignPricingTable,
  platformRevenueTable,
} from "@workspace/db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe";

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

async function activateCampaign(campaignId: number, piId: string) {
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

    const durationDays = campaign.durationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await tx
      .update(donationCampaignsTable)
      .set({
        paymentStatus: "paid",
        isActive: true,
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
    res.json(campaigns);
  } catch (err) {
    console.error("[campaigns] my-campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns/initiate-payment", requireAuth, async (req, res) => {
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

    const { title, description, photos, pricingId } = req.body;
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
    const finalPhotos = Array.isArray(photos) ? photos.slice(0, 3).filter((p: any) => typeof p === "string" && p.length > 0) : [];
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

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.priceCents,
      currency: "eur",
      metadata: {
        userId,
        pricingId: String(pricing.id),
        durationDays: String(pricing.durationDays),
        priceCents: String(pricing.priceCents),
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
        pricePaidCents: pricing.priceCents,
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      campaignId: pendingCampaign.id,
      priceCents: pricing.priceCents,
      durationDays: pricing.durationDays,
      label: pricing.label,
    });
  } catch (err) {
    console.error("[campaigns] initiate-payment error:", err);
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

    const result = await activateCampaign(campaign.id, paymentIntentId);

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
      if (req.body.photos.length > 3) {
        res.status(400).json({ error: "Maximum 3 photos allowed" });
        return;
      }
      if (!req.body.photos.every((p: any) => typeof p === "string" && p.length > 0)) {
        res.status(400).json({ error: "Each photo must be a non-empty string" });
        return;
      }
      updates.photos = req.body.photos;
    }

    const [updated] = await db
      .update(donationCampaignsTable)
      .set(updates)
      .where(eq(donationCampaignsTable.id, campaignId))
      .returning();

    res.json(updated);
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

router.get("/campaigns/active", async (_req, res) => {
  try {
    const now = new Date();

    const campaigns = await db
      .select({
        id: donationCampaignsTable.id,
        userId: donationCampaignsTable.userId,
        title: donationCampaignsTable.title,
        description: donationCampaignsTable.description,
        photos: donationCampaignsTable.photos,
        durationDays: donationCampaignsTable.durationDays,
        expiresAt: donationCampaignsTable.expiresAt,
        createdAt: donationCampaignsTable.createdAt,
        orgUsername: usersTable.username,
        orgPhotoUrl: usersTable.photoUrl,
      })
      .from(donationCampaignsTable)
      .innerJoin(usersTable, eq(donationCampaignsTable.userId, usersTable.clerkUserId))
      .where(
        and(
          eq(donationCampaignsTable.isActive, true),
          eq(donationCampaignsTable.paymentStatus, "paid"),
          gt(donationCampaignsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(50);

    res.json(campaigns);
  } catch (err) {
    console.error("[campaigns] active campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/user/:userId", async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const now = new Date();
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.userId, targetUserId),
          eq(donationCampaignsTable.isActive, true),
          eq(donationCampaignsTable.paymentStatus, "paid"),
          gt(donationCampaignsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(1);

    res.json(campaigns[0] || null);
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
      })
      .from(donationCampaignsTable)
      .leftJoin(usersTable, eq(donationCampaignsTable.userId, usersTable.clerkUserId))
      .where(eq(donationCampaignsTable.paymentStatus, "paid"))
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(20);

    res.json({
      platformRevenue: revenue || { totalCommissions: 0, transactionCount: 0 },
      recentPaidCampaigns: recentCampaigns,
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
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[campaigns] webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

export default router;
