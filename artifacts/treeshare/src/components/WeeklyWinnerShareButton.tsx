import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  photoUrl: string;
  treeId: number;
  plantName?: string | null;
  username: string;
  province?: string | null;
  weekSunCount?: number;
}

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

async function composeShareImage(props: Props): Promise<Blob> {
  const W = 1080;
  const H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0b0f0a";
  ctx.fillRect(0, 0, W, H);

  const photo = await loadImage(resolvePhoto(props.photoUrl));

  const photoAreaH = 1080;
  const scale = Math.max(W / photo.width, photoAreaH / photo.height);
  const dw = photo.width * scale;
  const dh = photo.height * scale;
  const dx = (W - dw) / 2;
  const dy = (photoAreaH - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, photoAreaH);
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();

  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 260);

  const grad2 = ctx.createLinearGradient(0, photoAreaH - 260, 0, photoAreaH);
  grad2.addColorStop(0, "rgba(0,0,0,0)");
  grad2.addColorStop(1, "rgba(0,0,0,0.7)");
  ctx.fillStyle = grad2;
  ctx.fillRect(0, photoAreaH - 260, W, 260);

  try {
    const logo = await loadImage("/icon-512.png");
    const logoSize = 96;
    ctx.save();
    ctx.beginPath();
    ctx.arc(60 + logoSize / 2, 60 + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logo, 60, 60, logoSize, logoSize);
    ctx.restore();
  } catch {
    // logo optional
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 44px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText("TreeShare", 60 + 96 + 24, 60 + 48);
  ctx.shadowBlur = 0;

  const badgeText = "🌞 WEEKLY WINNER";
  ctx.font = "800 40px system-ui, -apple-system, sans-serif";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 56;
  const badgeH = 76;
  const badgeX = W - badgeW - 60;
  const badgeY = 60;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.fillStyle = "#3f2d04";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 28, badgeY + badgeH / 2 + 2);

  if (props.province) {
    const provText = props.province.toUpperCase();
    ctx.font = "600 28px system-ui, -apple-system, sans-serif";
    const provMetrics = ctx.measureText(provText);
    const pw = provMetrics.width + 36;
    const ph = 48;
    const px = badgeX + badgeW - pw;
    const py = badgeY + badgeH + 14;
    drawRoundedRect(ctx, px, py, pw, ph, ph / 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(provText, px + 18, py + ph / 2 + 1);
  }

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.font = "800 56px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "alphabetic";
  const title = props.plantName ? `🌱 ${props.plantName}` : "Pianta della Settimana";
  ctx.fillText(title, 60, photoAreaH - 80);

  ctx.font = "500 32px system-ui, -apple-system, sans-serif";
  ctx.fillText(`@${props.username}`, 60, photoAreaH - 32);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#0b0f0a";
  ctx.fillRect(0, photoAreaH, W, H - photoAreaH);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "800 80px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";
  const sunsLine = `🌞 ${props.weekSunCount ?? 0}`;
  const sunsMetrics = ctx.measureText(sunsLine);
  ctx.fillText(sunsLine, (W - sunsMetrics.width) / 2, photoAreaH + 90);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 30px system-ui, -apple-system, sans-serif";
  const sub = "soli ricevuti questa settimana";
  const subMetrics = ctx.measureText(sub);
  ctx.fillText(sub, (W - subMetrics.width) / 2, photoAreaH + 160);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "500 26px system-ui, -apple-system, sans-serif";
  const cta = "treeshare.app";
  const ctaMetrics = ctx.measureText(cta);
  ctx.fillText(cta, (W - ctaMetrics.width) / 2, photoAreaH + 230);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      0.95,
    );
  });
}

export default function WeeklyWinnerShareButton(props: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await composeShareImage(props);
      const file = new File([blob], `treeshare-weekly-winner-${props.treeId}.png`, {
        type: "image/png",
      });

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
      toast({ title: "Immagine scaricata", description: "Pronta da condividere!" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Impossibile creare l'immagine",
        description: "Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      data-testid="button-share-weekly-winner"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
      title="Condividi la Pianta della Settimana"
    >
      {busy ? (
        <span className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {busy ? "Generazione..." : "Condividi"}
    </button>
  );
}
