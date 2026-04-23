import { useState } from "react";
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

export default function WeeklyWinnerShareButton(props: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<ShareFormat | null>(null);

  async function handleShare(format: ShareFormat) {
    if (busy) return;
    setBusy(format);
    try {
      const blob = await composeShareImage(props, format);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File(
        [blob],
        `treeshare-weekly-winner-${format}-${props.treeId}.${ext}`,
        { type: blob.type || "image/jpeg" },
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

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      toast({
        title: "Immagine scaricata",
        description: "Pronta da condividere!",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Impossibile creare l'immagine",
        description: "Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  const baseBtn =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-60";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleShare("feed")}
        disabled={busy !== null}
        data-testid="button-share-weekly-winner-feed"
        className={`${baseBtn} bg-amber-400 text-amber-950 hover:bg-amber-300`}
        title="Condividi nel feed (4:5)"
      >
        {busy === "feed" ? (
          <span className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <rect x="6" y="3" width="12" height="18" rx="2" />
          </svg>
        )}
        Feed
      </button>
      <button
        type="button"
        onClick={() => handleShare("story")}
        disabled={busy !== null}
        data-testid="button-share-weekly-winner-story"
        className={`${baseBtn} bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300`}
        title="Condividi come Story (9:16)"
      >
        {busy === "story" ? (
          <span className="w-3.5 h-3.5 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <circle cx="12" cy="18" r="1" fill="currentColor" />
          </svg>
        )}
        Story
      </button>
    </div>
  );
}
