// ─── WebP support detection (lazy, cached) ────────────────────────────────────
let _webpOk: boolean | null = null;
function supportsWebP(): boolean {
  if (_webpOk !== null) return _webpOk;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  _webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  return _webpOk;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildCanvas(img: HTMLImageElement, maxPx: number): HTMLCanvasElement {
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Impossibile caricare l'immagine")); };
    img.src = url;
  });
}

function encodeBlob(
  canvas: HTMLCanvasElement,
  quality: number,
  mime: string,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      mime,
      quality,
    ),
  );
}

/**
 * Trova tramite binary-search la qualità più alta che produce un file
 * entro targetBytes. Usa WebP (o JPEG come fallback).
 * Il redraw su canvas rimuove automaticamente tutti i metadati (EXIF, GPS, ICC).
 *
 * Iterations = 8 → precisione ~0.4% sulla qualità, tipicamente <50 ms.
 */
export async function smartEncode(
  canvas: HTMLCanvasElement,
  targetBytes: number,
  maxQ = 0.88,
  minQ = 0.42,
): Promise<Blob> {
  const mime = supportsWebP() ? "image/webp" : "image/jpeg";

  const high = await encodeBlob(canvas, maxQ, mime);
  if (high.size <= targetBytes) return high;

  let lo = minQ, hi = maxQ;
  let best = high;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await encodeBlob(canvas, mid, mime);
    if (blob.size <= targetBytes) {
      lo = mid;
      best = blob;
    } else {
      hi = mid;
    }
  }
  return best;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Foto principale (feed, profilo, albero).
 * Max 1080px — WebP con qualità dinamica → target ≤ 150 KB.
 * Tutti i metadati rimossi automaticamente.
 */
export async function resizeToBlob(file: File, maxPx = 1080): Promise<Blob> {
  const canvas = buildCanvas(await loadImage(file), maxPx);
  return smartEncode(canvas, 150 * 1024);
}

/**
 * Foto campagna donazione.
 * Max 1400px — WebP con qualità dinamica → target ≤ 400 KB.
 * Tutti i metadati rimossi automaticamente (EXIF, GPS).
 */
export async function resizeToCampaignBlob(file: File): Promise<Blob> {
  const canvas = buildCanvas(await loadImage(file), 1400);
  return smartEncode(canvas, 400 * 1024);
}

/**
 * Thumbnail per griglia/feed.
 * Max 300px — WebP con qualità dinamica → target ≤ 40 KB.
 */
export async function resizeToThumbnailBlob(file: File): Promise<Blob> {
  const canvas = buildCanvas(await loadImage(file), 300);
  return smartEncode(canvas, 40 * 1024, 0.85, 0.40);
}

/**
 * Immagine per verifica AI (base64, non mostrata all'utente).
 * Mantenuto JPEG per compatibilità massima con le API esterne.
 * Max 768px, qualità 72%.
 */
export async function resizeToBase64(file: File, maxPx = 768, quality = 0.72): Promise<string> {
  const img = await loadImage(file);
  return buildCanvas(img, maxPx).toDataURL("image/jpeg", quality);
}

export function resolveImg(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}
