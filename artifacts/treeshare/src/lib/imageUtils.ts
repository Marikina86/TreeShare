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

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed")); },
      "image/jpeg",
      quality,
    );
  });
}

/** Foto principale: max 1080px, qualità 78% → ~200–500 KB */
export async function resizeToBlob(file: File, maxPx = 1080, quality = 0.78): Promise<Blob> {
  const img = await loadImage(file);
  return canvasToBlob(buildCanvas(img, maxPx), quality);
}

/** Thumbnail per feed: 300px, qualità 60% → ~50–150 KB */
export async function resizeToThumbnailBlob(file: File): Promise<Blob> {
  const img = await loadImage(file);
  return canvasToBlob(buildCanvas(img, 300), 0.60);
}

/** Verifica AI: max 768px, qualità 72% → ~100–250 KB */
export async function resizeToBase64(file: File, maxPx = 768, quality = 0.72): Promise<string> {
  const img = await loadImage(file);
  return buildCanvas(img, maxPx).toDataURL("image/jpeg", quality);
}
