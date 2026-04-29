import { Router } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const router = Router();

// Modelli disponibili con questa API key (verificati tramite ListModels).
// Priorità: 2.5-flash-lite (quota alta, veloce) → 2.5-flash → 2.0-flash-lite → 2.0-flash.
const MODELS_FALLBACK: Array<{ model: string; apiVersion: "v1" | "v1beta" }> = [
  { model: "gemini-2.5-flash-lite",  apiVersion: "v1beta" },
  { model: "gemini-2.5-flash",       apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite",  apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite-001", apiVersion: "v1beta" },
  { model: "gemini-2.0-flash",       apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-001",   apiVersion: "v1beta" },
];

const PROMPT = `Analizza l'immagine fornita.

Obiettivo: verificare se l'immagine mostra una pianta o un albero da esterno (in natura, giardino o spazio aperto) come soggetto principale o chiaramente visibile.

Regole di ACCETTAZIONE:
- ACCETTA alberi, arbusti e cespugli in natura, giardini o spazi aperti.
- ACCETTA piante da giardino, anche se in vaso ma collocate all'aperto o in contesti naturali.
- ACCETTA piante in fiore (alberi in fiore, cespugli fioriti, piante da giardino fiorite) — i fiori che crescono sulla pianta sono ammessi.
- ACCETTA piante con frutti o bacche naturali che crescono sull'albero o cespuglio.
- ACCETTA anche se ci sono sfondi come cielo, terra, erba, muri, recinzioni o altri elementi tipici di esterni.

Regole di RIFIUTO:
- RIFIUTA fiori recisi, mazzi di fiori, composizioni floreali o fiori in vaso da appartamento senza pianta visibile (soggetto: solo il fiore, non la pianta).
- RIFIUTA piante orticole, verdure e colture alimentari: ortaggi, insalate, pomodori, peperoni, zucchine, carote, erbe aromatiche in vaso da cucina, piante da orto.
- RIFIUTA immagini in cui il soggetto principale non è una pianta o un albero (persone, animali, oggetti, documenti, schermi, veicoli).
- RIFIUTA immagini di sola terra, erba senza piante riconoscibili, o vegetazione del tutto irriconoscibile.

Casi limite:
- Piante succulente o cactus in giardino esterno → ACCETTA.
- Rosa in giardino con gambo e foglie visibili → ACCETTA (pianta in fiore).
- Bouquet di rose recise → RIFIUTA.
- Pomodori su pianta in orto → RIFIUTA.
- In caso di dubbio, ACCETTA.

Output richiesto (OBBLIGATORIO in JSON):
{
  "valid": true | false,
  "reason": "breve spiegazione in italiano"
}

Importante:
- Rispondi SOLO con JSON valido, senza testo extra.`;

function extractJson(raw: string): { valid?: boolean; reason?: string } {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(stripped);
}

async function callGemini(apiKey: string, model: string, apiVersion: string, mimeType: string, base64: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0,
        },
      }),
    }
  );
}

router.post("/plants/verify", async (req, res) => {
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

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const { model, apiVersion } of MODELS_FALLBACK) {
    try {
      let apiRes = await callGemini(apiKey, model, apiVersion, mimeType, base64);

      // 503 = temporaneamente sovraccarico: aspetta 1s e riprova una volta
      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGemini(apiKey, model, apiVersion, mimeType, base64);
      }

      if (apiRes.status === 429) {
        lastError = `${model}: quota esaurita (429)`;
        console.warn(`[plants/verify] ${lastError} — provo modello successivo`);
        continue;
      }

      if (!apiRes.ok) {
        const errBody = await apiRes.text().catch(() => "");
        lastError = `${model}: HTTP ${apiRes.status} — ${errBody.slice(0, 200)}`;
        console.warn(`[plants/verify] ${lastError} — provo modello successivo`);
        continue;
      }

      const data = await apiRes.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
      console.info(`[plants/verify] Modello ${model} (${apiVersion}) risposta: ${raw.slice(0, 100)}`);

      let parsed: { valid?: boolean; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        console.warn(`[plants/verify] Modello ${model}: risposta non parsabile — fallback a revisione manuale`);
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
      console.warn(`[plants/verify] ${lastError} — provo modello successivo`);
    }
  }

  console.error(`[plants/verify] Tutti i modelli hanno fallito. Ultimo errore: ${lastError}`);
  res.json({ isPlant: null, aiUnavailable: true, reason: lastError });
});

// ── POST /plants/verify-update — confronta specie tra foto originale e aggiornamento ─────
const PROMPT_UPDATE = `Analizza le due immagini fornite.

Immagine 1: Foto originale di una pianta/albero registrata su TreeShare.
Immagine 2: Nuova foto proposta come aggiornamento fotografico della stessa pianta.

Obiettivo: verificare se le due immagini mostrano la STESSA SPECIE di pianta o albero.

Regole:
- Se le due piante appartengono CHIARAMENTE a specie diverse e incompatibili (es. una palma e una quercia, un cactus e un abete, una pianta erbacea e un albero da frutto), rispondi con valid: false.
- Se le specie sembrano compatibili, simili, o se non sei abbastanza sicuro, rispondi con valid: true.
- Considera variazioni stagionali: la stessa pianta in estate vs inverno può sembrare molto diversa — in caso di dubbio ACCETTA.
- Non è richiesto che sia fisicamente la stessa pianta individuale, solo la stessa specie o specie compatibili.
- In caso di dubbio, ACCETTA (valid: true).

Output richiesto (OBBLIGATORIO in JSON):
{
  "valid": true | false,
  "reason": "breve spiegazione in italiano"
}

Importante:
- Rispondi SOLO con JSON valido, senza testo extra.`;

