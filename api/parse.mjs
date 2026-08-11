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

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "food", "sport", "pressure"],
  properties: {
    kind: { type: "string", enum: ["food", "sport", "pressure"] },
    food: {
      type: "object",
      additionalProperties: false,
      required: ["meal", "title", "kcal", "p", "c", "f", "estimated"],
      properties: {
        meal: { type: "string", enum: ["Colazione", "Pranzo", "Cena", "Snack", ""] },
        title: { type: "string" },
        kcal: { type: "number" },
        p: { type: "number" },
        c: { type: "number" },
        f: { type: "number" },
        estimated: { type: "boolean" }
      }
    },
    sport: {
      type: "object",
      additionalProperties: false,
      required: ["type", "minutes", "distance", "elevation", "intensity", "kcal"],
      properties: {
        type: { type: "string", enum: ["Bici", "Corsa", "Calisthenics", "Camminata", "Calcio", ""] },
        minutes: { type: "number" },
        distance: { type: "number" },
        elevation: { type: "number" },
        intensity: { type: "string", enum: ["bassa", "media", "alta", ""] },
        kcal: { type: "number" }
      }
    },
    pressure: {
      type: "object",
      additionalProperties: false,
      required: ["sys", "dia", "pulse", "context"],
      properties: {
        sys: { type: "number" },
        dia: { type: "number" },
        pulse: { type: "number" },
        context: { type: "string", enum: ["riposo", "mattina", "sera", "post-caffè", "post-sport", "altro", ""] }
      }
    }
  }
};

function validateAndFlatten(parsed) {
  if (!parsed || !["food", "sport", "pressure"].includes(parsed.kind)) {
    throw new Error("Categoria non riconosciuta");
  }

  if (parsed.kind === "food") {
    const x = parsed.food;
    if (!x.title || x.kcal < 0 || x.p < 0 || x.c < 0 || x.f < 0) throw new Error("Dati cibo non validi");
    return {
      kind: "food",
      meal: x.meal || "Snack",
      title: x.title,
      kcal: Math.round(x.kcal),
      p: Math.round(x.p * 10) / 10,
      c: Math.round(x.c * 10) / 10,
      f: Math.round(x.f * 10) / 10,
      estimated: true
    };
  }

  if (parsed.kind === "sport") {
    const x = parsed.sport;
    if (!x.type || x.minutes <= 0) throw new Error("Dati sport non validi");
    return {
      kind: "sport",
      type: x.type,
      minutes: Math.round(x.minutes),
      distance: x.distance > 0 ? x.distance : null,
      elevation: x.elevation > 0 ? Math.round(x.elevation) : null,
      intensity: x.intensity || "media",
      kcal: x.kcal > 0 ? Math.round(x.kcal) : 0
    };
  }

  const x = parsed.pressure;
  if (x.sys <= 0 || x.dia <= 0) throw new Error("Dati pressione non validi");
  return {
    kind: "pressure",
    sys: Math.round(x.sys),
    dia: Math.round(x.dia),
    pulse: x.pulse > 0 ? Math.round(x.pulse) : null,
    context: x.context || "riposo"
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(res, 503, { error: "OPENAI_API_KEY non configurata su Vercel" });

  try {
    const { text = "", imageDataUrl = "" } = req.body || {};
    if (!text && !imageDataUrl) return json(res, 400, { error: "Manca testo o immagine" });

    const instructions = `Sei il parser di Super Me. Devi trasformare un singolo input dell'utente in UNA SOLA categoria: food, sport oppure pressure.

REGOLE FERREE:
1. Non inventare categorie diverse da food, sport, pressure.
2. Compila sempre tutte e tre le sezioni richieste dallo schema, ma valorizza con dati reali solo la sezione indicata da kind. Nelle altre usa stringhe vuote, false e 0.
3. Non aggiungere commenti, diagnosi, consigli o testo libero fuori dai campi dello schema.
4. Se l'utente parla di mangiare/bere o invia la foto di un piatto: kind=food.
5. Se parla di allenamento, bici, MTB, corsa, camminata, calcio o calisthenics: kind=sport.
6. Se comunica valori come 135 su 85, sistolica/diastolica o battito: kind=pressure.
7. FOOD: title deve descrivere in modo sintetico alimenti e quantità note o stimate. Stima kcal e macro in modo realistico; p/c/f sono grammi totali del pasto. meal deve essere Colazione, Pranzo, Cena o Snack. Se il momento del pasto non è deducibile, scegli in base al contesto temporale fornito; altrimenti Snack.
8. SPORT: usa esclusivamente Bici, Corsa, Calisthenics, Camminata o Calcio. MTB/ciclismo= Bici. calistenics/calisthenics=Calisthenics. minutes è obbligatorio. Se distanza/dislivello non sono detti usa 0. intensity: bassa/media/alta. kcal è una stima se non esplicitata.
9. PRESSURE: interpreta sempre 'X su Y' come sys=X e dia=Y. Se il battito non è presente usa 0. context usa riposo salvo indicazioni diverse.
10. Mantieni fedelmente i numeri esplicitati dall'utente. Non scambiare minuti, chilometri, metri di dislivello, pressione o battito.

Input utente:\n${text || "Analizza la foto del pasto e stima alimenti, quantità, kcal e macronutrienti."}`;

    const content = [{ type: "input_text", text: instructions }];
    if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl, detail: "auto" });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "super_me_entry",
            description: "Dato strutturato per Super Me: cibo, sport o pressione.",
            strict: true,
            schema
          }
        },
        max_output_tokens: 900,
        store: false
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI parse error", { status: response.status, data });
      return json(res, response.status, { error: data?.error?.message || "Errore OpenAI" });
    }

    const raw = extractOutputText(data);
    if (!raw) {
      console.error("OpenAI empty structured output", data);
      return json(res, 502, { error: "OpenAI non ha restituito dati interpretabili" });
    }

    try {
      const parsed = JSON.parse(raw);
      const result = validateAndFlatten(parsed);
      console.log("Super Me parsed", { kind: result.kind, source: imageDataUrl ? "image" : "text" });
      return json(res, 200, result);
    } catch (error) {
      console.error("Structured output validation error", { message: error?.message, raw });
      return json(res, 502, { error: `Dati interpretati ma non validi: ${error?.message || "formato errato"}` });
    }
  } catch (error) {
    console.error("Parser internal error", { message: error?.message, stack: error?.stack });
    return json(res, 500, { error: error?.message || "Errore interno nell'analisi AI" });
  }
}
