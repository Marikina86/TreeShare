import { Router } from "express";

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

function extractJson(raw: string): { valid?: boolean; reason?: string; species1?: string; species2?: string } {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(stripped);
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ thought?: boolean; text?: string }>;
    };
  }>;
};

/** Legge il testo effettivo dalla risposta Gemini saltando eventuali parti di "thinking" */
function extractResponseText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // I modelli "thinking" (es. 2.5-flash) emettono prima una parte con thought:true,
  // poi quella col testo effettivo. Troviamo la prima parte senza thought:true.
  const textPart = parts.find((p) => !p.thought && typeof p.text === "string");
  return (textPart?.text ?? "").trim();
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

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);
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
function buildPromptUpdate(species?: string | null): string {
  const speciesLine = species
    ? `\nSpecie dichiarata dall'utente per la pianta originale: "${species}".`
    : "";
  return `Analizza le due immagini fornite.

Immagine 1: Foto originale della pianta registrata su TreeShare.${speciesLine}
Immagine 2: Nuova foto proposta come aggiornamento fotografico.

COMPITO IN DUE PASSI:

PASSO 1 — Identifica la specie (o categoria) di pianta in ciascuna immagine separatamente.
Esempi di categorie: quercia/faggio/castagno (latifoglie decidue), pino/abete/cipresso (aghifoglie), palma, cactus/succulenta, bambù, ulivo, arbusto fiorito, erba/erbacea, ecc.

PASSO 2 — Confronta le due specie identificate:
- Rispondi valid: false se le specie identificate appartengono a CATEGORIE DIVERSE (es. aghifoglia vs latifoglia, palma vs qualsiasi altro albero, cactus vs altra pianta, bambù vs altra pianta).
- Rispondi valid: false se la specie nell'Immagine 2 NON corrisponde alla specie dichiarata (se fornita).
- Rispondi valid: true SOLO SE le specie sono nella stessa categoria o identiche.

IMPORTANTE:
- In caso di dubbio sulla specie, rispondi valid: false.
- Non fare affidamento su caratteristiche generiche come "entrambe hanno foglie verdi".
- Variazioni stagionali (stessa pianta in inverno vs estate) sono ammesse SOLO se la categoria è la stessa.

Output OBBLIGATORIO in JSON (senza testo extra):
{
  "valid": true | false,
  "species1": "specie/categoria identificata nell'Immagine 1",
  "species2": "specie/categoria identificata nell'Immagine 2",
  "reason": "spiegazione breve in italiano"
}`;
}

function parseBase64Image(dataUrl: string): { base64: string; mimeType: string } {
  const full = dataUrl.startsWith("data:") ? dataUrl : `data:image/jpeg;base64,${dataUrl}`;
  const mimeMatch = full.match(/^data:([^;]+);/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const base64 = full.includes(",") ? full.split(",")[1]! : full;
  return { base64, mimeType };
}

// Modelli per il confronto specie: preferire modelli più accurati
const MODELS_UPDATE: Array<{ model: string; apiVersion: "v1" | "v1beta" }> = [
  { model: "gemini-2.5-flash",          apiVersion: "v1beta" },
  { model: "gemini-2.5-flash-lite",     apiVersion: "v1beta" },
  { model: "gemini-2.0-flash",          apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-001",      apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite",     apiVersion: "v1beta" },
  { model: "gemini-2.0-flash-lite-001", apiVersion: "v1beta" },
];

async function callGeminiTwoImages(
  apiKey: string, model: string, apiVersion: string,
  ref: { base64: string; mimeType: string },
  newImg: { base64: string; mimeType: string },
  prompt: string,
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
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 300, temperature: 0 },
      }),
    }
  );
}

router.post("/plants/verify-update", async (req, res) => {
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
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
        console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
        continue;
      }

      if (!apiRes.ok) {
        const errBody = await apiRes.text().catch(() => "");
        lastError = `${model}: HTTP ${apiRes.status} — ${errBody.slice(0, 200)}`;
        console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
        continue;
      }

      const data = await apiRes.json() as GeminiResponse;
      const raw = extractResponseText(data);

      let parsed: { valid?: boolean; species1?: string; species2?: string; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        console.warn(`[plants/verify-update] Risposta non parsabile — fallback a revisione manuale`);
        res.json({ sameSpecies: null, aiUnavailable: true, reason: "Risposta AI non valida. Revisione manuale." });
        return;
      }

      console.info(`[plants/verify-update] Modello ${model} — specie1="${parsed.species1 ?? "?"}" specie2="${parsed.species2 ?? "?"}" valid=${parsed.valid} — ${parsed.reason?.slice(0, 80) ?? ""}`);

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
      console.warn(`[plants/verify-update] ${lastError} — provo modello successivo`);
    }
  }

  console.error(`[plants/verify-update] Tutti i modelli hanno fallito. Ultimo errore: ${lastError}`);
  res.json({ sameSpecies: null, aiUnavailable: true, reason: lastError });
});

export default router;
