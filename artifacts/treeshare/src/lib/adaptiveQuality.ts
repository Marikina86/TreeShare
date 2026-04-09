/**
 * Adaptive Image Quality Engine
 * Pure logic — no React dependencies.
 * Computes optimal image serving parameters based on real-time inputs.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NetworkSpeed = "slow" | "medium" | "fast";
export type ScrollSpeed = "slow" | "normal" | "fast";
export type EngagementLevel = "low" | "medium" | "high";
export type DeviceType = "mobile" | "desktop";
export type ImageQuality = "thumbnail" | "medium" | "high";
export type RestrictionLevel = "none" | "low" | "medium" | "high";
export type CostSavingMode = "off" | "moderate" | "aggressive" | "emergency";

export interface OptimizationInput {
  networkSpeed: NetworkSpeed;
  scrollSpeed: ScrollSpeed;
  engagement: EngagementLevel;
  imagesToday: number;
  sessionDurationSec: number;
  estimatedBandwidthMB: number;
  dailyBudgetMB: number;
  monthlyCostPercent: number; // 0-100: how much of the monthly system budget is used
  deviceType: DeviceType;
  dataSaverMode: boolean;
}

export interface OptimizationOutput {
  image_quality: ImageQuality;
  preload: boolean;
  preload_limit: number;
  batch_size: number;
  upgrade_on_pause: boolean;
  user_restriction_level: RestrictionLevel;
  cost_saving_mode: CostSavingMode;
  actions: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Estimated byte sizes for bandwidth accounting */
export const ESTIMATED_SIZES = {
  thumbnail: 40 * 1024,  // ~40 KB
  medium: 150 * 1024,    // ~150 KB (not used yet, mapped to full for now)
  high: 400 * 1024,      // ~400 KB
} as const;

/** Default daily bandwidth budgets per device type (MB) */
export const DEFAULT_DAILY_BUDGET_MB = {
  mobile: 50,
  desktop: 200,
} as const;

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

export function computeOptimizationSettings(input: OptimizationInput): OptimizationOutput {
  const {
    networkSpeed,
    scrollSpeed,
    estimatedBandwidthMB,
    dailyBudgetMB,
    monthlyCostPercent,
    deviceType,
    dataSaverMode,
  } = input;

  const actions: string[] = [];

  // ---- Daily user budget percentage ----------------------------------------
  const dailyBudgetPercent =
    dailyBudgetMB > 0 ? (estimatedBandwidthMB / dailyBudgetMB) * 100 : 0;

  // ---- Cost saving mode (system-wide) --------------------------------------
  let cost_saving_mode: CostSavingMode = "off";
  if (monthlyCostPercent >= 90) {
    cost_saving_mode = "emergency";
    actions.push("SYSTEM:emergency_mode_monthly_budget_90pct");
  } else if (monthlyCostPercent >= 75) {
    cost_saving_mode = "aggressive";
    actions.push("SYSTEM:aggressive_saving_monthly_budget_75pct");
  } else if (monthlyCostPercent >= 50) {
    cost_saving_mode = "moderate";
    actions.push("SYSTEM:moderate_saving_monthly_budget_50pct");
  }

  // ---- User restriction level (per-user daily budget) ----------------------
  let user_restriction_level: RestrictionLevel = "none";
  if (dailyBudgetPercent >= 100) {
    user_restriction_level = "high";
    actions.push("USER:daily_budget_exhausted");
  } else if (dailyBudgetPercent >= 90) {
    user_restriction_level = "medium";
    actions.push("USER:daily_budget_90pct");
  } else if (dailyBudgetPercent >= 70) {
    user_restriction_level = "low";
    actions.push("USER:daily_budget_70pct");
  }

  const isEmergency =
    cost_saving_mode === "emergency" || user_restriction_level === "high";
  const isHighlySaving =
    cost_saving_mode === "aggressive" || user_restriction_level === "medium";

  // ---- Image quality -------------------------------------------------------
  let image_quality: ImageQuality;

  if (isEmergency) {
    image_quality = "thumbnail";
    actions.push("QUALITY:forced_thumbnail_emergency");
  } else if (dataSaverMode) {
    image_quality = "thumbnail";
    actions.push("QUALITY:thumbnail_data_saver");
  } else if (networkSpeed === "slow") {
    image_quality = "thumbnail";
    actions.push("QUALITY:thumbnail_slow_network");
  } else if (scrollSpeed === "fast") {
    image_quality = "thumbnail";
    actions.push("QUALITY:thumbnail_fast_scroll");
  } else if (isHighlySaving) {
    image_quality = "thumbnail";
    actions.push("QUALITY:thumbnail_budget_restricted");
  } else {
    // Default: medium quality while scrolling; high only on explicit action
    image_quality = "medium";
  }

  // ---- Preload control -----------------------------------------------------
  let preload: boolean;
  let preload_limit: number;

  if (isEmergency || dailyBudgetPercent >= 100) {
    preload = false;
    preload_limit = 0;
    actions.push("PRELOAD:disabled_emergency");
  } else if (scrollSpeed === "fast") {
    preload = false;
    preload_limit = 0;
    actions.push("PRELOAD:disabled_fast_scroll");
  } else if (scrollSpeed === "slow") {
    preload = true;
    preload_limit = deviceType === "mobile" ? 10 : 15;
    actions.push("PRELOAD:aggressive_slow_scroll");
  } else {
    // Normal scroll
    preload = !isHighlySaving;
    preload_limit = isHighlySaving ? 0 : 5;
    if (!preload) actions.push("PRELOAD:disabled_budget_saving");
  }

  // ---- Batch size ----------------------------------------------------------
  let batch_size: number;

  if (isEmergency || dailyBudgetPercent >= 90) {
    batch_size = 5;
    actions.push("BATCH:minimum_5_emergency");
  } else if (dailyBudgetPercent >= 70 || cost_saving_mode === "aggressive") {
    batch_size = 8;
    actions.push("BATCH:reduced_8_saving");
  } else if (networkSpeed === "slow" || cost_saving_mode === "moderate") {
    batch_size = 8;
  } else if (cost_saving_mode === "off" && networkSpeed === "fast") {
    batch_size = deviceType === "mobile" ? 12 : 15;
  } else {
    batch_size = 10;
  }
  // Hard cap per spec
  batch_size = Math.min(batch_size, 15);

  // ---- Upgrade on pause ----------------------------------------------------
  // Allow thumbnail → medium upgrade when user stops scrolling, only if not saving/slow
  const upgrade_on_pause =
    !isEmergency &&
    !isHighlySaving &&
    !dataSaverMode &&
    networkSpeed !== "slow" &&
    scrollSpeed !== "fast";

  return {
    image_quality,
    preload,
    preload_limit,
    batch_size,
    upgrade_on_pause,
    user_restriction_level,
    cost_saving_mode,
    actions,
  };
}

