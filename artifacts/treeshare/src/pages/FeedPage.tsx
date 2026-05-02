import { useState, useEffect, useRef, useCallback } from "react";
import { getListTreesQueryKey, useGetCurrentWeeklyWinners } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import TreeCard from "@/components/TreeCard";
import WeeklyWinnerShareButton from "@/components/WeeklyWinnerShareButton";
import { Link } from "wouter";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import { useFeed } from "@/hooks/useFeed";

interface WeeklyWinnerTree {
  treeId: number;
  userId: string;
  username: string;
  userPhotoUrl?: string | null;
  photoUrl: string;
  photoThumbnailUrl?: string | null;
  plantName?: string | null;
  caption?: string | null;
  species?: string | null;
  latitude: number;
  longitude: number;
  locationName?: string | null;
  country?: string | null;
  province?: string | null;
  sunCount?: number;
  weekSunCount?: number;
  updateCount: number;
  isWeeklyWinner: boolean;
  createdAt: string;
}

async function detectProvince(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=it`
          );
          const data = await resp.json();
          const raw = data.address?.county || data.address?.state || "";
          const clean = raw
            .replace(/^Provincia di /i, "")
            .replace(/^Città metropolitana di /i, "")
            .replace(/^Province of /i, "")
            .trim();
          resolve(clean || null);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 6000 }
    );
  });
}

export default function FeedPage() {
  const [page, setPage] = useState(1);
  const adaptiveQuality = useAdaptiveQuality();
  const limit = adaptiveQuality.batch_size;

  const { data, isLoading, isError, refreshing, lastRefreshResult, refreshBlocked, smartRefresh } =
    useFeed({ page, limit });

  const qualitySettings = {
    image_quality: adaptiveQuality.image_quality,
    upgrade_on_pause: adaptiveQuality.upgrade_on_pause,
  };

  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [detectingProvince, setDetectingProvince] = useState(false);
  const provinceDetectedRef = useRef(false);

  const { data: weeklyWinnersData, isLoading: loadingWinners } =
    useGetCurrentWeeklyWinners();
  const weeklyWinners = (weeklyWinnersData ?? {}) as Record<
    string,
    WeeklyWinnerTree
  >;

  async function handleProvinceToggle() {
    if (provinceFilter) {
      setProvinceFilter(null);
      return;
    }
    if (provinceDetectedRef.current) return;
    setDetectingProvince(true);
    try {
      const prov = await detectProvince();
      if (prov) {
        setProvinceFilter(prov);
        provinceDetectedRef.current = true;
      }
    } finally {
      setDetectingProvince(false);
    }
  }

  // Best winner across all provinces (highest week sun count)
  const topWinner: WeeklyWinnerTree | null = Object.values(weeklyWinners).length > 0
    ? (Object.values(weeklyWinners) as WeeklyWinnerTree[]).reduce((a, b) =>
        (a.weekSunCount ?? 0) >= (b.weekSunCount ?? 0) ? a : b
      )
    : null;

  // With province filter: show that province's winner; without: show the top winner globally
  const provinceWinner: WeeklyWinnerTree | null = provinceFilter
    ? (weeklyWinners[provinceFilter] ?? null)
    : topWinner;

  // The winner is ALWAYS pinned at the top for the whole week
  const showPinnedWinner = !!provinceWinner;

  const allTrees = data?.trees ?? [];
  const filteredTrees = allTrees.filter((t) => {
    // Always exclude the weekly winner from the grid — it's shown pinned at the top
    if (provinceWinner && t.id === provinceWinner.treeId) return false;
    if (provinceFilter) {
      const tp = (t as any).province as string | null | undefined;
      return tp && tp.toLowerCase() === provinceFilter.toLowerCase();
    }
    return true;
  });

  // ── Pull-to-refresh touch handling ──────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullState, setPullState] = useState<"idle" | "pulling" | "refreshing" | "done">("idle");
  const pullThreshold = 80;
  const noChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0 || refreshing || refreshBlocked) return;
    touchStartY.current = e.touches[0].clientY;
    setPullState("pulling");
  }, [refreshing, refreshBlocked]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullState !== "pulling") return;
    const diff = Math.max(0, e.touches[0].clientY - touchStartY.current);
    const dampened = Math.min(diff * 0.5, 140);
    setPullDistance(dampened);
  }, [pullState]);

  const handleTouchEnd = useCallback(async () => {
    if (pullState !== "pulling") return;
    if (pullDistance >= pullThreshold) {
      setPullState("refreshing");
      setPullDistance(pullThreshold);
      await smartRefresh();
      window.dispatchEvent(new Event("treeshare:refresh-inbox"));
      setPullState("done");
      setTimeout(() => {
        setPullDistance(0);
        setPullState("idle");
      }, 600);
    } else {
      setPullDistance(0);
      setPullState("idle");
    }
  }, [pullState, pullDistance, smartRefresh]);

  useEffect(() => {
    if (lastRefreshResult === "no-change") {
      if (noChangeTimeoutRef.current) clearTimeout(noChangeTimeoutRef.current);
      noChangeTimeoutRef.current = setTimeout(() => {
      }, 2000);
    }
    return () => {
      if (noChangeTimeoutRef.current) clearTimeout(noChangeTimeoutRef.current);
    };
  }, [lastRefreshResult]);

  const pullIndicatorText = () => {
    if (pullState === "refreshing") return "Aggiornamento...";
    if (pullState === "done" && lastRefreshResult === "no-change") return "Nessun aggiornamento";
    if (pullState === "done" && lastRefreshResult === "updated") return "Feed aggiornato!";
    if (pullDistance >= pullThreshold) return "Rilascia per aggiornare";
    return "Scorri per aggiornare";
  };

  const isRefreshDisabled = refreshing || refreshBlocked;

  return (
    <Layout>
      <div
        ref={scrollContainerRef}
        className="max-w-6xl mx-auto px-4 py-6 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullState !== "idle" || pullDistance > 0) && (
          <div
            className="flex items-center justify-center gap-2 transition-all duration-200 overflow-hidden"
            style={{ height: pullDistance, marginBottom: pullDistance > 0 ? 8 : 0 }}
          >
            {pullState === "refreshing" ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : pullState === "done" ? (
              lastRefreshResult === "no-change" ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-green-500">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )
            ) : (
              <svg
                width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className={`text-muted-foreground transition-transform ${pullDistance >= pullThreshold ? "rotate-180" : ""}`}
              >
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            <span className={`text-xs font-medium ${pullState === "done" && lastRefreshResult === "no-change" ? "text-muted-foreground" : pullState === "done" ? "text-green-600" : "text-muted-foreground"}`}>
              {pullIndicatorText()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Feed</h1>
            {/* Desktop refresh button */}
            <button
              onClick={() => { if (!isRefreshDisabled) { smartRefresh(); window.dispatchEvent(new Event("treeshare:refresh-inbox")); } }}
              disabled={isRefreshDisabled}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              title={refreshBlocked ? "Limite aggiornamenti raggiunto — riapri l'app per continuare" : "Aggiorna feed"}
            >
              <svg
                width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                className={refreshing ? "animate-spin" : ""}
              >
                <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {refreshing ? "..." : refreshBlocked ? "Aggiornato" : "Aggiorna"}
            </button>
            {refreshBlocked && !refreshing && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full animate-in fade-in duration-300">
                Feed aggiornato
              </span>
            )}
            {!refreshBlocked && lastRefreshResult === "no-change" && !refreshing && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full animate-in fade-in duration-300">
                Nessun aggiornamento
              </span>
            )}
          </div>
          <Link
            href="/post"
            data-testid="link-create-post"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
            Plant a tree
          </Link>
        </div>

        {showPinnedWinner && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌞</span>
              <h2 className="font-bold text-foreground text-base">
                Pianta della Settimana{provinceWinner!.province ? ` — ${provinceWinner!.province}` : provinceFilter ? ` — ${provinceFilter}` : ""}
              </h2>
              {provinceWinner!.weekSunCount !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({provinceWinner!.weekSunCount} 🌞 questa settimana)
                </span>
              )}
              <div className="ml-auto">
                <WeeklyWinnerShareButton
                  treeId={provinceWinner!.treeId}
                  photoUrl={provinceWinner!.photoUrl}
                  plantName={provinceWinner!.plantName}
                  username={provinceWinner!.username}
                  province={provinceWinner!.province ?? provinceFilter}
                  weekSunCount={provinceWinner!.weekSunCount}
                />
              </div>
            </div>
            <div className="ring-2 ring-amber-400 rounded-2xl overflow-hidden shadow-lg">
              <TreeCard
                qualitySettings={qualitySettings}
                tree={{
                  id: provinceWinner!.treeId,
                  userId: provinceWinner!.userId,
                  username: provinceWinner!.username,
                  userPhotoUrl: provinceWinner!.userPhotoUrl,
                  photoUrl: provinceWinner!.photoUrl,
                  photoThumbnailUrl: provinceWinner!.photoThumbnailUrl,
                  plantName: provinceWinner!.plantName,
                  caption: provinceWinner!.caption,
                  species: provinceWinner!.species,
                  latitude: provinceWinner!.latitude,
                  longitude: provinceWinner!.longitude,
                  locationName: provinceWinner!.locationName,
                  country: provinceWinner!.country,
                  province: provinceWinner!.province,
                  updateCount: provinceWinner!.updateCount,
                  sunCount: provinceWinner!.sunCount,
                  isWeeklyWinner: true,
                  createdAt: provinceWinner!.createdAt,
                }}
              />
            </div>
          </div>
        )}

        {provinceFilter && !loadingWinners && !provinceWinner && (
          <div className="mb-4 text-sm text-muted-foreground text-center py-2">
            Nessuna Pianta della Settimana per {provinceFilter} questa settimana.
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Failed to load feed. Please try again.</p>
          </div>
        )}

        {data && filteredTrees.length === 0 && !showPinnedWinner && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path d="M12 2C12 2 5 8 5 14C5 18.418 8.134 22 12 22C15.866 22 19 18.418 19 14C19 8 12 2 12 2Z"/>
                <path d="M12 22V14" strokeLinecap="round"/>
              </svg>
            </div>
            {provinceFilter ? (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Nessuna pianta in {provinceFilter}
                </h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Non ci sono ancora piante in questa provincia.
                </p>
                <button
                  type="button"
                  onClick={() => setProvinceFilter(null)}
                  className="text-primary text-sm underline"
                >
                  Vedi tutte le piante
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-2">No trees yet</h2>
                <p className="text-muted-foreground text-sm mb-4">Be the first to plant a tree and share it!</p>
                <Link href="/post" data-testid="link-empty-post" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
                  Plant the first tree
                </Link>
              </>
            )}
          </div>
        )}

        {data && filteredTrees.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrees.map((tree) => (
                <div
                  key={tree.id}
                  className={(tree as any).isWeeklyWinner ? "ring-2 ring-amber-400 rounded-2xl overflow-hidden" : ""}
                >
                  <TreeCard tree={tree as any} qualitySettings={qualitySettings} />
                </div>
              ))}
            </div>

            {!provinceFilter && data.total > limit && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(data.total / limit)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / limit)}
                  data-testid="button-next-page"
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
