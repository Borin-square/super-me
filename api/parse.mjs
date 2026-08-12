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
  required: ["kind