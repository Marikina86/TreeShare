import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { smartEncode } from "@/lib/imageUtils";

interface Props {
  photoUrl: string;
  treeId: number;
  plantName?: string | null;
  username: string;
  province?: string | null;
  weekSunCount?: number;
}

type ShareFormat = "feed" | "story";

function resolvePhoto(url: string) {
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

interface Layout {
  W: number;
  H: number;
  photoAreaH: number;
  bottomBarH: number;
  pad: number;
  logoSize: number;
  brandFont: number;
  badgeFont: number;
  provFont: number;
  titleFont: number;
  authorFont: number;
  sunsFont: number;
  subFont: number;
  ctaFont: number;
}

const FEED_LAYOUT: Layout = {
  W: 1080,
  H: 1350,
  photoAreaH: 1080,
  bottomBarH: 270,
  pad: 60,
  logoSize: 96,
  brandFont: 44,
  badgeFont: 40,
  provFont: 28,
  titleFont: 56,
  authorFont: 32,
  sunsFont: 80,
  subFont: 30,
  ctaFont: 26,
};

const STORY_LAYOUT: Layout = {
  W: 1080,
  H: 1920,
  photoAreaH: 1440,
  bottomBarH: 480,
  pad: 72,
  logoSize: 112,
  brandFont: 52,
  badgeFont: 46,
  provFont: 32,
  titleFont: 64,
  authorFont: 36,
  sunsFont: 110,
  subFont: 36,
  ctaFont: 30,
};

async function composeShareImage(
  props: Props,
  format: ShareFormat,
): Promise<Blob> {
  const L = format === "story" ? STORY_LAYOUT : FEED_LAYOUT;

  const canvas = document.createElement("canvas");
  canvas.width = L.W;
  canvas.height = L.H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0b0f0a";
  ctx.fillRect(0, 0, L.W, L.H);

  const photo = await loadImage(resolvePhoto(props.photoUrl));

  const scale = Math.max(L.W / photo.width, L.photoAreaH / photo.height);
  const dw = photo.width * scale;
  const dh = photo.height * scale;
  const dx = (L.W - dw) / 2;
  const dy = (L.photoAreaH - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, L.W, L.photoAreaH);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();

  const topGradH = Math.round(L.photoAreaH * 0.24);
  const grad = ctx.createLinearGradient(0, 0, 0, topGradH);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, L.W, topGradH);

  const botGradH = Math.round(L.photoAreaH * 0.24);
  const grad2 = ctx.createLinearGradient(
    0,
    L.photoAreaH - botGradH,
    0,
    L.photoAreaH,
  );
  grad2.addColorStop(0, "rgba(0,0,0,0)");
  grad2.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = grad2;
  ctx.fillRect(0, L.photoAreaH - botGradH, L.W, botGradH);

  try {
    const logo = await loadImage("/icon-512.png");
    ctx.save();
    ctx.beginPath();
    ctx.arc(
      L.pad + L.logoSize / 2,
      L.pad + L.logoSize / 2,
      L.logoSize / 2,
      0,
      Math.PI * 2,
    );
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logo, L.pad, L.pad, L.logoSize, L.logoSize);
    ctx.restore();
  } catch {
    // logo optional
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${L.brandFont}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText("TreeShare", L.pad + L.logoSize + 24, L.pad + L.logoSize / 2);
  ctx.shadowBlur = 0;

  const badgeText = "🌞 WEEKLY WINNER";
  ctx.font = `800 ${L.badgeFont}px system-ui, -apple-system, sans-serif`;
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadX = Math.round(L.badgeFont * 0.7);
  const badgeW = badgeMetrics.width + badgePadX * 2;
  const badgeH = Math.round(L.badgeFont * 1.9);
  const badgeX = L.W - badgeW - L.pad;
  const badgeY = L.pad;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.fillStyle = "#3f2d04";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH / 2 + 2);

  if (props.province) {
    const provText = props.province.toUpperCase();
    ctx.font = `600 ${L.provFont}px system-ui, -apple-system, sans-serif`;
    const provMetrics = ctx.measureText(provText);
    const ppx = Math.round(L.provFont * 0.65);
    const pw = provMetrics.width + ppx * 2;
    const ph = Math.round(L.provFont * 1.7);
    const px = badgeX + badgeW - pw;
    const py = badgeY + badgeH + 14;
    drawRoundedRect(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(provText, px + ppx, py + ph / 2 + 1);
  }

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.font = `800 ${L.titleFont}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "alphabetic";
  const title = props.plantName
    ? `🌱 ${props.plantName}`
    : "Pianta della Settimana";
  ctx.fillText(
    title,
    L.pad,
    L.photoAreaH - L.pad - L.authorFont - 12,
  );

  ctx.font = `500 ${L.authorFont}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(`@${props.username}`, L.pad, L.photoAreaH - L.pad);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#0b0f0a";
  ctx.fillRect(0, L.photoAreaH, L.W, L.bottomBarH);

  const bottomCenter = L.photoAreaH + L.bottomBarH / 2;

  ctx.fillStyle = "#fbbf24";
  ctx.font = `800 ${L.sunsFont}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = "middle";
  const sunsLine = `🌞 ${props.weekSunCount ?? 0}`;
  const sunsMetrics = ctx.measureText(sunsLine);
  ctx.fillText(
    sunsLine,
    (L.W - sunsMetrics.width) / 2,
    bottomCenter - L.subFont - 16,
  );

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `500 ${L.subFont}px system-ui, -apple-system, sans-serif`;
  const sub = "soli ricevuti questa settimana";
  const subMetrics = ctx.measureText(sub);
  ctx.fillText(sub, (L.W - subMetrics.width) / 2, bottomCenter + 28);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${L.ctaFont}px system-ui, -apple-system, sans-serif`;
  const cta = "treeshare.app";
  const ctaMetrics = ctx.measureText(cta);
  ctx.fillText(
    cta,
    (L.W - ctaMetrics.width) / 2,
    L.photoAreaH + L.bottomBarH - L.pad,
  );

  const targetBytes = format === "story" ? 320 * 1024 : 250 * 1024;
  return smartEncode(canvas, targetBytes);
}

