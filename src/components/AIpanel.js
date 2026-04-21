// ─── AI Panel Component ───────────────────────────────────────
import * as state from "../store/state.js";
import { streamGemini, extractCode, extractFiles } from "../ai/gemini.js";
import { buildPrompt } from "../ai/prompt.js";

let historyEl = null;
let textareaEl = null;
let streamingBubble = null;
let outputRef = null;
let applyProjectRef = null; // callback: (files) => void

// ─── Vite project request detector ───────────────────────────
function looksLikeProjectRequest(msg) {
  return (
    /(create|make|build|generate|scaffold|start|new)\s.{0,40}(vite|react.*(app|project|website|site|page|dashboard|todo|form)|full.*(app|project|stack))/i.test(
      msg,
    ) ||
    /\b(vite|react)\s+(app|project|website|site|page|dashboard)\b/i.test(msg)
  );
}

export function initAIPanel({ getCode, setCode, getOutput, onApplyProject }) {
  outputRef = getOutput;
  applyProjectRef = onApplyProject;

  const panel = document.getElementById("ai-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div id="ai-resize-handle"></div>
    <div class="ai-panel-header">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" stroke-width="1.5">
        <path d="M8 1L9.5 6.5H15L10.5 9.5L12 15L8 12L4 15L5.5 9.5L1 6.5H6.5L8 1Z"/>
      </svg>
      <span class="ai-panel-title">AI Assistant</span>
      <div class="ai-status-dot" id="ai-status-dot"></div>
    </div>

    <div class="ai-chat-history" id="ai-chat-history">
      <div class="chat-empty">
        <svg class="chat-empty-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M20 4L22.5 14H33L24.5 20L27 30L20 24L13 30L15.5 20L7 14H17.5L20 4Z"/>
        </svg>
        <p>Ask AI to write, fix, explain,<br/>or build a full React app</p>
      </div>
    </div>

    <div class="ai-input-wrap">
      <textarea
        id="ai-textarea"
        placeholder="Ask anything… (Shift+Enter to send)"
        rows="3"
      ></textarea>
      <div class="ai-input-footer">
        <button class="btn btn-send" id="btn-send-ai">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 1.5L1 6.5l5 2 2 5 6.5-12z"/>
          </svg>
          Send
        </button>
      </div>
    </div>
  `;

  historyEl = panel.querySelector("#ai-chat-history");
  textareaEl = panel.querySelector("#ai-textarea");
  const statusDot = panel.querySelector("#ai-status-dot");
  const sendBtn = panel.querySelector("#btn-send-ai");

  // Status dot
  state.subscribe("isStreaming", (v) => {
    statusDot.classList.toggle("active", v);
    sendBtn.disabled = v;
  });

  // Send button
  sendBtn.addEventListener("click", () => {
    submitAI({
      type: "chat",
      getCode,
      setCode,
      userMessage: textareaEl.value.trim(),
    });
  });

  // Shift+Enter to submit
  textareaEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      submitAI({
        type: "chat",
        getCode,
        setCode,
        userMessage: textareaEl.value.trim(),
      });
    }
  });

  // Restore chat history
  const history = state.get("chatHistory");
  if (history.length > 0) {
    clearEmpty();
    history.forEach((msg) => appendMessage(msg, setCode, false));
  }
}

// ─── Core AI submission ───────────────────────────────────────
async function submitAI({ type, getCode, setCode, userMessage = "" }) {
  if (state.get("isStreaming")) return;

  const code = getCode();
  const errorContext = outputRef?.() ?? "";

  // ── Auto-detect Vite project requests in chat mode ────────
  let resolvedType = type;
  if (type === "chat" && userMessage && looksLikeProjectRequest(userMessage)) {
    resolvedType = "vite";
  }

  // Build display message
  const chipLabels = {
    fix: "Fix Error",
    explain: "Explain Code",
    refactor: "Refactor",
    tests: "Write Tests",
    vite: "🚀 Create Vite App",
  };
  const displayMessage = userMessage || chipLabels[resolvedType] || "";
  if (!displayMessage && resolvedType === "chat") return;

  // Show user bubble
  clearEmpty();
  appendMessage(
    { role: "user", content: displayMessage || `[${resolvedType}]` },
    setCode,
    false,
  );
  if (textareaEl) textareaEl.value = "";

  // Push to state
  state.pushChat({
    role: "user",
    content: displayMessage,
    timestamp: Date.now(),
  });

  // Build prompt
  const prompt = buildPrompt(resolvedType, code, userMessage, errorContext);

  // Start AI response bubble
  streamingBubble = createStreamingBubble(setCode, applyProjectRef);
  historyEl.appendChild(streamingBubble.el);
  scrollHistory();

  state.set("isStreaming", true);

  let fullText = "";
  try {
    const settings = { apiKey: state.get("apiKey"), model: state.get("model") };
    const stream = streamGemini(prompt, settings);

    for await (const chunk of stream) {
      fullText += chunk;
      streamingBubble.append(chunk);
      scrollHistory();
    }

    // ── Detect multi-file vs single-file response ─────────
    const extractedProjectFiles = extractFiles(fullText);
    const extractedCode = extractedProjectFiles ? null : extractCode(fullText);

    // Finalize bubble
    streamingBubble.finalize(fullText, extractedCode, extractedProjectFiles);

    state.pushChat({
      role: "assistant",
      content: fullText,
      extractedCode,
      extractedFiles: extractedProjectFiles,
      timestamp: Date.now(),
    });
  } catch (err) {
    streamingBubble.error(err.message);
  } finally {
    state.set("isStreaming", false);
    streamingBubble = null;
  }
}

// ─── Streaming bubble factory ─────────────────────────────────
function createStreamingBubble(setCode, onApplyProject) {
  const el = document.createElement("div");
  el.className = "chat-bubble assistant streaming";
  el.innerHTML = `<div class="bubble-role">AI</div><div class="bubble-content"></div>`;
  const contentEl = el.querySelector(".bubble-content");

  return {
    el,
    contentEl,
    rawText: "",

    append(chunk) {
      this.rawText += chunk;
      contentEl.textContent = this.rawText;
    },

    finalize(fullText, extractedCode, extractedProjectFiles) {
      el.classList.remove("streaming");
      contentEl.innerHTML = renderMarkdownLite(fullText);

      // ── Multi-file project response ───────────────────
      if (
        extractedProjectFiles &&
        Object.keys(extractedProjectFiles).length >= 2
      ) {
        const fileCount = Object.keys(extractedProjectFiles).length;
        const applyBtn = document.createElement("button");
        applyBtn.className = "btn apply-btn apply-project-btn";
        applyBtn.innerHTML = `
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
                  </svg>
                  Apply Project (${fileCount} files)
                `;
        applyBtn.addEventListener("click", () => {
          onApplyProject?.(extractedProjectFiles);
          applyBtn.innerHTML = "✓ Project Applied!";
          applyBtn.style.color = "var(--success)";
          applyBtn.disabled = true;
        });
        el.appendChild(applyBtn);
        return;
      }

      // ── Single-file code response ─────────────────────
      if (extractedCode) {
        const applyBtn = document.createElement("button");
        applyBtn.className = "btn apply-btn";
        applyBtn.innerHTML = `
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 12L2 8l1.5-1.5L6 9 12.5 2.5 14 4z"/>
                  </svg>
                  Apply to Editor
                `;
        applyBtn.addEventListener("click", () => {
          setCode(extractedCode);
          applyBtn.textContent = "✓ Applied!";
          applyBtn.style.color = "var(--success)";
          setTimeout(() => {
            applyBtn.innerHTML = `
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6 12L2 8l1.5-1.5L6 9 12.5 2.5 14 4z"/>
                          </svg>
                          Apply to Editor
                        `;
            applyBtn.style.color = "";
          }, 2000);
        });
        el.appendChild(applyBtn);
      }
    },

    error(msg) {
      el.classList.remove("streaming");
      contentEl.innerHTML = `<span style="color:var(--error)">⚠ Error: ${escapeHtml(msg)}</span>`;
    },
  };
}

// ─── Append a historical message bubble ───────────────────────
function appendMessage(
  { role, content, extractedCode, extractedFiles: projectFiles },
  setCode,
  animate = true,
) {
  const el = document.createElement("div");
  el.className = `chat-bubble ${role}`;
  if (!animate) el.style.animation = "none";

  if (role === "assistant") {
    el.innerHTML = `<div class="bubble-role">AI</div><div class="bubble-content">${renderMarkdownLite(content)}</div>`;

    // Multi-file project button
    if (projectFiles && Object.keys(projectFiles).length >= 2) {
      const fileCount = Object.keys(projectFiles).length;
      const applyBtn = document.createElement("button");
      applyBtn.className = "btn apply-btn apply-project-btn";
      applyBtn.innerHTML = `🚀 Apply Project (${fileCount} files)`;
      applyBtn.addEventListener("click", () => {
        applyProjectRef?.(projectFiles);
        applyBtn.textContent = "✓ Project Applied!";
        applyBtn.style.color = "var(--success)";
        applyBtn.disabled = true;
      });
      el.appendChild(applyBtn);
    } else if (extractedCode) {
      // Single-file apply button
      const applyBtn = document.createElement("button");
      applyBtn.className = "btn apply-btn";
      applyBtn.textContent = "Apply to Editor";
      applyBtn.addEventListener("click", () => setCode(extractedCode));
      el.appendChild(applyBtn);
    }
  } else {
    el.textContent = content;
  }

  historyEl.appendChild(el);
  scrollHistory();
}

// ─── Helpers ──────────────────────────────────────────────────
function clearEmpty() {
  const empty = historyEl.querySelector(".chat-empty");
  if (empty) empty.remove();
}

function scrollHistory() {
  if (historyEl) historyEl.scrollTop = historyEl.scrollHeight;
}

function renderMarkdownLite(text) {
  let html = escapeHtml(text);

  // Fenced code blocks
  html = html.replace(
    /```[\w]*\n?([\s\S]*?)```/g,
    "<pre><code>$1</code></pre>",
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background:rgba(0,0,0,0.4);padding:1px 4px;border-radius:3px;font-family:var(--font-mono);font-size:11px">$1</code>',
  );

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
