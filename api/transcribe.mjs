const json = (res, status, data) => res.status(status).json(data);

function decodeDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Audio non valido: data URL mancante");
  }

  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("Audio non valido: separatore mancante");
  }

  const meta = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  const parts = meta.split(";").filter(Boolean);
  const mime = parts[0] || "audio/webm";
  const isBase64 = parts.includes("base64");

  if (!payload) {
    throw new Error("Audio non valido: contenuto vuoto");
  }

  const buffer = Buffer.from(payload, isBase64 ? "base64" : "utf8");
  if (!buffer.length) {
    throw new Error("Audio non valido: zero byte");
  }

  return { mime, buffer };
}

function extensionFor(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  return "webm";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(res, 503, { error: "OPENAI_API_KEY non configurata su Vercel" });

  try {
    const { audioDataUrl } = req.body || {};
    const { mime, buffer } = decodeDataUrl(audioDataUrl);

    console.log("Transcription input", {
      mime,
      bytes: buffer.length,
      dataUrlPrefix: String(audioDataUrl).slice(0, 80)
    });

    if (buffer.length > 8_000_000) {
      return json(res, 413, { error: "Registrazione troppo lunga. Prova con una frase più breve." });
    }

    const form = new FormData();
    const blob = new Blob([buffer], { type: mime });
    form.append("file", blob, `recording.${extensionFor(mime)}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "it");
    form.append(
      "prompt",
      "Trascrivi fedelmente italiano. Possibili termini: calorie, proteine, carboidrati, grassi, pressione, sistolica, diastolica, battito, bici, MTB, corsa, calisthenics, calistenics, camminata, calcio, dislivello."
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("OpenAI transcription error", {
        status: response.status,
        mime,
        bytes: buffer.length,
        data
      });
      return json(res, response.status, {
        error: data?.error?.message || `Errore trascrizione OpenAI (${response.status})`
      });
    }

    const text = String(data.text || "").trim();
    console.log("Transcription success", { chars: text.length });

    return json(res, 200, { text });
  } catch (error) {
    console.error("Transcription internal error", {
      message: error?.message,
      stack: error?.stack
    });
    return json(res, 500, {
      error: error?.message || "Errore interno nella trascrizione"
    });
  }
}
