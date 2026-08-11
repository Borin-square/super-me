const json = (res, status, data) => res.status(status).json(data);

function extractOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

function cleanJson(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(res, 503, { error: "OPENAI_API_KEY non configurata su Vercel" });

  try {
    const { text = "", imageDataUrl = "" } = req.body || {};
    if (!text && !imageDataUrl) return json(res, 400, { error: "Manca testo o immagine" });

    const prompt = `Sei il motore di interpretazione di Super Me, app personale italiana per cibo, sport e pressione.
Restituisci ESCLUSIVAMENTE un singolo oggetto JSON valido, senza markdown.

Scegli kind fra: "food", "sport", "pressure".

FOOD:
{"kind":"food","meal":"Colazione|Pranzo|Cena|Snack","title":"descrizione sintetica degli alimenti e porzioni stimate","kcal":numero,"p":grammi proteine,"c":grammi carboidrati,"f":grammi grassi,"estimated":true}
Se c'è una foto, riconosci ciò che è ragionevolmente visibile, stima le porzioni e i condimenti plausibili senza fingere precisione. Se sei incerto, usa una stima centrale realistica. I macro devono essere coerenti con le kcal.

SPORT:
{"kind":"sport","type":"Bici|Corsa|Calisthenics|Camminata|Calcio","minutes":numero,"distance":numero_o_null,"elevation":numero_o_null,"intensity":"bassa|media|alta","kcal":numero}
MTB e ciclismo vanno sotto Bici. Calisthenics/calistenics vanno sotto Calisthenics. Stima kcal solo se non sono esplicitate.

PRESSURE:
{"kind":"pressure","sys":numero,"dia":numero,"pulse":numero_o_null,"context":"riposo|mattina|sera|post-caffè|post-sport|altro"}
Non fare diagnosi o commenti clinici: estrai soltanto i dati.

Input dell'utente:
${text || "Analizza la foto del pasto."}`;

    const content = [{ type: "input_text", text: prompt }];
    if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl, detail: "auto" });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{ role: "user", content }],
        max_output_tokens: 800
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI parse error", data);
      return json(res, response.status, { error: data?.error?.message || "Errore OpenAI" });
    }

    const out = cleanJson(extractOutputText(data));
    try {
      return json(res, 200, JSON.parse(out));
    } catch {
      console.error("Invalid JSON from OpenAI:", out);
      return json(res, 502, { error: "OpenAI ha restituito dati non validi" });
    }
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Errore interno nell'analisi AI" });
  }
}
