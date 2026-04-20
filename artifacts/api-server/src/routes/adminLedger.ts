import { Router } from "express";
import { db } from "@workspace/db";
import { paymentLedgerTable } from "@workspace/db";
import { eq, isNull, desc } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

/**
 * GET /admin/payment-ledger
 * Returns all non-deleted ledger entries, newest first.
 * Optional query: ?type=campaign_activation|campaign_renewal|adoption_payment|platform_commission
 */
router.get("/admin/payment-ledger", requireAuth, requireAdmin, async (req, res) => {
  try {
    const typeFilter = typeof req.query.type === "string" ? req.query.type : null;

    const rows = await db
      .select()
      .from(paymentLedgerTable)
      .where(isNull(paymentLedgerTable.deletedAt))
      .orderBy(desc(paymentLedgerTable.createdAt));

    const filtered = typeFilter ? rows.filter((r) => r.type === typeFilter) : rows;

    const totalCents = filtered.reduce((sum, r) => sum + r.amountCents, 0);
    const commissionCents = filtered
      .filter((r) => r.type === "platform_commission")
      .reduce((sum, r) => sum + r.amountCents, 0);
    const campaignCents = filtered
      .filter((r) => r.type === "campaign_activation" || r.type === "campaign_renewal")
      .reduce((sum, r) => sum + r.amountCents, 0);
    const adoptionCents = filtered
      .filter((r) => r.type === "adoption_payment")
      .reduce((sum, r) => sum + r.amountCents, 0);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      entries: filtered.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        deletedAt: r.deletedAt?.toISOString() ?? null,
      })),
      summary: {
        totalCents,
        commissionCents,
        campaignCents,
        adoptionCents,
        count: filtered.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

/**
 * DELETE /admin/payment-ledger/:id
 * Soft-delete a ledger entry. Records who deleted it and when.
 */
router.delete("/admin/payment-ledger/:id", requireAuth, requireAdmin, async (req, res) => {
  const adminId = (req as AuthenticatedRequest).userId;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const [entry] = await db
      .select({ id: paymentLedgerTable.id, deletedAt: paymentLedgerTable.deletedAt })
      .from(paymentLedgerTable)
      .where(eq(paymentLedgerTable.id, id));

    if (!entry) { res.status(404).json({ error: "Voce non trovata" }); return; }
    if (entry.deletedAt) { res.status(409).json({ error: "Voce già eliminata" }); return; }

    await db
      .update(paymentLedgerTable)
      .set({ deletedAt: new Date(), deletedBy: adminId })
      .where(eq(paymentLedgerTable.id, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Errore interno" });
  }
});

export default router;
