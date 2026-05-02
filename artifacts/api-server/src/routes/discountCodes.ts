import { Router } from "express";
import { db } from "@workspace/db";
import {
  discountCodesTable,
  discountCodeUsesTable,
  discountCodeNotificationsTable,
  usersTable,
  organizationsTable,
  userNotificationsTable,
} from "@workspace/db";
import { eq, and, desc, lt, gt, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getRomeExpiryDate } from "../lib/eventCleaner";
import { sendEmail, isEmailConfigured } from "../lib/email";

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function computeDiscountedCents(
  originalCents: number,
  discountType: string,
  discountValue: number,
): number {
  if (discountType === "percentage") {
    const pct = Math.min(100, Math.max(0, discountValue));
    return Math.max(0, Math.round(originalCents * (1 - pct / 100)));
  }
  if (discountType === "fixed") {
    return Math.max(0, originalCents - discountValue);
  }
  return originalCents;
}

function formatDiscount(type: string, value: number, lang = "it"): string {
  if (type === "percentage") return `${value}%`;
  return `€${(value / 100).toFixed(2)}`;
}

function discountEmailHtml(
  code: string,
  discountType: string,
  discountValue: number,
  expiresAt: Date,
  lang = "it",
): string {
  const discount = formatDiscount(discountType, discountValue, lang);
  const expiry = expiresAt.toLocaleDateString(lang === "it" ? "it-IT" : "en-GB");
  if (lang === "it") {
    return `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#16a34a">Codice sconto esclusivo TreeShare</h2>
      <p>Hai ricevuto un codice sconto di <strong>${discount}</strong> per la pubblicazione di una campagna su TreeShare.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 24px;font-size:22px;font-weight:bold;letter-spacing:2px;color:#15803d;text-align:center">${escHtml(code)}</div>
      <p style="color:#6b7280;font-size:13px">Valido fino al ${expiry}. Inserisci il codice al momento del pagamento della campagna.</p>
    </div>`;
  }
  return `<div style="font-family:sans-serif;max-width:600px;margin:auto">
    <h2 style="color:#16a34a">Exclusive TreeShare discount code</h2>
    <p>You received a discount of <strong>${escHtml(discount)}</strong> for publishing a campaign on TreeShare.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 24px;font-size:22px;font-weight:bold;letter-spacing:2px;color:#15803d;text-align:center">${escHtml(code)}</div>
    <p style="color:#6b7280;font-size:13px">Valid until ${expiry}. Enter the code at campaign payment checkout.</p>
  </div>`;
}

// ─── admin: list all codes ───────────────────────────────────────────────────

