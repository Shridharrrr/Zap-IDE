// ─── Gemini Streaming AI ──────────────────────────────────────
// Async generator — yields text deltas from Gemini SSE stream

export async function* streamGemini(prompt, { apiKey, model }) {
  if (!apiKey)
    throw new Error(
      "No API key set. Open Settings to add your Gemini API key.",
    );

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message ||
        `Gemini API error: ${response.status} ${response.statusText}`,
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
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]" || !jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (delta) yield delta;
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
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

  // Primary format: FILE: path\n```lang\ncontent\n```
  const pattern1 = /^FILE:\s*([^\n]+)\n```[a-zA-Z]*\n([\s\S]*?)^```/gm;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    files[match[1].trim()] = match[2];
  }
  if (Object.keys(files).length > 0) return files;

  // Fallback: ### `path` or ## path\n```lang\ncontent\n```
  const pattern2 =
    /^#{1,3}\s+`?([^`\n]+\.(?:jsx?|tsx?|css|html|json))`?\s*\n```[a-zA-Z]*\n([\s\S]*?)^```/gm;
  while ((match = pattern2.exec(text)) !== null) {
    files[match[1].trim()] = match[2];
  }

  return Object.keys(files).length > 0 ? files : null;
}
