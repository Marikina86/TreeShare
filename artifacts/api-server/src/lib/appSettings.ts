import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export const SETTING_KEYS = {
  ADOPTIONS_ENABLED: "adoptions_enabled",
} as const;

export const SETTING_DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.ADOPTIONS_ENABLED]: "true",
};

export async function getSetting(key: string): Promise<string> {
  try {
    const [row] = await db
      .select({ value: appSettingsTable.value })
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, key));
    return row?.value ?? SETTING_DEFAULTS[key] ?? "";
  } catch (err) {
    logger.error({ err, key }, "[appSettings] getSetting error, falling back to default");
    return SETTING_DEFAULTS[key] ?? "";
  }
}

export async function getBoolSetting(key: string): Promise<boolean> {
  const v = await getSetting(key);
  return v === "true" || v === "1";
}

export async function setSetting(
  key: string,
  value: string,
  updatedBy?: string,
): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value, updatedBy: updatedBy ?? null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedBy: updatedBy ?? null, updatedAt: new Date() },
    });
}

export async function isAdoptionsEnabled(): Promise<boolean> {
  return getBoolSetting(SETTING_KEYS.ADOPTIONS_ENABLED);
}
