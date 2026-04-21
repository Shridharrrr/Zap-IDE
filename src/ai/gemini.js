// ─── LLM Streaming ────────────────────────────────────────────
// Unified async generator for:
// - Local Ollama-style NDJSON streaming
// - Google Gemini API (Bring your API key)

export async function* streamGemini(prompt, { apiKey, model } = {}) {
  const resolvedModel = (model || "qwen2.5:3b").trim();

  if (isGeminiCloudModel(resolvedModel)) {
    if (!apiKey || !String(apiKey).trim()) {
      throw new Error(
        'Missing Gemini API key. Open Settings → add your key, then select a Gemini model (e.g. "gemini-2.5-flash").',
      );
    }
    yield* streamGeminiCloud(prompt, {
      apiKey: String(apiKey).trim(),
      model: normalizeGeminiModelName(resolvedModel),
    });
    return;
  }

  yield* streamLocalOllama(prompt, { model: resolvedModel });
}

function isGeminiCloudModel(model) {
  const m = String(model || "").trim();
  return (
    m.startsWith("gemini-") ||
    m.startsWith("models/gemini-") ||
    m.startsWith("models/") // allow advanced users to paste full model ids
  );
}

function normalizeGeminiModelName(model) {
  const m = String(model || "").trim();
  return m.startsWith("models/") ? m : `models/${m}`;
}

// ─── Local Ollama Streaming (NDJSON) ───────────────────────────
async function* streamLocalOllama(prompt, { model }) {
  const url = "http://127.0.0.1:11434/api/generate";
  const body = {
    model: model || "qwen2.5:3b",
    prompt,
    stream: true,
    options: {
      temperature: 0.7,
      num_predict: 16384,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const text = await response.text().catch(() => "");
    throw new Error(
      err?.error ||
        text ||
        `Local model error: ${response.status} ${response.statusText}. Ensure Ollama is running with model "${body.model}".`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      const jsonStr = line.trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        if (typeof parsed?.response === "string" && parsed.response.length > 0) {
          yield parsed.response;
        }
      } catch {
        // Skip malformed NDJSON lines
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      const parsed = JSON.parse(tail);
      if (typeof parsed?.response === "string" && parsed.response.length > 0) {
        yield parsed.response;
      }
    } catch {
      // Ignore malformed tail chunk.
    }
  }
}

// ─── Gemini Cloud Streaming (SSE) ──────────────────────────────
async function* streamGeminiCloud(prompt, { apiKey, model }) {
  // Docs: Generative Language API v1beta supports SSE with alt=sse.
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
    apiKey,
  )}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Gemini API error: ${response.status} ${response.statusText}${
        text ? ` — ${text}` : ""
      }`,
    );
  }

  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith(":")) continue; // SSE comment/keepalive
      if (!line.startsWith("data:")) continue;

      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === "[DONE]") continue;

      try {
        const evt = JSON.parse(dataStr);
        const text = extractGeminiText(evt);
        if (!text) continue;

        const delta = computeDelta(text, lastText);
        lastText = text;
        if (delta) yield delta;
      } catch {
        // ignore malformed event chunks
      }
    }
  }
}

function extractGeminiText(evt) {
  // Typical: { candidates: [ { content: { parts: [ { text } ] } } ] }
  const parts = evt?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

function computeDelta(next, prev) {
  if (!next) return "";
  if (!prev) return next;
  if (next.startsWith(prev)) return next.slice(prev.length);
  return next; // fallback if server sends non-prefix updates
}

// ─── Code Extractor ───────────────────────────────────────────
// Extract the first ```js / ```javascript code block from a string
export function extractCode(text) {
  // Try fenced code block first
  const fencedMatch = text.match(
    /```(?:javascript|js|typescript|ts|node)?\s*\n?([\s\S]*?)```/,
  );
  if (fencedMatch) return fencedMatch[1].trim();

  // Fallback: if the whole response looks like code (no markdown prose)
  const lines = text.trim().split("\n");
  const hasProseLines = lines.some(
    (l) =>
      l.match(/^(Here|This|The|I |Let |Sure|Of course|Below|Above)/i) ||
      l.match(/^[A-Z][a-z].*[.!?]$/),
  );
  if (!hasProseLines && lines.length > 1) return text.trim();

  return null;
}

// ─── Stream to string (utility) ───────────────────────────────
export async function streamToString(generator) {
  let full = "";
  for await (const chunk of generator) {
    full += chunk;
  }
  return full;
}

// ─── Multi-file Extractor ─────────────────────────────────────
// Extracts a map of { [path]: content } from AI responses that use
// the multi-file FILE: path\n```lang\ncontent\n``` format.
export function extractFiles(text) {
  const files = {};
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const fileHeader = lines[i].match(/^FILE:\s*(.+)\s*$/);
    if (!fileHeader) {
      i++;
      continue;
    }

    const path = fileHeader[1].trim();
    i++;

    if (i < lines.length && lines[i].trim().startsWith("```")) {
      i++;
    }

    const contentLines = [];
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "```") {
        i++;
        break;
      }
      if (/^FILE:\s*(.+)\s*$/.test(line)) {
        break;
      }
      contentLines.push(line);
      i++;
    }

    files[path] = contentLines.join("\n").replace(/\s+$/, "");
  }

  if (Object.keys(files).length > 0) return files;

  const headingPattern =
    /^#{1,3}\s+`?([^`\n]+\.(?:jsx?|tsx?|css|html|json))`?\s*\n```[a-zA-Z]*\n([\s\S]*?)(?:^```|\s*$)/gm;
  let match;
  while ((match = headingPattern.exec(text)) !== null) {
    files[match[1].trim()] = match[2].replace(/\s+$/, "");
  }

  return Object.keys(files).length ? files : null;
}
