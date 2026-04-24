import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  getBoolSetting,
  setSetting,
  SETTING_KEYS,
  isAdoptionsEnabled,
} from "../lib/appSettings";
import { logger } from "../lib/logger";

const router = Router();

// Public: expose only safe, non-sensitive flags the frontend needs to render UI
router.get("/app-settings/public", async (_req, res) => {
  try {
    const adoptionsEnabled = await isAdoptionsEnabled();
    res.json({ adoptionsEnabled });
  } catch (err) {
    logger.error({ err }, "[appSettings] public read error");
    // Fail-open with defaults so the UI never breaks
    res.json({ adoptionsEnabled: true });
  }
});

// Admin: read all toggles
router.get(
  "/admin/app-settings",
  requireAuth,
  requireAdmin,
  async (_req, res) => {
    try {
      const adoptionsEnabled = await getBoolSetting(SETTING_KEYS.ADOPTIONS_ENABLED);
      res.json({ adoptionsEnabled });
    } catch (err) {
      logger.error({ err }, "[appSettings] admin read error");
      res.status(500).json({ error: "Errore lettura impostazioni" });
    }
  },
);

// Admin: toggle adoptions
router.put(
  "/admin/app-settings/adoptions",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { enabled } = req.body ?? {};
      if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "Campo 'enabled' booleano richiesto" });
        return;
      }
      const userId = (req as AuthenticatedRequest).userId;
      await setSetting(
        SETTING_KEYS.ADOPTIONS_ENABLED,
        enabled ? "true" : "false",
        userId,
      );
      logger.info({ enabled, userId }, "[appSettings] adoptions toggle changed");
      res.json({ adoptionsEnabled: enabled });
    } catch (err) {
      logger.error({ err }, "[appSettings] toggle adoptions error");
      res.status(500).json({ error: "Errore aggiornamento impostazione" });
    }
  },
);

export default router;
