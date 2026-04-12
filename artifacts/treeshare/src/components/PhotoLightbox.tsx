import { useState, useEffect, useCallback } from "react";

function photoSrc(url: string) {
  if (url.startsWith("http")) return url;
  return `/api/storage${url.startsWith("/") ? "" : "/"}${url}`;
}

export function CampaignPhotoGrid({ photos, className }: {
  photos: string[];
  className?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div
        className={`${photos.length === 1 ? "" : "grid gap-2"} ${className || ""}`}
        style={photos.length > 1 ? { gridTemplateColumns: `repeat(${Math.min(photos.length, 3)}, 1fr)` } : undefined}
      >
        {photos.map((photo, i) => (
          <img
            key={i}
            src={photoSrc(photo)}
            alt=""
            onClick={() => setLightboxIndex(i)}
            className={`rounded-xl object-cover border border-border w-full cursor-pointer hover:opacity-90 transition-opacity ${photos.length === 1 ? "max-h-52" : "h-28"}`}
          />
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}

export function CampaignPhotoGridCompact({ photos, className }: {
  photos: string[];
  className?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div
        className={`${photos.length === 1 ? "" : "grid gap-2"} ${className || ""}`}
        style={photos.length > 1 ? { gridTemplateColumns: `repeat(${Math.min(photos.length, 3)}, 1fr)` } : undefined}
      >
        {photos.map((photo, i) => (
          <img
            key={i}
            src={photoSrc(photo)}
            alt=""
            onClick={() => setLightboxIndex(i)}
            className={`rounded-xl object-cover border border-emerald-200 dark:border-emerald-800 w-full cursor-pointer hover:opacity-90 transition-opacity ${photos.length === 1 ? "max-h-48" : "h-24"}`}
          />
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}

export function ManagerPhotoThumbnails({ photos, onRemove, campaignId }: {
  photos: string[];
  onRemove: (index: number) => void;
  campaignId: number;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {photos.map((photo, i) => (
          <div key={i} className="relative flex-shrink-0 group">
            <img
              src={photoSrc(photo)}
              alt=""
              onClick={() => setLightboxIndex(i)}
              className="w-20 h-20 rounded-xl object-cover border border-border cursor-pointer hover:opacity-90 transition-opacity"
            />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}

function Lightbox({ photos, currentIndex, onClose, onChange }: {
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const hasMultiple = photos.length > 1;

  const handlePrev = useCallback(() => {
    onChange((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onChange]);

  const handleNext = useCallback(() => {
    onChange((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onChange]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultiple) handlePrev();
      if (e.key === "ArrowRight" && hasMultiple) handleNext();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrev, handleNext, hasMultiple]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors"
      >
        ×
      </button>

      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          className="absolute left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-colors"
        >
          ‹
        </button>
      )}

      <img
        src={photoSrc(photos[currentIndex])}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
      />

      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          className="absolute right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-colors"
        >
          ›
        </button>
      )}

      {hasMultiple && (
        <div className="absolute bottom-6 z-10 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onChange(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
