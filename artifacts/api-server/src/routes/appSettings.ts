import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  getBoolSetting,
  setSetting,
  SETTING_KEYS,
  isAdoptionsEnabled,
  isCampaignsEnabled,
} from "../lib/appSettings";
import { logger } from "../lib/logger";

const router = Router();

// Public: expose only safe, non-sensitive flags the frontend needs to render UI
router.get("/app-settings/public", async (_req, res) => {
  try {
    const [adoptionsEnabled, campaignsEnabled] = await Promise.all([
      isAdoptionsEnabled(),
      isCampaignsEnabled(),
    ]);
    res.json({ adoptionsEnabled, campaignsEnabled });
  } catch (err) {
    logger.error({ err }, "[appSettings] public read error");
    // Fail-open with defaults so the UI never breaks
    res.json({ adoptionsEnabled: true, campaignsEnabled: true });
  }
});

// Admin: read all toggles
router.get(
  "/admin/app-settings",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const [adoptionsEnabled, campaignsEnabled] = await Promise.all([
        getBoolSetting(SETTING_KEYS.ADOPTIONS_ENABLED),
        getBoolSetting(SETTING_KEYS.CAMPAIGNS_ENABLED),
      ]);
      res.json({ adoptionsEnabled, campaignsEnabled });
    } catch (err) {
      logger.error({ err }, "[appSettings] admin read error");
      res.status(500).json({ error: "Errore lettura impostazioni" });
    }
  },
);

const ToggleBody = z.object({ enabled: z.boolean() });

// Admin: toggle adoptions
router.put(
  "/admin/app-settings/adoptions",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const parsed = ToggleBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Campo 'enabled' booleano richiesto" });
        return;
      }
      const { enabled } = parsed.data;
      const userId = (req as AuthenticatedRequest).userId;
      await setSetting(SETTING_KEYS.ADOPTIONS_ENABLED, enabled ? "true" : "false", userId);
      logger.info({ enabled, userId }, "[appSettings] adoptions toggle changed");
      res.json({ adoptionsEnabled: enabled });
    } catch (err) {
      logger.error({ err }, "[appSettings] toggle adoptions error");
      res.status(500).json({ error: "Errore aggiornamento impostazione" });
    }
  },
);

// Admin: toggle campaigns
router.put(
  "/admin/app-settings/campaigns",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const parsed = ToggleBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Campo 'enabled' booleano richiesto" });
        return;
      }
      const { enabled } = parsed.data;
      const userId = (req as AuthenticatedRequest).userId;
      await setSetting(SETTING_KEYS.CAMPAIGNS_ENABLED, enabled ? "true" : "false", userId);
      logger.info({ enabled, userId }, "[appSettings] campaigns toggle changed");
      res.json({ campaignsEnabled: enabled });
    } catch (err) {
      logger.error({ err }, "[appSettings] toggle campaigns error");
      res.status(500).json({ error: "Errore aggiornamento impostazione" });
    }
  },
);

export default router;
