import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import {
  MODELS_VERIFY, MODELS_UPDATE, buildPromptUpdate,
  GeminiResponse, extractResponseText, extractJson,
  callGemini, callGeminiTwoImages, parseBase64Image,
} from "../lib/geminiUtils";

const router = Router();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── POST /plants/verify — verifica se l'immagine mostra una pianta ────────────

router.post("/plants/verify", requireAuth, async (req, res) => {
  const { imageBase64 } = req.body as { imageBase64?: string };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({ isPlant: null, aiUnavailable: true, reason: "GEMINI_API_KEY non configurata" });
    return;
  }

  const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const mimeMatch = dataUrl.match(/^data:([^;]+);/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";

  let lastError = "";

  for (const { model, apiVersion } of MODELS_VERIFY) {
    try {
      let apiRes = await callGemini(apiKey, model, apiVersion, mimeType, base64);

      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGemini(apiKey, model, apiVersion, mimeType, base64);
      }

      if (apiRes.status === 429) {
        lastError = `${model}: quota esaurita (429)`;
        req.log.warn({ model }, "[plants/verify] quota esaurita (429) — provo modello successivo");
        continue;
      }

      if (!apiRes.ok) {
        const errBody = await apiRes.text().catch(() => "");
        lastError = `${model}: HTTP ${apiRes.status} — ${errBody.slice(0, 200)}`;
        req.log.warn({ model, status: apiRes.status }, "[plants/verify] risposta non OK — provo modello successivo");
        continue;
      }

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);
      req.log.info({ model, apiVersion, preview: raw.slice(0, 100) }, "[plants/verify] risposta ricevuta");

      let parsed: { valid?: boolean; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        req.log.warn({ model }, "[plants/verify] risposta non parsabile — fallback a revisione manuale");
        res.json({ isPlant: null, aiUnavailable: true, reason: "Risposta AI non valida. Revisione manuale richiesta." });
        return;
      }

      if (parsed.valid === true) {
        res.json({ isPlant: true, label: "Valido", reason: parsed.reason ?? "", model });
      } else {
        res.json({ isPlant: false, label: "Non valido", reason: parsed.reason ?? "Contenuto non vegetale o non ammesso rilevato.", model });
      }
      return;

    } catch (err) {
      lastError = `${model}: errore di rete — ${String(err).slice(0, 100)}`;
      req.log.warn({ model, err }, "[plants/verify] errore di rete — provo modello successivo");
    }
  }

  req.log.error({ lastError }, "[plants/verify] tutti i modelli hanno fallito");
  res.json({ isPlant: null, aiUnavailable: true, reason: lastError });
});

// ── POST /plants/verify-update — confronta specie tra foto originale e aggiornamento ─────

router.post("/plants/verify-update", requireAuth, async (req, res) => {
  const { newImageBase64, referenceImageBase64, species } = req.body as {
    newImageBase64?: string;
    referenceImageBase64?: string;
    species?: string | null;
  };

  if (!newImageBase64 || typeof newImageBase64 !== "string") {
    res.status(400).json({ error: "newImageBase64 is required" });
    return;
  }
  if (!referenceImageBase64 || typeof referenceImageBase64 !== "string") {
    res.status(400).json({ error: "referenceImageBase64 is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({ sameSpecies: null, aiUnavailable: true, reason: "GEMINI_API_KEY non configurata" });
    return;
  }

  const refImage  = parseBase64Image(referenceImageBase64);
  const { base64: newBase64, mimeType: newMimeType } = parseBase64Image(newImageBase64);

  const prompt = buildPromptUpdate(species);
  let lastError = "";

  for (const { model, apiVersion } of MODELS_UPDATE) {
    try {
      let apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, refImage, { base64: newBase64, mimeType: newMimeType }, prompt);

      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, refImage, { base64: newBase64, mimeType: newMimeType }, prompt);
      }

      if (apiRes.status === 429) {
        lastError = `${model}: quota esaurita (429)`;
        req.log.warn({ model }, "[plants/verify-update] quota esaurita (429) — provo modello successivo");
        continue;
      }

      if (!apiRes.ok) {
        const errBody = await apiRes.text().catch(() => "");
        lastError = `${model}: HTTP ${apiRes.status} — ${errBody.slice(0, 200)}`;
        req.log.warn({ model, status: apiRes.status }, "[plants/verify-update] risposta non OK — provo modello successivo");
        continue;
      }

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);

      let parsed: { valid?: boolean; species1?: string; species2?: string; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        req.log.warn({ model }, "[plants/verify-update] risposta non parsabile — fallback a revisione manuale");
        res.json({ sameSpecies: null, aiUnavailable: true, reason: "Risposta AI non valida. Revisione manuale." });
        return;
      }

      req.log.info({ model, species1: parsed.species1, species2: parsed.species2, valid: parsed.valid }, "[plants/verify-update] risposta ricevuta");

      res.json({
        sameSpecies: parsed.valid === true,
        species1: parsed.species1 ?? null,
        species2: parsed.species2 ?? null,
        reason: parsed.reason ?? "",
        model,
      });
      return;

    } catch (err) {
      lastError = `${model}: errore di rete — ${String(err).slice(0, 100)}`;
      req.log.warn({ model, err }, "[plants/verify-update] errore di rete — provo modello successivo");
    }
  }

  req.log.error({ lastError }, "[plants/verify-update] tutti i modelli hanno fallito");
  res.json({ sameSpecies: null, aiUnavailable: true, reason: lastError });
});

export default router;
