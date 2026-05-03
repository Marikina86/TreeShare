import { db } from "@workspace/db";
import { treesTable, treeUpdatesTable, userNotificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import {
  MODELS_VERIFY, MODELS_UPDATE, buildPromptUpdate,
  GeminiResponse, extractResponseText, extractJson,
  callGemini, callGeminiTwoImages,
} from "./geminiUtils";

// ── Job types ─────────────────────────────────────────────────────────────────

type TreeJob = {
  kind: "tree";
  treeId: number;
  userId: string;
  imageBase64: string;
  mimeType: string;
};

type UpdateJob = {
  kind: "update";
  updateId: number;
  treeId: number;
  userId: string;
  imageBase64: string;
  mimeType: string;
  referencePhotoUrl?: string | null;
  species?: string | null;
};

export type VerificationJob = TreeJob | UpdateJob;

// ── In-memory sequential queue ────────────────────────────────────────────────

const queue: VerificationJob[] = [];
let processing = false;

export function enqueueVerification(job: VerificationJob): void {
  queue.push(job);
  if (!processing) void processNext();
}

async function processNext(): Promise<void> {
  if (queue.length === 0) { processing = false; return; }
  processing = true;
  const job = queue.shift()!;
  try {
    await processJob(job);
  } catch (err) {
    logger.error({ err, kind: job.kind }, "[photoQueue] errore imprevisto nel processamento");
  }
  setImmediate(() => void processNext());
}

// ── Gemini helpers ────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function verifyIsPlant(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<{ aiUnavailable: boolean; isPlant: boolean; reason?: string }> {
  for (const { model, apiVersion } of MODELS_VERIFY) {
    try {
      let apiRes = await callGemini(apiKey, model, apiVersion, mimeType, imageBase64);
      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGemini(apiKey, model, apiVersion, mimeType, imageBase64);
      }
      if (apiRes.status === 429) continue;
      if (!apiRes.ok) continue;

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);
      let parsed: { valid?: boolean; reason?: string };
      try { parsed = extractJson(raw); }
      catch { return { aiUnavailable: true, isPlant: false }; }

      return { aiUnavailable: false, isPlant: parsed.valid === true, reason: parsed.reason };
    } catch { continue; }
  }
  return { aiUnavailable: true, isPlant: false };
}

async function verifySpecies(
  apiKey: string,
  ref: { base64: string; mimeType: string },
  newImg: { base64: string; mimeType: string },
  species?: string | null,
): Promise<{ aiUnavailable: boolean; sameSpecies: boolean; reason?: string }> {
  const prompt = buildPromptUpdate(species);
  for (const { model, apiVersion } of MODELS_UPDATE) {
    try {
      let apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, ref, newImg, prompt);
      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, ref, newImg, prompt);
      }
      if (apiRes.status === 429) continue;
      if (!apiRes.ok) continue;

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);
      let parsed: { valid?: boolean; reason?: string };
      try { parsed = extractJson(raw); }
      catch { return { aiUnavailable: true, sameSpecies: false }; }

      return { aiUnavailable: false, sameSpecies: parsed.valid === true, reason: parsed.reason };
    } catch { continue; }
  }
  return { aiUnavailable: true, sameSpecies: false };
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const fullUrl = url.startsWith("/objects/") ? `http://localhost:80/api/storage${url}` : url;
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mimeType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    const base64 = Buffer.from(buffer).toString("base64");
    return { base64, mimeType };
  } catch {
    return null;
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function approvePhoto(job: VerificationJob): Promise<void> {
  if (job.kind === "tree") {
    await db.update(treesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treesTable.id, job.treeId));
    await db.insert(userNotificationsTable).values({
      userId: job.userId,
      title: "Foto approvata! 🌱",
      message: "La tua pianta è ora visibile nella mappa e nel feed.",
      type: "photo_approved",
      relatedId: job.treeId,
    });
  } else {
    await db.update(treeUpdatesTable)
      .set({ photoStatus: "approved" })
      .where(eq(treeUpdatesTable.id, job.updateId));
    await db.insert(userNotificationsTable).values({
      userId: job.userId,
      title: "Aggiornamento approvato! 🌿",
      message: "La tua foto di aggiornamento è ora visibile.",
      type: "photo_approved",
      relatedId: job.treeId,
    });
  }
}

async function rejectPhoto(job: VerificationJob, reason: string): Promise<void> {
  if (job.kind === "tree") {
    await db.update(treesTable)
      .set({ photoStatus: "rejected" })
      .where(eq(treesTable.id, job.treeId));
    await db.insert(userNotificationsTable).values({
      userId: job.userId,
      title: "Foto non approvata",
      message: `La tua foto non è stata approvata. Motivo: ${reason}`,
      type: "photo_rejected",
      relatedId: job.treeId,
    });
  } else {
    await db.update(treeUpdatesTable)
      .set({ photoStatus: "rejected" })
      .where(eq(treeUpdatesTable.id, job.updateId));
    await db.insert(userNotificationsTable).values({
      userId: job.userId,
      title: "Foto aggiornamento non approvata",
      message: `La tua foto di aggiornamento non è stata approvata. Motivo: ${reason}`,
      type: "photo_rejected",
      relatedId: job.treeId,
    });
  }
}


// ── Job processor ─────────────────────────────────────────────────────────────

async function processJob(job: VerificationJob): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn({ kind: job.kind }, "[photoQueue] GEMINI_API_KEY mancante — auto-approvazione");
    await approvePhoto(job);
    return;
  }

  const plantResult = await verifyIsPlant(apiKey, job.imageBase64, job.mimeType);

  if (plantResult.aiUnavailable) {
    logger.warn({ kind: job.kind }, "[photoQueue] AI non disponibile (quota/errore) — auto-approvazione");
    await approvePhoto(job);
    return;
  }

  if (!plantResult.isPlant) {
    logger.info({ kind: job.kind, reason: plantResult.reason }, "[photoQueue] foto rifiutata — non è una pianta idonea");
    await rejectPhoto(job, plantResult.reason ?? "L'immagine non mostra una pianta o albero idoneo.");
    return;
  }

  if (job.kind === "update" && job.referencePhotoUrl) {
    const refImage = await fetchImageAsBase64(job.referencePhotoUrl);
    if (!refImage) {
      logger.warn({ updateId: job.updateId, url: job.referencePhotoUrl }, "[photoQueue] impossibile caricare foto originale — auto-approvazione");
      await approvePhoto(job);
      return;
    }

    const speciesResult = await verifySpecies(
      apiKey, refImage, { base64: job.imageBase64, mimeType: job.mimeType }, job.species,
    );

    if (speciesResult.aiUnavailable) {
      logger.warn({ updateId: job.updateId }, "[photoQueue] AI specie non disponibile (quota/errore) — auto-approvazione");
      await approvePhoto(job);
      return;
    }

    if (!speciesResult.sameSpecies) {
      logger.info({ updateId: job.updateId, reason: speciesResult.reason }, "[photoQueue] aggiornamento rifiutato — specie diversa");
      await rejectPhoto(job, speciesResult.reason ?? "La specie non corrisponde a quella della pianta originale.");
      return;
    }
  }

  logger.info({ kind: job.kind }, "[photoQueue] foto approvata");
  await approvePhoto(job);
}