router.get("/discount-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const codes = await db
      .select()
      .from(discountCodesTable)
      .orderBy(desc(discountCodesTable.createdAt));
    res.json(
      codes.map((c) => ({
        ...c,
        expiresAt: c.expiresAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "[discount-codes] list error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── admin: create code ──────────────────────────────────────────────────────

router.post("/discount-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      durationDays,
      maxUses,
      campaignId,
      notify,
    } = req.body;

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      res.status(400).json({ error: "Codice obbligatorio" });
      return;
    }
    if (!["percentage", "fixed"].includes(discountType)) {
      res.status(400).json({ error: "discountType deve essere 'percentage' o 'fixed'" });
      return;
    }
    const value = Number(discountValue);
    if (!Number.isInteger(value) || value <= 0) {
      res.status(400).json({ error: "discountValue deve essere un numero positivo" });
      return;
    }
    if (discountType === "percentage" && value > 100) {
      res.status(400).json({ error: "La percentuale non può superare il 100%" });
      return;
    }
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1) {
      res.status(400).json({ error: "durationDays deve essere >= 1" });
      return;
    }

    const expiresAt = getRomeExpiryDate(days);

    const [created] = await db
      .insert(discountCodesTable)
      .values({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: value,
        durationDays: days,
        expiresAt,
        maxUses: maxUses ? Number(maxUses) : null,
        campaignId: campaignId ? Number(campaignId) : null,
        isActive: true,
      })
      .returning();

    let notifResult: { recipientCount: number } | null = null;
    if (notify?.target && notify?.type) {
      notifResult = await sendDiscountNotifications(created, notify.target, notify.type, req.log);
    }

    res.status(201).json({
      ...created,
      expiresAt: created.expiresAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      notifResult,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Codice già esistente" });
      return;
    }
    req.log.error({ err }, "[discount-codes] create error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── admin: update code ──────────────────────────────────────────────────────

router.patch("/discount-codes/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const updates: Record<string, unknown> = {};
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.maxUses !== undefined) updates.maxUses = req.body.maxUses === null ? null : Number(req.body.maxUses);
    if (req.body.discountValue !== undefined) updates.discountValue = Number(req.body.discountValue);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nessun campo da aggiornare" });
      return;
    }

    const [updated] = await db
      .update(discountCodesTable)
      .set(updates)
      .where(eq(discountCodesTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Codice non trovato" }); return; }
    res.json({ ...updated, expiresAt: updated.expiresAt.toISOString(), createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "[discount-codes] update error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── admin: delete code ──────────────────────────────────────────────────────

router.delete("/discount-codes/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const [deleted] = await db
      .delete(discountCodesTable)
      .where(eq(discountCodesTable.id, id))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Codice non trovato" }); return; }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "[discount-codes] delete error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── admin: send notifications for a code ───────────────────────────────────

router.post("/discount-codes/:id/notify", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID non valido" }); return; }
  try {
    const { target, type } = req.body;
    if (!["all", "business", "private"].includes(target)) {
      res.status(400).json({ error: "target deve essere 'all', 'business' o 'private'" });
      return;
    }
    if (!["in-app", "email", "both"].includes(type)) {
      res.status(400).json({ error: "type deve essere 'in-app', 'email' o 'both'" });
      return;
    }

    const [code] = await db
      .select()
      .from(discountCodesTable)
      .where(eq(discountCodesTable.id, id));

    if (!code) { res.status(404).json({ error: "Codice non trovato" }); return; }
    if (!code.isActive || code.expiresAt < new Date()) {
      res.status(400).json({ error: "Il codice è scaduto o disattivato" });
      return;
    }

    const result = await sendDiscountNotifications(code, target, type, req.log);

    res.json({ success: true, recipientCount: result.recipientCount });
  } catch (err) {
    req.log.error({ err }, "[discount-codes] notify error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── validate a code (any authenticated user) ───────────────────────────────

router.post("/discount-codes/validate", requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const { code, priceCents } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Codice obbligatorio" });
      return;
    }

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

    if (!dc) {
      res.status(404).json({ valid: false, error: "Codice non valido o scaduto" });
      return;
    }

    if (dc.maxUses !== null && dc.useCount >= dc.maxUses) {
      res.status(400).json({ valid: false, error: "Il codice ha raggiunto il numero massimo di utilizzi" });
      return;
    }

    const userKey = `user:${userId}`;
    const [alreadyUsed] = await db
      .select()
      .from(discountCodeUsesTable)
      .where(
        and(
          eq(discountCodeUsesTable.discountCodeId, dc.id),
          eq(discountCodeUsesTable.userKey, userKey),
        ),
      );

    if (alreadyUsed) {
      res.status(400).json({ valid: false, error: "Hai già utilizzato questo codice" });
      return;
    }

    const originalCents = priceCents ? Number(priceCents) : null;
    const discountedCents = originalCents !== null
      ? computeDiscountedCents(originalCents, dc.discountType, dc.discountValue)
      : null;
    const savedCents = originalCents !== null ? originalCents - (discountedCents ?? originalCents) : null;

    res.json({
      valid: true,
      discountCodeId: dc.id,
      code: dc.code,
      discountType: dc.discountType,
      discountValue: dc.discountValue,
      expiresAt: dc.expiresAt.toISOString(),
      discountedCents,
      savedCents,
    });
  } catch (err) {
    req.log.error({ err }, "[discount-codes] validate error");
    res.status(500).json({ error: "Errore interno" });
  }
});

// ─── shared notification sender ─────────────────────────────────────────────

async function sendDiscountNotifications(
  code: typeof discountCodesTable.$inferSelect,
  target: "all" | "business" | "private",
  type: "in-app" | "email" | "both",
  log: any,
): Promise<{ recipientCount: number }> {
  const doInApp = type === "in-app" || type === "both";
  const doEmail = type === "email" || type === "both";

  const discount = formatDiscount(code.discountType, code.discountValue);
  const titleIt = `Codice sconto ${discount} su TreeShare`;
  const messageIt = `Usa il codice "${code.code}" per ottenere uno sconto di ${discount} sulla pubblicazione di una campagna. Valido fino al ${code.expiresAt.toLocaleDateString("it-IT")}.`;
  const titleEn = `${discount} discount code on TreeShare`;
  const messageEn = `Use code "${code.code}" for a ${discount} discount on campaign publication. Valid until ${code.expiresAt.toLocaleDateString("en-GB")}.`;

  let recipientCount = 0;

  try {
    // ── Regular users (private) ──────────────────────────────────────────
    if (target === "all" || target === "private") {
      const users = await db
        .select({ clerkUserId: usersTable.clerkUserId })
        .from(usersTable)
        .where(eq(usersTable.isBlocked, false));

      if (doInApp) {
        const inAppRows = users.map((u) => ({
          userId: u.clerkUserId,
          title: titleIt,
          message: messageIt,
        }));
        if (inAppRows.length > 0) {
          await db.insert(userNotificationsTable).values(inAppRows);
          recipientCount += inAppRows.length;
        }
      }
      // Email: users table has no email column — skip email for private users unless we extend schema
      // (private users use Supabase auth; email not stored in DB — cannot send without a email column)
    }

    // ── Organizations (business) ─────────────────────────────────────────
    if (target === "all" || target === "business") {
      const orgs = await db
        .select({ emailUfficiale: organizationsTable.emailUfficiale, ragioneSociale: organizationsTable.ragioneSociale })
        .from(organizationsTable);

      if (doInApp) {
        // Organizations don't use userNotificationsTable (different auth).
        // We log the in-app notification count without inserting (no userId for orgs).
        log.info({ orgCount: orgs.length }, "[discount-notify] org in-app skipped — orgs use separate auth");
        recipientCount += orgs.length;
      }

      if (doEmail && orgs.length > 0) {
        const emailCfg = isEmailConfigured();
        if (!emailCfg) {
          log.warn("[discount-notify] Email not configured — skipping email to orgs");
        } else {
          await Promise.allSettled(
            orgs.map((o) =>
              sendEmail(
                o.emailUfficiale,
                titleEn,
                discountEmailHtml(code.code, code.discountType, code.discountValue, code.expiresAt, "it"),
              ).then(() => { recipientCount += 1; }),
            ),
          );
        }
      }
    }

    // ── Log notification batch ────────────────────────────────────────────
    await db.insert(discountCodeNotificationsTable).values({
      discountCodeId: code.id,
      target,
      notificationType: type,
      recipientCount,
    });
  } catch (err) {
    log.error({ err }, "[discount-codes] notification error");
  }

  return { recipientCount };
}

export { computeDiscountedCents };
export default router;
