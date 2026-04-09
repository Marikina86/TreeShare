import { Router } from "express";

const router = Router();

const MODELS_FALLBACK = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

const PROMPT = `Analizza l'immagine fornita.

Obiettivo: verificare se l'immagine ha una pianta o un albero come soggetto principale o ben visibile.

Regole:
- ACCETTA se c'è una pianta, albero, arbusto, fiore, vegetazione o pianta in vaso come soggetto riconoscibile, anche se ci sono sfondi come pareti, piastrelle, pavimenti, vasi, terra o altri elementi.
- ACCETTA anche se la pianta non occupa l'intera immagine, purché sia il soggetto principale o in primo piano.
- RIFIUTA solo se nell'immagine non è presente alcuna pianta o vegetazione, oppure se il soggetto principale è chiaramente una persona, un animale, un documento, uno schermo o un oggetto completamente privo di vegetazione.
- In caso di dubbio, ACCETTA.

Output richiesto (OBBLIGATORIO in JSON):
{
  "valid": true | false,
  "reason": "breve spiegazione"
}

Importante:
- Rispondi SOLO con JSON valido, senza testo extra.`;

function extractJson(raw: string): { valid?: boolean; reason?: string } {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(stripped);
}

async function callGemini(apiKey: string, model: string, mimeType: string, base64: string): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

  for (const model of MODELS_FALLBACK) {
    try {
      const apiRes = await callGemini(apiKey, model, mimeType, base64);

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
      console.info(`[plants/verify] Modello ${model} risposta: ${raw.slice(0, 100)}`);

      let parsed: { valid?: boolean; reason?: string };
      try {
        parsed = extractJson(raw);
      } catch {
        res.json({ isPlant: false, label: "Non valido", reason: "Impossibile analizzare la risposta AI." });
        return;
      }

      if (parsed.valid === true) {
        res.json({ isPlant: true, label: "Valido", reason: parsed.reason ?? "", model });
      } else {
        res.json({ isPlant: false, label: "Non valido", reason: parsed.reason ?? "Contenuto non vegetale rilevato.", model });
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

export default router;
