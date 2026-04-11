import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  donationCampaignsTable,
  donationsTable,
  orgBalancesTable,
  platformRevenueTable,
  ledgerEntriesTable,
  payoutsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "../lib/stripe";

const PLATFORM_FEE_RATE = 0.30;
const PAYOUT_FEE_CENTS = 25;
const MIN_PAYOUT_BALANCE_CENTS = 125;

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

router.get("/donations/stripe-config", requireAuth, async (_req, res) => {
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
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.goalAmount !== undefined)
      updates.goalAmount = req.body.goalAmount ? Math.round(Number(req.body.goalAmount) * 100) : null;
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

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

router.post("/donations/create-payment-intent", requireAuth, async (req, res) => {
  const donorUserId = (req as AuthenticatedRequest).userId;
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

    const stripe = await getUncachableStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      metadata: {
        campaignId: String(campaign.id),
        donorUserId,
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

    let [balance] = await db
      .select()
      .from(orgBalancesTable)
      .where(eq(orgBalancesTable.userId, userId));

    if (!balance) {
      balance = {
        id: 0,
        userId,
        totalOrgReceived: 0,
        availableBalance: 0,
        totalPaidOut: 0,
        updatedAt: new Date(),
      };
    }

    const recentPayouts = await db
      .select()
      .from(payoutsTable)
      .where(eq(payoutsTable.userId, userId))
      .orderBy(desc(payoutsTable.requestedAt))
      .limit(10);

    const recentLedger = await db
      .select()
      .from(ledgerEntriesTable)
      .where(eq(ledgerEntriesTable.orgUserId, userId))
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(20);

    res.json({
      organizationBalance: {
        totalOrgReceived: balance.totalOrgReceived,
        availableBalance: balance.availableBalance,
        totalPaidOut: balance.totalPaidOut,
      },
      payouts: recentPayouts,
      ledger: recentLedger,
    });
  } catch (err) {
    console.error("[donations] balance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/donations/request-payout", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (!user || user.accountType !== "organization") {
      res.status(403).json({ error: "Only organizations can request payouts" });
      return;
    }

    if (!user.stripeAccountId) {
      res.status(400).json({ error: "Stripe account not connected" });
      return;
    }

    const deducted = await db
      .update(orgBalancesTable)
      .set({
        availableBalance: 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orgBalancesTable.userId, userId),
          sql`${orgBalancesTable.availableBalance} >= ${MIN_PAYOUT_BALANCE_CENTS}`
        )
      )
      .returning({ previousBalance: orgBalancesTable.availableBalance });

    if (deducted.length === 0) {
      res.status(400).json({ error: `Insufficient balance (min €${(MIN_PAYOUT_BALANCE_CENTS / 100).toFixed(2)} including €0.25 fee)` });
      return;
    }

    const grossAmount = deducted[0].previousBalance;
    const amountNet = grossAmount - PAYOUT_FEE_CENTS;

    let transfer;
    try {
      const stripe = await getUncachableStripeClient();
      transfer = await stripe.transfers.create({
        amount: amountNet,
        currency: "eur",
        destination: user.stripeAccountId,
        metadata: { userId },
      });
    } catch (stripeErr) {
      await db
        .update(orgBalancesTable)
        .set({
          availableBalance: sql`${orgBalancesTable.availableBalance} + ${grossAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(orgBalancesTable.userId, userId));
      throw stripeErr;
    }

    const payout = await db.transaction(async (tx) => {
      const [p] = await tx
        .insert(payoutsTable)
        .values({
          userId,
          amountGross: grossAmount,
          payoutFee: PAYOUT_FEE_CENTS,
          amountNet,
          status: "completed",
          stripeTransferId: transfer.id,
          executedAt: new Date(),
        })
        .returning();

      await tx
        .update(orgBalancesTable)
        .set({
          totalPaidOut: sql`${orgBalancesTable.totalPaidOut} + ${grossAmount}`,
        })
        .where(eq(orgBalancesTable.userId, userId));

      await tx.insert(ledgerEntriesTable).values([
        {
          entryType: "payout_org",
          amountCents: -grossAmount,
          orgUserId: userId,
          payoutId: p.id,
          description: `Payout to Stripe Connect (gross €${(grossAmount / 100).toFixed(2)}, net €${(amountNet / 100).toFixed(2)})`,
        },
        {
          entryType: "payout_fee_platform",
          amountCents: PAYOUT_FEE_CENTS,
          orgUserId: userId,
          payoutId: p.id,
          description: `Payout fee €${(PAYOUT_FEE_CENTS / 100).toFixed(2)}`,
        },
      ]);

      await ensurePlatformRevenueRow(tx);

      await tx
        .update(platformRevenueTable)
        .set({
          totalPayoutFees: sql`${platformRevenueTable.totalPayoutFees} + ${PAYOUT_FEE_CENTS}`,
          updatedAt: new Date(),
        })
        .where(eq(platformRevenueTable.id, 1));

      return p;
    });

    res.json({ payout });
  } catch (err) {
    console.error("[donations] request-payout error:", err);
    res.status(500).json({ error: "Payout failed" });
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
      const meta = paymentIntent.metadata || {};

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
          .returning({ id: donationsTable.id });

        if (updatedRows.length === 0) {
          return { idempotent: true };
        }

        const donationId = updatedRows[0].id;
        const campaignId = Number(meta.campaignId);
        const recipientUserId = meta.recipientUserId;
        const amountOrg = Number(meta.amountOrg) || 0;
        const amountPlatform = Number(meta.amountPlatform) || 0;
        const amountTotal = amountOrg + amountPlatform;

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

        if (recipientUserId) {
          const [existingBalance] = await tx
            .select()
            .from(orgBalancesTable)
            .where(eq(orgBalancesTable.userId, recipientUserId));

          if (existingBalance) {
            await tx
              .update(orgBalancesTable)
              .set({
                totalOrgReceived: sql`${orgBalancesTable.totalOrgReceived} + ${amountOrg}`,
                availableBalance: sql`${orgBalancesTable.availableBalance} + ${amountOrg}`,
                updatedAt: new Date(),
              })
              .where(eq(orgBalancesTable.userId, recipientUserId));
          } else {
            await tx.insert(orgBalancesTable).values({
              userId: recipientUserId,
              totalOrgReceived: amountOrg,
              availableBalance: amountOrg,
              totalPaidOut: 0,
            });
          }

          await tx.insert(ledgerEntriesTable).values({
            entryType: "donation_org_credit",
            amountCents: amountOrg,
            orgUserId: recipientUserId,
            donationId,
            description: `Donation received: org share €${(amountOrg / 100).toFixed(2)} of €${(amountTotal / 100).toFixed(2)} total`,
          });
        }

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
          description: `Platform commission: €${(amountPlatform / 100).toFixed(2)} (${(PLATFORM_FEE_RATE * 100).toFixed(0)}% of €${(amountTotal / 100).toFixed(2)})`,
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

router.get("/donations/platform-revenue", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const adminIds = (process.env.ADMIN_CLERK_USER_IDS || "").split(",");
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
        sql`${ledgerEntriesTable.entryType} IN ('donation_platform_fee', 'payout_fee_platform')`
      )
      .orderBy(desc(ledgerEntriesTable.createdAt))
      .limit(50);

    res.json({
      platformRevenue: {
        totalCommissions: revenue?.totalCommissions ?? 0,
        totalPayoutFees: revenue?.totalPayoutFees ?? 0,
        totalRevenue: (revenue?.totalCommissions ?? 0) + (revenue?.totalPayoutFees ?? 0),
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
  const adminIds = (process.env.ADMIN_CLERK_USER_IDS || "").split(",");
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
