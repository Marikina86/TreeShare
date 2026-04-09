import { useState, useEffect, useRef } from "react";
import { useListTrees, getListTreesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import TreeCard from "@/components/TreeCard";
import { Link } from "wouter";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";

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

/** Detect province from GPS + Nominatim reverse geocoding */
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

  // Adaptive quality engine
  const adaptiveQuality = useAdaptiveQuality();
  const limit = adaptiveQuality.batch_size; // dynamic batch size

  const { data, isLoading, isError } = useListTrees(
    { page, limit },
    { query: { queryKey: getListTreesQueryKey({ page, limit }) } }
  );

  const qualitySettings = {
    image_quality: adaptiveQuality.image_quality,
    upgrade_on_pause: adaptiveQuality.upgrade_on_pause,
  };

  // Province filter state
  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [detectingProvince, setDetectingProvince] = useState(false);
  const provinceDetectedRef = useRef(false);

  // Weekly winner for the current province
  // weeklyWinners is kept for province-filter compatibility (button removed, always empty)
  const [weeklyWinners] = useState<Record<string, WeeklyWinnerTree>>({});
  const loadingWinners = false;

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

  // Filter trees by province when filter is active
  const allTrees = data?.trees ?? [];
  const filteredTrees = provinceFilter
    ? allTrees.filter((t) => {
        const tp = (t as any).province as string | null | undefined;
        return tp && tp.toLowerCase() === provinceFilter.toLowerCase();
      })
    : allTrees;

  // Get this province's weekly winner (if filter active)
  const provinceWinner: WeeklyWinnerTree | null = provinceFilter
    ? (weeklyWinners[provinceFilter] ?? null)
    : null;

  // Deduplicate: if winner is already in the filtered list, don't show it twice
  const winnerAlreadyInFeed = provinceWinner
    ? filteredTrees.some((t) => t.id === provinceWinner.treeId)
    : false;

  const showPinnedWinner = provinceWinner && !winnerAlreadyInFeed;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Feed</h1>
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

        {/* Pinned weekly winner banner */}
        {showPinnedWinner && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🌞</span>
              <h2 className="font-bold text-foreground text-base">
                Pianta della Settimana — {provinceFilter}
              </h2>
              {provinceWinner!.weekSunCount !== undefined && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({provinceWinner!.weekSunCount} 🌞 questa settimana)
                </span>
              )}
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

        {/* Show winners inline (already in feed) */}
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

            {/* Pagination (hidden when province filter active — all results shown) */}
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
