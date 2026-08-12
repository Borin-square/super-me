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
  required: ["kind","meal","title","author","kcal","p","c","f","estimated","type","minutes","distance","elevation","intensity","sys","dia","pulse","context","weight","smokingAction"],
  properties: {
    kind: { type: "string", enum: ["food","sport","pressure","weight","meditation","book","smoking"] },
    meal: { type: "string", enum: ["Colazione","Pranzo","Cena","Snack",""] },
    title: { type: "string" },
    author: { type: "string" },
    kcal: { type: "number" },
    p: { type: "number" },
    c: { type: "number" },
    f: { type: "number" },
    estimated: { type: "boolean" },
    type: { type: "string", enum: ["Bici","Corsa","Calisthenics","Camminata","Calcio",""] },
    minutes: { type: "number" },
    distance: { type: "number" },
    elevation: { type: "number" },
    intensity: { type: "string", enum: ["bassa","media","alta",""] },
    sys: { type: "number" },
    dia: { type: "number" },
    pulse: { type: "number" },
    context: { type: "string", enum: ["riposo","mattina","sera","post-caffè","post-sport","altro",""] },
    weight: { type: "number" },
    smokingAction: { type: "string", enum: ["smoked","quit_start",""] }
  }
};

function validate(parsed) {
  if (!parsed || !schema.properties.kind.enum.includes(parsed.kind)) throw new Error("Categoria non riconosciuta");
  const base = { kind: parsed.kind };
  if (parsed.kind === "food") {
    if (!parsed.title || parsed.kcal < 0 || parsed.p < 0 || parsed.c < 0 || parsed.f < 0) throw new Error("Dati cibo non validi");
    return {...base,meal:parsed.meal||"Snack",title:parsed.title,kcal:Math.round(parsed.kcal),p:Math.round(parsed.p*10)/10,c:Math.round(parsed.c*10)/10,f:Math.round(parsed.f*10)/10,estimated:true};
  }
  if (parsed.kind === "sport") {
    if (!parsed.type || parsed.minutes <= 0) throw new Error("Dati sport non validi");
    return {...base,type:parsed.type,minutes:Math.round(parsed.minutes),distance:parsed.distance>0?parsed.distance:null,elevation:parsed.elevation>0?Math.round(parsed.elevation):null,intensity:parsed.intensity||"media",kcal:parsed.kcal>0?Math.round(parsed.kcal):0};
  }
  if (parsed.kind === "pressure") {
    if (parsed.sys <= 0 || parsed.dia <= 0) throw new Error("Dati pressione non validi");
    return {...base,sys:Math.round(parsed.sys),dia:Math.round(parsed.dia),pulse:parsed.pulse>0?Math.round(parsed.pulse):null,context:parsed.context||"riposo"};
  }
  if (parsed.kind === "weight") {
    if (parsed.weight < 30 || parsed.weight > 300) throw new Error("Peso non valido");
    return {...base,weight:Math.round(parsed.weight*10)/10};
  }
  if (parsed.kind === "meditation") {
    if (parsed.minutes <= 0 || parsed.minutes > 300) throw new Error("Minuti meditazione non validi");
    return {...base,minutes:Math.round(parsed.minutes)};
  }
  if (parsed.kind === "book") {
    if (!parsed.title) throw new Error("Titolo libro mancante");
    return {...base,title:parsed.title,author:parsed.author||""};
  }
  if (!parsed.smokingAction) throw new Error("Azione sigarette non riconosciuta");
  return {...base,smokingAction:parsed.smokingAction};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(res, 503, { error: "OPENAI_API_KEY non configurata su Vercel" });
  try {
    const { text = "", imageDataUrl = "" } = req.body || {};
    if (!text && !imageDataUrl) return json(res, 400, { error: "Manca testo o immagine" });

    const instructions = `Sei il parser universale di Super Me. Trasforma un singolo input in UNA SOLA categoria tra: food, sport, pressure, weight, meditation, book, smoking.

REGOLE:
1. Compila SEMPRE tutti i campi dello schema. Per i campi non pertinenti usa stringa vuota, false o 0.
2. Non aggiungere diagnosi, consigli o testo fuori dallo schema.
3. FOOD: cibo/bevande o foto di un pasto. Stima titolo, kcal e macro totali. meal = Colazione/Pranzo/Cena/Snack.
4. SPORT: Bici, Corsa, Calisthenics, Camminata, Calcio. MTB/ciclismo=Bici. minutes obbligatorio; kcal può essere stimata.
5. PRESSURE: valori di pressione o foto di un misuratore. 'X su Y' => sys=X dia=Y. pulse se visibile/detto.
6. WEIGHT: peso corporeo detto dall'utente o foto di una bilancia. weight in kg. Non confondere peso alimenti con peso corporeo.
7. MEDITATION: una pratica di meditazione già svolta, es. 'ho meditato 12 minuti'. minutes è durata effettiva. Se l'utente dice solo che vuole iniziare a meditare senza durata, non scegliere meditation: scegli la categoria più plausibile solo se ci sono dati registrabili.
8. BOOK: libro letto/finito/da registrare o foto nitida di una copertina. title e author se riconoscibili. Una foto di copertina significa che l'utente vuole registrare quel libro.
9. SMOKING: 'ho fumato', 'ho fumato una sigaretta', ricaduta => smokingAction=smoked. 'ho smesso oggi', 'riparto da oggi', 'da oggi non fumo' => smokingAction=quit_start.
10. FOTO: identifica prima l'oggetto principale. Piatto=>food; bilancia con peso corporeo=>weight; sfigmomanometro=>pressure; copertina libro=>book. Non inventare numeri non visibili per peso o pressione.
11. Mantieni fedelmente i numeri esplicitati. Non scambiare minuti, kg, km, metri D+, pressione o battito.
12. Se l'immagine è un pasto, puoi stimare. Per weight e pressure, i valori devono essere leggibili; se non lo sono non inventarli.

Input utente:\n${text || "Analizza la foto e identifica quale dato personale l'utente sta registrando."}`;

    const content = [{ type: "input_text", text: instructions }];
    if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl, detail: "auto" });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "super_me_universal_entry", description: "Dato universale strutturato per Super Me.", strict: true, schema } },
        max_output_tokens: 1000,
        store: false
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(res, response.status, { error: data?.error?.message || "Errore OpenAI" });
    const raw = extractOutputText(data);
    if (!raw) return json(res, 502, { error: "OpenAI non ha restituito dati interpretabili" });
    try {
      const result = validate(JSON.parse(raw));
      return json(res, 200, result);
    } catch (error) {
      console.error("Universal parser validation error", { message: error?.message, raw });
      return json(res, 502, { error: `Dati interpretati ma non validi: ${error?.message || "formato errato"}` });
    }
  } catch (error) {
    console.error("Parser internal error", { message: error?.message, stack: error?.stack });
    return json(res, 500, { error: error?.message || "Errore interno nell'analisi AI" });
  }
}
