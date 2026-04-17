import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import ReportModal from "./ReportModal";
import SunButton from "./SunButton";
import AdaptiveImage from "./AdaptiveImage";
import type { ImageQuality } from "@/lib/adaptiveQuality";

interface TreePost {
  id: number;
  userId: string;
  username: string;
  userPhotoUrl?: string | null;
  photoUrl: string;
  photoThumbnailUrl?: string | null;
  plantName?: string | null;
  caption?: string | null;
  species?: string | null;
  plantedAt?: string | null;
  latitude: number;
  longitude: number;
  locationName?: string | null;
  country?: string | null;
  province?: string | null;
  updateCount: number;
  photoStatus?: string | null;
  sunCount?: number;
  userHasSunned?: boolean;
  isWeeklyWinner?: boolean;
  createdAt: string;
}

interface QualitySettings {
  image_quality: ImageQuality;
  upgrade_on_pause: boolean;
}

interface TreeCardProps {
  tree: TreePost;
  qualitySettings?: QualitySettings;
}

function photoSrc(url: string) {
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function TreeCard({ tree, qualitySettings }: TreeCardProps) {
  const { isSignedIn, userId } = useAuth();
  const [showReport, setShowReport] = useState(false);

  const date = new Date(tree.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const plantedDate = tree.plantedAt
    ? new Date(tree.plantedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  const canReport = isSignedIn && userId !== tree.userId;

  return (
    <>
      <article
        data-testid={`card-tree-${tree.id}`}
        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      >
        <Link href={`/tree/${tree.id}`}>
          <div className="relative aspect-video overflow-hidden bg-black/5 dark:bg-white/5">
            <AdaptiveImage
              thumbnailSrc={photoSrc(tree.photoThumbnailUrl ?? tree.photoUrl)}
              fullSrc={photoSrc(tree.photoUrl)}
              alt={tree.species ?? "Tree"}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              quality={qualitySettings?.image_quality ?? "thumbnail"}
              upgradeOnPause={qualitySettings?.upgrade_on_pause ?? false}
            />
            {tree.isWeeklyWinner && (
              <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                🌞 Pianta della Settimana
              </div>
            )}
            {!tree.isWeeklyWinner && tree.photoStatus === "pending" && (
              <div className="absolute top-3 left-3 bg-amber-500/90 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                In revisione
              </div>
            )}
            {tree.updateCount > 0 && (
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
                {tree.updateCount} update{tree.updateCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </Link>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarSrc(tree.userPhotoUrl) ? (
                <img src={avatarSrc(tree.userPhotoUrl)!} alt={tree.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-semibold text-sm">{tree.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${tree.userId}`} data-testid={`link-user-${tree.userId}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block">
                {tree.username}
              </Link>
              <div className="text-xs text-muted-foreground">{date}</div>
            </div>
            {canReport && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                title="Segnala"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          {tree.plantName && (
            <h3 className="font-semibold text-sm text-foreground mb-1 truncate">🌱 {tree.plantName}</h3>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tree.species && (
              <div className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {tree.species}
              </div>
            )}
            {plantedDate && (
              <div className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {plantedDate}
              </div>
            )}
          </div>
          {tree.caption && (
            <p className="text-sm text-foreground line-clamp-2 mb-2" data-testid={`text-caption-${tree.id}`}>{tree.caption}</p>
          )}
          <div className="flex items-center justify-between mt-2 mb-1">
            <SunButton
              treeId={tree.id}
              initialCount={tree.sunCount ?? 0}
              initialSunned={tree.userHasSunned ?? false}
              size="sm"
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 ml-2">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <span className="truncate">{tree.locationName ?? tree.country ?? `${tree.latitude.toFixed(4)}, ${tree.longitude.toFixed(4)}`}</span>
            </div>
          </div>
        </div>
      </article>

      {showReport && (
        <ReportModal
          targetType="tree"
          reportedUserId={tree.userId}
          reportedUsername={tree.username}
          treeId={tree.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
