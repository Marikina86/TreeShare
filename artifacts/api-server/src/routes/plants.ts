import { Router } from "express";

const router = Router();

const MODELS_FALLBACK = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
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

export default router;