// ---------------------------------------------------------------------------
// Bandwidth tracking helpers (localStorage-backed, resets daily)
// ---------------------------------------------------------------------------

const STORAGE_KEY = "aq_bandwidth";

interface BandwidthRecord {
  date: string; // YYYY-MM-DD
  totalBytes: number;
  imagesLoaded: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRecord(): BandwidthRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const rec: BandwidthRecord = JSON.parse(raw);
    if (rec.date !== todayKey()) throw new Error("stale");
    return rec;
  } catch {
    return { date: todayKey(), totalBytes: 0, imagesLoaded: 0 };
  }
}

function writeRecord(rec: BandwidthRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  } catch {
    // localStorage not available
  }
}

export function recordImageLoad(quality: ImageQuality): void {
  const rec = readRecord();
  rec.totalBytes += ESTIMATED_SIZES[quality];
  rec.imagesLoaded += 1;
  writeRecord(rec);
}

export function getTodayBandwidthMB(): number {
  return readRecord().totalBytes / (1024 * 1024);
}

export function getTodayImagesLoaded(): number {
  return readRecord().imagesLoaded;
}

// ---------------------------------------------------------------------------
// Network speed detection
// ---------------------------------------------------------------------------

export function detectNetworkSpeed(): NetworkSpeed {
  const conn = (navigator as any).connection ??
    (navigator as any).mozConnection ??
    (navigator as any).webkitConnection;

  if (!conn) return "medium"; // fallback

  // effectiveType: "slow-2g" | "2g" | "3g" | "4g"
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return "slow";
  if (conn.effectiveType === "3g") return "medium";
  if (conn.effectiveType === "4g") return "fast";

  // Fallback to downlink (Mbps)
  if (conn.downlink !== undefined) {
    if (conn.downlink < 1) return "slow";
    if (conn.downlink < 5) return "medium";
    return "fast";
  }

  return "medium";
}

export function detectDataSaverMode(): boolean {
  const conn = (navigator as any).connection ??
    (navigator as any).mozConnection ??
    (navigator as any).webkitConnection;
  return conn?.saveData === true;
}

export function detectDeviceType(): DeviceType {
  return window.innerWidth < 768 ? "mobile" : "desktop";
}
