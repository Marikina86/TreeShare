import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

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

Obiettivo: verificare se l'immagine mostra un ALBERO o una PIANTA DA ESTERNO di dimensioni significative (non un arbusto, non un cespuglio, non un'erbacea spontanea) come soggetto principale o chiaramente visibile, in un contesto naturale, giardino o spazio aperto.

Regole di ACCETTAZIONE:
- ACCETTA alberi (latifoglie, aghifoglie, palme, ulivi, alberi da frutto, ecc.) piantati in terra o in vaso grande all'aperto.
- ACCETTA piante da giardino con fusto o tronco riconoscibile (es. magnolie, ortensie a cespuglio alto, rose con gambo sviluppato, bambù), purché la pianta sia il soggetto principale e chiaramente piantata all'esterno.
- ACCETTA piante con frutti o fiori visibili solo se crescono su un albero o su una pianta con fusto/tronco riconoscibile.
- ACCETTA sfondi tipici di esterni (cielo, terra, erba, muri, recinzioni).

Regole di RIFIUTO (applica con RIGORE):
- RIFIUTA arbusti bassi, cespugli, siepi o piante senza fusto/tronco riconoscibile.
- RIFIUTA erbacce, erbe infestanti, piante erbacee spontanee, erba alta, muschi e licheni.
- RIFIUTA piante orticole, verdure e colture alimentari (ortaggi, insalate, pomodori, peperoni, zucchine, carote, erbe aromatiche da cucina).
- RIFIUTA fiori recisi, mazzi di fiori, composizioni floreali, fiori in vaso da appartamento.
- RIFIUTA immagini in cui il soggetto principale non è una pianta o un albero (persone, animali, oggetti, documenti, schermi, veicoli).
- RIFIUTA immagini di sola terra, sola erba, o vegetazione irriconoscibile o troppo generica.
- RIFIUTA piante da interno (piante d'appartamento, tropicali in vaso al chiuso).

Casi limite:
- Quercia, pino, abete, cipresso, betulla, ulivo, palma → ACCETTA.
- Albero da frutto (melo, pero, ciliegio) in giardino → ACCETTA.
- Cactus grande o succulenta in giardino esterno con fusto visibile → ACCETTA.
- Arbusto basso senza tronco riconoscibile → RIFIUTA.
- Cespuglio di lavanda o rosmarino → RIFIUTA.
- Prato o campo di erba senza alberi → RIFIUTA.
- In caso di dubbio, RIFIUTA.

Output richiesto (OBBLIGATORIO in JSON):
{
  "valid": true | false,
  "reason": "breve spiegazione in italiano"
}

Importante:
- Rispondi SOLO con JSON valido, senza testo extra.
- Sii RIGOROSO: preferisci rifiutare un caso dubbio piuttosto che accettarlo.`;

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
function buildPromptUpdate(species?: string | null): string {
  const speciesLine = species
    ? `\nSpecie dichiarata dall'utente per la pianta originale: "${species}".`
    : "";
  return `Analizza le due immagini fornite.

Immagine 1: Foto originale della pianta registrata su TreeShare.${speciesLine}
Immagine 2: Nuova foto proposta come aggiornamento fotografico.

COMPITO IN DUE PASSI:

PASSO 1 — Identifica la specie botanica precisa (genere e specie, se possibile) della pianta in ciascuna immagine separatamente.
Non limitarti alla categoria generica: distingui a livello di genere/specie. Esempi corretti: "Quercus robur (quercia farnia)", "Pinus sylvestris (pino silvestre)", "Olea europaea (ulivo)", "Phoenix dactylifera (palma da dattero)", "Cedrus atlantica (cedro dell'Atlante)".

PASSO 2 — Confronta le due specie identificate applicando queste regole RIGOROSE:
- Rispondi valid: true SOLO SE le due immagini mostrano la STESSA SPECIE o lo STESSO GENERE botanico stretto (es. quercia + quercia, pino + pino, ulivo + ulivo).
- Rispondi valid: false se le specie sono diverse anche all'interno della stessa famiglia o categoria. Esempi di RIFIUTO obbligatorio:
  • Quercia (Quercus) + Faggio (Fagus) → false (entrambe latifoglie decidue ma generi diversi)
  • Pino (Pinus) + Abete (Abies) → false (entrambe aghifoglie ma generi diversi)
  • Pino (Pinus) + Cipresso (Cupressus) → false
  • Palma da dattero (Phoenix) + Palma da cocco (Cocos) → false (generi diversi)
  • Cedro + Pino → false
  • Betulla + Pioppo → false
- Rispondi valid: false se la specie nell'Immagine 2 NON corrisponde alla specie dichiarata (se fornita).
- Variazioni stagionali (stessa pianta in inverno vs estate) sono ammesse SOLO se il genere è identico.

CRITERI DI RIFIUTO IMMEDIATO:
- Specie di generi botanici diversi → RIFIUTA sempre, anche se visivamente simili.
- Non accettare specie diverse solo perché appartengono alla stessa famiglia botanica larga.
- Il confronto deve essere a livello di genere o specie, non di categoria visiva generica.

POLITICA SUL DUBBIO:
- Se non riesci a identificare con sufficiente certezza la specie in una o entrambe le immagini → valid: false.
- Se hai anche solo un ragionevole dubbio che siano specie diverse → valid: false.
- Sii RIGOROSO: è preferibile rifiutare un caso incerto piuttosto che accettare un aggiornamento con specie errata.

Output OBBLIGATORIO in JSON (senza testo extra):
{
  "valid": true | false,
  "species1": "genere e specie identificati nell'Immagine 1",
  "species2": "genere e specie identificati nell'Immagine 2",
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
