import { useState, useEffect, useRef } from "react";
import { recordImageLoad, type ImageQuality } from "@/lib/adaptiveQuality";

interface AdaptiveImageProps {
  thumbnailSrc: string;
  fullSrc: string;
  alt: string;
  className?: string;
  /** Current quality decision from the engine */
  quality: ImageQuality;
  /** Whether the engine allows upgrading quality when image is visible and user is still */
  upgradeOnPause: boolean;
  /** Whether to lazy-load (use IntersectionObserver). Default: true */
  lazy?: boolean;
  /** Minimum ms the image must be visible before upgrading quality. Default: 1000 */
  upgradeDelayMs?: number;
}

const MIN_VISIBLE_MS_FOR_QUALITY_UPGRADE = 1000; // spec says <300ms → no upgrade

export default function AdaptiveImage({
  thumbnailSrc,
  fullSrc,
  alt,
  className,
  quality,
  upgradeOnPause,
  lazy = true,
  upgradeDelayMs = MIN_VISIBLE_MS_FOR_QUALITY_UPGRADE,
}: AdaptiveImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const upgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSinceRef = useRef<number | null>(null);
  const qualityLoggedRef = useRef<ImageQuality | null>(null);

  // ---- Intersection Observer: detect in-viewport -------------------------
  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsInView(visible);
        if (visible) {
          visibleSinceRef.current = Date.now();
        } else {
          visibleSinceRef.current = null;
          if (upgradeTimerRef.current) {
            clearTimeout(upgradeTimerRef.current);
            upgradeTimerRef.current = null;
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy]);

  // ---- Decide which src to load ------------------------------------------
  useEffect(() => {
    if (!isInView) {
      setCurrentSrc(null); // don't load if not in viewport
      return;
    }

    // If quality allows high and user clicked (handled externally), show full
    // In the feed, "high" quality via engine is the full src
    const targetSrc = quality === "thumbnail" ? thumbnailSrc : fullSrc;

    if (currentSrc !== targetSrc) {
      setCurrentSrc(targetSrc);
      setIsLoaded(false);
      setIsUpgraded(false);
    }
  }, [isInView, quality, thumbnailSrc, fullSrc]);

  // ---- Upgrade on pause: thumbnail → full after pause -------------------
  useEffect(() => {
    if (!isInView || !upgradeOnPause || isUpgraded) return;
    if (quality !== "thumbnail") return; // already showing better quality
    if (currentSrc !== thumbnailSrc) return;

    // Schedule upgrade after delay
    upgradeTimerRef.current = setTimeout(() => {
      const visibleMs = visibleSinceRef.current ? Date.now() - visibleSinceRef.current : 0;
      if (visibleMs >= upgradeDelayMs) {
        setCurrentSrc(fullSrc);
        setIsUpgraded(true);
        setIsLoaded(false);
        if (qualityLoggedRef.current !== "medium") {
          recordImageLoad("medium");
          qualityLoggedRef.current = "medium";
        }
      }
    }, upgradeDelayMs);

    return () => {
      if (upgradeTimerRef.current) clearTimeout(upgradeTimerRef.current);
    };
  }, [isInView, upgradeOnPause, isUpgraded, quality, currentSrc, thumbnailSrc, fullSrc, upgradeDelayMs]);

  // ---- Record bandwidth on first load ------------------------------------
  function handleLoad() {
    setIsLoaded(true);
    const loadedQuality: ImageQuality =
      currentSrc === thumbnailSrc ? "thumbnail" : isUpgraded ? "medium" : quality;
    if (qualityLoggedRef.current !== loadedQuality) {
      recordImageLoad(loadedQuality);
      qualityLoggedRef.current = loadedQuality;
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          className={`${className ?? ""} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={handleLoad}
          onError={() => {
            // Fallback to thumbnail if full quality fails
            if (currentSrc === fullSrc) setCurrentSrc(thumbnailSrc);
          }}
        />
      ) : (
        // Placeholder while off-screen
        <div className="w-full h-full bg-muted/40" aria-hidden />
      )}
    </div>
  );
}