interface PreviewState {
  blob: Blob;
  objectUrl: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface ModalProps extends Props {
  onClose: () => void;
}

function PreviewModal(props: ModalProps) {
  const { toast } = useToast();
  const [feedPrev, setFeedPrev] = useState<PreviewState | null>(null);
  const [storyPrev, setStoryPrev] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState<ShareFormat | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrls: string[] = [];

    (async () => {
      try {
        const [feedBlob, storyBlob] = await Promise.all([
          composeShareImage(props, "feed"),
          composeShareImage(props, "story"),
        ]);
        if (cancelled) return;
        const feedUrl = URL.createObjectURL(feedBlob);
        const storyUrl = URL.createObjectURL(storyBlob);
        createdUrls = [feedUrl, storyUrl];
        setFeedPrev({ blob: feedBlob, objectUrl: feedUrl });
        setStoryPrev({ blob: storyBlob, objectUrl: storyUrl });
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Impossibile generare l'anteprima");
        }
      }
    })();

    return () => {
      cancelled = true;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function shareFormat(format: ShareFormat) {
    const prev = format === "feed" ? feedPrev : storyPrev;
    if (!prev || sharing) return;
    setSharing(format);
    try {
      const ext = prev.blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File(
        [prev.blob],
        `treeshare-weekly-winner-${format}-${props.treeId}.${ext}`,
        { type: prev.blob.type || "image/jpeg" },
      );

      const baseUrl =
        window.location.origin +
        (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const url = `${baseUrl}/tree/${props.treeId}`;
      const title = "🌞 Pianta della Settimana — TreeShare";
      const text = props.plantName
        ? `${props.plantName} è la Pianta della Settimana${props.province ? ` in ${props.province}` : ""}!`
        : `Questa è la Pianta della Settimana${props.province ? ` in ${props.province}` : ""}!`;

      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };

      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text, url });
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      const a = document.createElement("a");
      a.href = prev.objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: "Immagine scaricata",
        description: "Pronta da condividere!",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Impossibile condividere",
        description: "Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setSharing(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={props.onClose}
      data-testid="modal-share-weekly-winner"
    >
      <div
        className="bg-card text-card-foreground rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌞</span>
            <h3 className="font-bold text-base">
              Condividi la Pianta della Settimana
            </h3>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Chiudi"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-6 text-center text-sm text-destructive">{error}</div>
        )}

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["feed", "story"] as const).map((format) => {
            const prev = format === "feed" ? feedPrev : storyPrev;
            const ratio = format === "feed" ? "4:5" : "9:16";
            const label = format === "feed" ? "Feed" : "Story";
            const aspect = format === "feed" ? "aspect-[4/5]" : "aspect-[9/16]";
            return (
              <div key={format} className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">
                    {label} <span className="text-xs text-muted-foreground font-normal">({ratio})</span>
                  </div>
                  {prev && (
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(prev.blob.size)} ·{" "}
                      {prev.blob.type === "image/webp" ? "WebP" : "JPEG"}
                    </div>
                  )}
                </div>
                <div className={`w-full ${aspect} bg-muted rounded-xl overflow-hidden flex items-center justify-center`}>
                  {prev ? (
                    <img
                      src={prev.objectUrl}
                      alt={`Anteprima ${label}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => shareFormat(format)}
                  disabled={!prev || sharing !== null}
                  data-testid={`button-share-weekly-winner-${format}`}
                  className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-400 text-amber-950 text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
                >
                  {sharing === format ? (
                    <span className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  Condividi {label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyWinnerShareButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="button-share-weekly-winner"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-semibold hover:bg-amber-300 transition-colors"
        title="Condividi la Pianta della Settimana"
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Condividi
      </button>
      {open && <PreviewModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