async function fetchImageAsBase64(photoUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // File locale: /objects/uploads/<filename>
    if (photoUrl.startsWith("/objects/uploads/")) {
      const filename = photoUrl.replace("/objects/uploads/", "");
      const filePath = join(process.cwd(), "uploads", filename);
      if (!existsSync(filePath)) return null;
      const buf = readFileSync(filePath);
      const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType = ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : "image/jpeg";
      return { base64: buf.toString("base64"), mimeType };
    }
    // URL remoto (Cloudinary o altro HTTPS)
    if (photoUrl.startsWith("http")) {
      const resp = await fetch(photoUrl);
      if (!resp.ok) return null;
      const contentType = resp.headers.get("content-type") ?? "image/jpeg";
      const mimeType = contentType.split(";")[0]?.trim() ?? "image/jpeg";
      const arrayBuf = await resp.arrayBuffer();
      return { base64: Buffer.from(arrayBuf).toString("base64"), mimeType };
    }
    return null;
  } catch {
    return null;
  }
}

async function callGeminiTwoImages(
  apiKey: string, model: string, apiVersion: string,
  ref: { base64: string; mimeType: string },
  newImg: { base64: string; mimeType: string },
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: ref.mimeType,    data: ref.base64 } },
            { inline_data: { mime_type: newImg.mimeType, data: newImg.base64 } },
            { text: PROMPT_UPDATE },
          ],
        }],
        generationConfig: { maxOutputTokens: 200, temperature: 0 },
      }),
    }
  );
}

router.post("/plants/verify-update", async (req, res) => {
  const { newImageBase64, referencePhotoUrl } = req.body as {
    newImageBase64?: string;
    referencePhotoUrl?: string;
  };

  if (!newImageBase64 || typeof newImageBase64 !== "string") {
    res.status(400).json({ error: "newImageBase64 is required" });
    return;
  }
  if (!referencePhotoUrl || typeof referencePhotoUrl !== "string") {
    res.status(400).json({ error: "referencePhotoUrl is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({ sameSpecies: null, aiUnavailable: true, reason: "GEMINI_API_KEY non configurata" });
    return;
  }

  // Ottieni la foto di riferimento
  const refImage = await fetchImageAsBase64(referencePhotoUrl);
  if (!refImage) {
    // Non riesce a caricare la foto originale → approva senza bloccare
    res.json({ sameSpecies: null, aiUnavailable: true, reason: "Impossibile caricare la foto originale per il confronto." });
    return;
  }

  // Prepara la nuova immagine
  const newDataUrl = newImageBase64.startsWith("data:") ? newImageBase64 : `data:image/jpeg;base64,${newImageBase64}`;
  const newBase64 = newDataUrl.includes(",") ? newDataUrl.split(",")[1]! : newDataUrl;
  const newMimeMatch = newDataUrl.match(/^data:([^;]+);/);
  const newMimeType = newMimeMatch?.[1] ?? "image/jpeg";

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let lastError = "";

  for (const { model, apiVersion } of MODELS_FALLBACK) {
    try {
      let apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, refImage, { base64: newBase64, mimeType: newMimeType });

      if (apiRes.status === 503) {
        await sleep(1000);
        apiRes = await callGeminiTwoImages(apiKey, model, apiVersion, refImage, { base64: newBase64, mimeType: newMimeType });
      }

      if (apiRes.status === 429) {
        lastError = `${model}: quota esaurita (429)`;
        console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
        continue;
      }

      if (!apiRes.ok) {
        const errBody = await apiRes.text().catch(() => "");
        lastError = `${model}: HTTP ${apiRes.status} — ${errBody.slice(0, 200)}`;
        console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
        continue;
      }

      const data = await apiRes.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
      console.info(`[plants/verify-update] Modello ${model} risposta: ${raw.slice(0, 100)}`);

      let parsed: { valid?: boolean; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        console.warn(`[plants/verify-update] Risposta non parsabile — fallback a revisione manuale`);
        res.json({ sameSpecies: null, aiUnavailable: true, reason: "Risposta AI non valida. Revisione manuale." });
        return;
      }

      res.json({
        sameSpecies: parsed.valid === true,
        reason: parsed.reason ?? "",
        model,
      });
      return;

    } catch (err) {
      lastError = `${model}: errore di rete — ${String(err).slice(0, 100)}`;
      console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
    }
  }

  console.error(`[plants/verify-update] Tutti i modelli hanno fallito. Ultimo errore: ${lastError}`);
  res.json({ sameSpecies: null, aiUnavailable: true, reason: lastError });
});

export default router;
