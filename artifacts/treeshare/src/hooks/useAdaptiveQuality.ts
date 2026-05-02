import { useState, useEffect, useRef, useCallback } from "react";
import {
  computeOptimizationSettings,
  detectNetworkSpeed,
  detectDataSaverMode,
  detectDeviceType,
  getTodayBandwidthMB,
  getTodayImagesLoaded,
  DEFAULT_DAILY_BUDGET_MB,
  type OptimizationOutput,
  type ScrollSpeed,
  type EngagementLevel,
  type NetworkSpeed,
} from "@/lib/adaptiveQuality";

interface AdaptiveQualityState extends OptimizationOutput {
  networkSpeed: NetworkSpeed;
  scrollSpeed: ScrollSpeed;
  bandwidthMB: number;
  dailyBudgetMB: number;
}

const SCROLL_FAST_THRESHOLD = 800;  // px/s
const SCROLL_SLOW_THRESHOLD = 150;  // px/s
const MONTHLY_COST_PERCENT = 0;     // set by backend config if needed

export function useAdaptiveQuality() {
  const [state, setState] = useState<AdaptiveQualityState>(() => {
    const deviceType = detectDeviceType();
    const dailyBudgetMB = DEFAULT_DAILY_BUDGET_MB[deviceType];
    const defaultInput = {
      networkSpeed: "medium" as NetworkSpeed,
      scrollSpeed: "normal" as ScrollSpeed,
      engagement: "medium" as EngagementLevel,
      imagesToday: 0,
      sessionDurationSec: 0,
      estimatedBandwidthMB: 0,
      dailyBudgetMB,
      monthlyCostPercent: MONTHLY_COST_PERCENT,
      deviceType,
      dataSaverMode: false,
    };
    return {
      networkSpeed: "medium",
      scrollSpeed: "normal",
      bandwidthMB: 0,
      dailyBudgetMB,
      ...computeOptimizationSettings(defaultInput),
    };
  });

  // --- Scroll speed tracking -----------------------------------------------
  const scrollRef = useRef({ lastY: 0, lastTime: Date.now(), speed: 0 });
  const scrollSpeedRef = useRef<ScrollSpeed>("normal");
  const sessionStartRef = useRef(Date.now());
  const engagementRef = useRef<{ suns: number; clicks: number }>({ suns: 0, clicks: 0 });

  useEffect(() => {
    function onScroll() {
      const now = Date.now();
      const y = window.scrollY;
      const dt = (now - scrollRef.current.lastTime) / 1000; // seconds
      if (dt > 0.05) {
        const dy = Math.abs(y - scrollRef.current.lastY);
        scrollRef.current.speed = dy / dt;
        scrollRef.current.lastY = y;
        scrollRef.current.lastTime = now;

        if (scrollRef.current.speed > SCROLL_FAST_THRESHOLD) {
          scrollSpeedRef.current = "fast";
        } else if (scrollRef.current.speed < SCROLL_SLOW_THRESHOLD) {
          scrollSpeedRef.current = "slow";
        } else {
          scrollSpeedRef.current = "normal";
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- Engagement tracking (sun clicks, image clicks) ----------------------
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-sun-button]")) engagementRef.current.suns++;
      if (target.closest("article")) engagementRef.current.clicks++;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // --- On-demand recompute (no polling) ------------------------------------
  useEffect(() => {
    function recompute() {
      const deviceType = detectDeviceType();
      const networkSpeed = detectNetworkSpeed();
      const dataSaverMode = detectDataSaverMode();
      const dailyBudgetMB = DEFAULT_DAILY_BUDGET_MB[deviceType];
      const estimatedBandwidthMB = getTodayBandwidthMB();
      const imagesToday = getTodayImagesLoaded();
      const sessionDurationSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const { suns, clicks } = engagementRef.current;

      const engagement: EngagementLevel =
        suns > 5 || clicks > 20 ? "high" :
        suns > 1 || clicks > 5 ? "medium" : "low";

      const settings = computeOptimizationSettings({
        networkSpeed,
        scrollSpeed: scrollSpeedRef.current,
        engagement,
        imagesToday,
        sessionDurationSec,
        estimatedBandwidthMB,
        dailyBudgetMB,
        monthlyCostPercent: MONTHLY_COST_PERCENT,
        deviceType,
        dataSaverMode,
      });

      setState((prev) => {
        if (
          prev.image_quality === settings.image_quality &&
          prev.preload === settings.preload &&
          prev.batch_size === settings.batch_size &&
          prev.upgrade_on_pause === settings.upgrade_on_pause &&
          prev.cost_saving_mode === settings.cost_saving_mode
        ) {
          return prev;
        }
        return {
          networkSpeed,
          scrollSpeed: scrollSpeedRef.current,
          bandwidthMB: estimatedBandwidthMB,
          dailyBudgetMB,
          ...settings,
        };
      });
    }

    // Compute once on mount
    recompute();

    // Recompute when network conditions change (no timer needed)
    const conn = (navigator as any).connection;
    if (conn) conn.addEventListener("change", recompute);

    // Recompute when tab becomes visible again (user returns to app)
    document.addEventListener("visibilitychange", recompute);

    return () => {
      if (conn) conn.removeEventListener("change", recompute);
      document.removeEventListener("visibilitychange", recompute);
    };
  }, []);

  // Force an immediate recompute (e.g. after loading images)
  const recomputeNow = useCallback(() => {
    const deviceType = detectDeviceType();
    const networkSpeed = detectNetworkSpeed();
    const dataSaverMode = detectDataSaverMode();
    const dailyBudgetMB = DEFAULT_DAILY_BUDGET_MB[deviceType];
    const settings = computeOptimizationSettings({
      networkSpeed,
      scrollSpeed: scrollSpeedRef.current,
      engagement: "medium",
      imagesToday: getTodayImagesLoaded(),
      sessionDurationSec: Math.floor((Date.now() - sessionStartRef.current) / 1000),
      estimatedBandwidthMB: getTodayBandwidthMB(),
      dailyBudgetMB,
      monthlyCostPercent: MONTHLY_COST_PERCENT,
      deviceType,
      dataSaverMode,
    });
    setState({ networkSpeed, scrollSpeed: scrollSpeedRef.current, bandwidthMB: getTodayBandwidthMB(), dailyBudgetMB, ...settings });
  }, []);

  return { ...state, recomputeNow };
}

export type AdaptiveQualityResult = ReturnType<typeof useAdaptiveQuality>;
