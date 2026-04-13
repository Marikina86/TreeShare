import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  donationCampaignsTable,
  donationsTable,
  platformRevenueTable,
  ledgerEntriesTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe";

const PLATFORM_FEE_RATE = 0.20;

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

const router = Router();

router.get("/donations/stripe-config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    console.error("[donations] stripe-config error:", err);
    res.status(500).json({ error: "Stripe not configured" });
  }
});

router.get("/donations/my-campaigns", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(eq(donationCampaignsTable.userId, userId))
      .orderBy(desc(donationCampaignsTable.createdAt));
    res.json(campaigns);
  } catch (err) {
    console.error("[donations] my-campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/donations/campaigns", requireAuth, async (req, res) => {
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

    const { title, description, goalAmount } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description required" });
      return;
    }

    const [campaign] = await db
      .insert(donationCampaignsTable)
      .values({
        userId,
        title,
        description,
        goalAmount: goalAmount ? Math.round(Number(goalAmount) * 100) : null,
      })
      .returning();

    res.status(201).json(campaign);
  } catch (err) {
    console.error("[donations] create campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/donations/campaigns/:campaignId", requireAuth, async (req, res) => {
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
    if (req.body.goalAmount !== undefined) {
      if (req.body.goalAmount !== null) {
        const goal = Number(req.body.goalAmount);
        if (!Number.isFinite(goal) || goal <= 0) {
          res.status(400).json({ error: "Goal must be a positive number" });
          return;
        }
        updates.goalAmount = Math.round(goal * 100);
      } else {
        updates.goalAmount = null;
      }
    }
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
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
    console.error("[donations] update campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/donations/campaigns/:campaignId", requireAuth, async (req, res) => {
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

    const [donationRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(donationsTable)
      .where(eq(donationsTable.campaignId, campaignId));

    if (campaign.donationCount > 0 || (donationRow && donationRow.count > 0)) {
      res.status(400).json({ error: "Cannot delete campaign with donations. Deactivate it instead." });
      return;
    }

    await db
      .delete(donationCampaignsTable)
      .where(eq(donationCampaignsTable.id, campaignId));

    res.json({ success: true });
  } catch (err) {
    console.error("[donations] delete campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/campaigns/active", async (req, res) => {
  try {
    const sortBy = req.query.sort as string || "recent";

    const campaigns = await db
      .select({
        id: donationCampaignsTable.id,
        userId: donationCampaignsTable.userId,
        title: donationCampaignsTable.title,
        description: donationCampaignsTable.description,
        goalAmount: donationCampaignsTable.goalAmount,
        totalRaised: donationCampaignsTable.totalRaised,
        donationCount: donationCampaignsTable.donationCount,
        photos: donationCampaignsTable.photos,
        createdAt: donationCampaignsTable.createdAt,
        orgUsername: usersTable.username,
        orgPhotoUrl: usersTable.photoUrl,
      })
      .from(donationCampaignsTable)
      .innerJoin(usersTable, eq(donationCampaignsTable.userId, usersTable.clerkUserId))
      .where(eq(donationCampaignsTable.isActive, true))
      .orderBy(
        sortBy === "popular"
          ? desc(donationCampaignsTable.donationCount)
          : sortBy === "funded"
            ? desc(donationCampaignsTable.totalRaised)
            : desc(donationCampaignsTable.createdAt)
      )
      .limit(50);

    res.json(campaigns);
  } catch (err) {
    console.error("[donations] active campaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/campaigns/user/:userId", async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const campaigns = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.userId, targetUserId),
          eq(donationCampaignsTable.isActive, true),
        ),
      )
      .orderBy(desc(donationCampaignsTable.createdAt))
      .limit(1);

    res.json(campaigns[0] || null);
  } catch (err) {
    console.error("[donations] get campaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/donations/create-payment-intent", optionalAuth, async (req, res) => {
  const donorUserId = (req as AuthenticatedRequest).userId || null;
  try {
    const { campaignId, amount } = req.body;
    const amountCents = Math.round(Number(amount) * 100);

    if (!campaignId || !amountCents || amountCents < 100) {
      res.status(400).json({ error: "Valid campaign and amount (min €1) required" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        and(
          eq(donationCampaignsTable.id, Number(campaignId)),
          eq(donationCampaignsTable.isActive, true),
        ),
      );

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found or inactive" });
      return;
    }

    const amountPlatform = Math.round(amountCents * PLATFORM_FEE_RATE);
    const amountOrg = amountCents - amountPlatform;

    const [recipientUser] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, campaign.userId));

    if (!recipientUser?.stripeAccountId) {
      res.status(400).json({ error: "Organization has not connected Stripe yet" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      application_fee_amount: amountPlatform,
      transfer_data: {
        destination: recipientUser.stripeAccountId,
      },
      metadata: {
        campaignId: String(campaign.id),
        donorUserId: donorUserId || "guest",
        recipientUserId: campaign.userId,
        amountOrg: String(amountOrg),
        amountPlatform: String(amountPlatform),
      },
    });

    const [donation] = await db
      .insert(donationsTable)
      .values({
        donorUserId,
        recipientUserId: campaign.userId,
        campaignId: campaign.id,
        amountTotal: amountCents,
        amountOrg,
        amountPlatform,
        status: "pending",
        stripePaymentIntentId: paymentIntent.id,
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      donationId: donation.id,
      amountTotal: amountCents,
      amountOrg,
      amountPlatform,
    });
  } catch (err) {
    console.error("[donations] create-payment-intent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/donations/confirm-payment", optionalAuth, async (req, res) => {
  const donorUserId = (req as AuthenticatedRequest).userId || null;
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

    const result = await db.transaction(async (tx) => {
      const whereConditions = [
        eq(donationsTable.stripePaymentIntentId, paymentIntentId),
        sql`${donationsTable.status} != 'completed'`,
      ];
      if (donorUserId) {
        whereConditions.push(eq(donationsTable.donorUserId, donorUserId));
      } else {
        whereConditions.push(sql`${donationsTable.donorUserId} IS NULL`);
      }

      const updatedRows = await tx
        .update(donationsTable)
        .set({ status: "completed" })
        .where(and(...whereConditions))
        .returning();

      if (updatedRows.length === 0) {
        return { idempotent: true };
      }

      const donation = updatedRows[0];
      const donationId = donation.id;
      const campaignId = donation.campaignId;
      const recipientUserId = donation.recipientUserId;
      const amountOrg = donation.amountOrg ?? 0;
      const amountPlatform = donation.amountPlatform ?? 0;
      const amountTotal = donation.amountTotal ?? (amountOrg + amountPlatform);

      if (campaignId) {
        await tx
          .update(donationCampaignsTable)
          .set({
            totalRaised: sql`${donationCampaignsTable.totalRaised} + ${amountTotal}`,
            donationCount: sql`${donationCampaignsTable.donationCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(donationCampaignsTable.id, campaignId));
      }

      await tx.insert(ledgerEntriesTable).values({
        entryType: "donation_org_credit",
        amountCents: amountOrg,
        orgUserId: recipientUserId || null,
        donationId,
        description: `Stripe Connect destination charge: org receives €${(amountOrg / 100).toFixed(2)} of €${(amountTotal / 100).toFixed(2)} total`,
      });

      await ensurePlatformRevenueRow(tx);

      await tx
        .update(platformRevenueTable)
        .set({
          totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${amountPlatform}`,
          transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(platformRevenueTable.id, 1));

      await tx.insert(ledgerEntriesTable).values({
        entryType: "donation_platform_fee",
        amountCents: amountPlatform,
        orgUserId: recipientUserId || null,
        donationId,
        description: `Platform application fee: €${(amountPlatform / 100).toFixed(2)} (${(PLATFORM_FEE_RATE * 100).toFixed(0)}% of €${(amountTotal / 100).toFixed(2)})`,
      });

      return { idempotent: false, donationId, amountOrg, amountPlatform };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[donations] confirm-payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/balance", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select({ accountType: usersTable.accountType })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations can view balance" });
      return;
    }

    const [totals] = await db
      .select({
        totalReceived: sql<number>`COALESCE(SUM(CASE WHEN ${donationsTable.status} = 'completed' THEN ${donationsTable.amountOrg} ELSE 0 END), 0)`,
        donationCount: sql<number>`COUNT(CASE WHEN ${donationsTable.status} = 'completed' THEN 1 END)`,
      })
      .from(donationsTable)
      .where(eq(donationsTable.recipientUserId, userId));

    const recentLedger = await db
      .select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.orgUserId, userId))
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(20);

    res.json({
      organizationBalance: {
        totalOrgReceived: totals.totalReceived,
        completedDonations: totals.donationCount,
      },
      ledger: recentLedger,
    });
  } catch (err) {
    console.error("[donations] balance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/donations/connect-stripe", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations" });
      return;
    }

    if (user.stripeAccountId) {
      res.json({ stripeAccountId: user.stripeAccountId, alreadyConnected: true });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId },
    });

    await db
      .update(usersTable)
      .set({ stripeAccountId: account.id })
      .where(eq(usersTable.clerkUserId, userId));

    const host = req.get("host") || "localhost";
    const protocol = req.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/settings`,
      return_url: `${baseUrl}/settings`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url, stripeAccountId: account.id });
  } catch (err) {
    console.error("[donations] connect-stripe error:", err);
    res.status(500).json({ error: "Failed to connect Stripe" });
  }
});

export async function webhookHandler(req: Request, res: Response) {
  try {
    const stripe = await getUncachableStripeClient();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[donations] STRIPE_WEBHOOK_SECRET not configured");
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
      console.error("[donations] webhook signature verification failed:", err.message);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const piId = paymentIntent.id;

      const result = await db.transaction(async (tx) => {
        const updatedRows = await tx
          .update(donationsTable)
          .set({ status: "completed" })
          .where(
            and(
              eq(donationsTable.stripePaymentIntentId, piId),
              sql`${donationsTable.status} != 'completed'`
            )
          )
          .returning();

        if (updatedRows.length === 0) {
          return { idempotent: true };
        }

        const donation = updatedRows[0];
        const donationId = donation.id;
        const campaignId = donation.campaignId;
        const recipientUserId = donation.recipientUserId;
        const amountOrg = donation.amountOrg ?? 0;
        const amountPlatform = donation.amountPlatform ?? 0;
        const amountTotal = donation.amountTotal ?? (amountOrg + amountPlatform);

        if (campaignId) {
          await tx
            .update(donationCampaignsTable)
            .set({
              totalRaised: sql`${donationCampaignsTable.totalRaised} + ${amountTotal}`,
              donationCount: sql`${donationCampaignsTable.donationCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(donationCampaignsTable.id, campaignId));
        }

        await tx.insert(ledgerEntriesTable).values({
          entryType: "donation_org_credit",
          amountCents: amountOrg,
          orgUserId: recipientUserId || null,
          donationId,
          description: `Stripe Connect destination charge: org receives €${(amountOrg / 100).toFixed(2)} of €${(amountTotal / 100).toFixed(2)} total`,
        });

        await ensurePlatformRevenueRow(tx);

        await tx
          .update(platformRevenueTable)
          .set({
            totalCommissions: sql`${platformRevenueTable.totalCommissions} + ${amountPlatform}`,
            transactionCount: sql`${platformRevenueTable.transactionCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(platformRevenueTable.id, 1));

        await tx.insert(ledgerEntriesTable).values({
          entryType: "donation_platform_fee",
          amountCents: amountPlatform,
          orgUserId: recipientUserId || null,
          donationId,
          description: `Platform application fee: €${(amountPlatform / 100).toFixed(2)} (${(PLATFORM_FEE_RATE * 100).toFixed(0)}% of €${(amountTotal / 100).toFixed(2)})`,
        });

        return { idempotent: false, campaignId, amountOrg, amountPlatform };
      });

      if (result.idempotent) {
        res.json({ received: true, idempotent: true });
        return;
      }

      console.info(`[donations] payment_intent.succeeded: ${piId}, campaign=${result.campaignId}, org=€${((result.amountOrg ?? 0) / 100).toFixed(2)}, platform=€${((result.amountPlatform ?? 0) / 100).toFixed(2)}`);
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const piId = paymentIntent.id;
      await db
        .update(donationsTable)
        .set({ status: "failed" })
        .where(eq(donationsTable.stripePaymentIntentId, piId));

      console.warn(`[donations] payment_intent.payment_failed: ${piId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[donations] webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

router.get("/donations/my-donations", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const myDonations = await db
      .select({
        id: donationsTable.id,
        amountTotal: donationsTable.amountTotal,
        amountOrg: donationsTable.amountOrg,
        amountPlatform: donationsTable.amountPlatform,
        status: donationsTable.status,
        createdAt: donationsTable.createdAt,
        campaignTitle: donationCampaignsTable.title,
        recipientUsername: usersTable.username,
      })
      .from(donationsTable)
      .leftJoin(donationCampaignsTable, eq(donationsTable.campaignId, donationCampaignsTable.id))
      .leftJoin(usersTable, eq(donationsTable.recipientUserId, usersTable.clerkUserId))
      .where(eq(donationsTable.donorUserId, userId))
      .orderBy(desc(donationsTable.createdAt))
      .limit(50);

    const totalDonated = myDonations
      .filter(d => d.status === "completed")
      .reduce((sum, d) => sum + (d.amountTotal ?? 0), 0);

    res.json({ donations: myDonations, totalDonated });
  } catch (err) {
    console.error("[donations] my-donations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/platform-revenue", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const adminIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_CLERK_USER_IDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  if (!adminIds.includes(userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  try {
    const [revenue] = await db.select().from(platformRevenueTable).where(eq(platformRevenueTable.id, 1));

    const recentPlatformLedger = await db
      .select()
      .from(ledgerEntriesTable)
      .where(
        sql`${ledgerEntriesTable.entryType} = 'donation_platform_fee'`
      )
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(50);

    res.json({
      platformRevenue: {
        totalCommissions: revenue?.totalCommissions ?? 0,
        totalRevenue: revenue?.totalCommissions ?? 0,
        transactionCount: revenue?.transactionCount ?? 0,
      },
      recentLedger: recentPlatformLedger,
    });
  } catch (err) {
    console.error("[donations] platform-revenue error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/audit", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const adminIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_CLERK_USER_IDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  if (!adminIds.includes(userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const entries = await db
      .select()
      .from(ledgerEntriesTable)
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ledgerEntriesTable);

    res.json({
      entries,
      total: countResult.count,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[donations] audit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/donations/admin-finance", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const adminIds = (process.env.ADMIN_USER_IDS || process.env.ADMIN_CLERK_USER_IDS || "").split(",").map((s: string) => s.trim()).filter(Boolean);
  if (!adminIds.includes(userId)) {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  try {
    await ensurePlatformRevenueRow(db);
    const [revenue] = await db.select().from(platformRevenueTable).where(eq(platformRevenueTable.id, 1));

    const recentLedger = await db
      .select()
      .from(ledgerEntriesTable)
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(50);

    const recentDonations = await db
      .select({
        id: donationsTable.id,
        donorUsername: sql<string>`donor.username`,
        recipientUsername: sql<string>`recipient.username`,
        amountTotal: donationsTable.amountTotal,
        amountOrg: donationsTable.amountOrg,
        amountPlatform: donationsTable.amountPlatform,
        status: donationsTable.status,
        createdAt: donationsTable.createdAt,
      })
      .from(donationsTable)
      .innerJoin(sql`users AS donor`, sql`donor.clerk_user_id = ${donationsTable.donorUserId}`)
      .innerJoin(sql`users AS recipient`, sql`recipient.clerk_user_id = ${donationsTable.recipientUserId}`)
      .orderBy(desc(donationsTable.createdAt))
      .limit(30);

    res.json({
      platformRevenue: {
        totalCommissions: revenue?.totalCommissions ?? 0,
        totalRevenue: revenue?.totalCommissions ?? 0,
        transactionCount: revenue?.transactionCount ?? 0,
      },
      recentLedger,
      recentDonations,
    });
  } catch (err) {
    console.error("[donations] admin-finance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/me/account-type", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const { accountType } = req.body;

  if (!accountType || !["user", "organization"].includes(accountType)) {
    res.status(400).json({ error: "Invalid account type" });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({ accountType })
      .where(eq(usersTable.clerkUserId, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ accountType: updated.accountType });
  } catch (err) {
    console.error("[donations] update account-type error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
