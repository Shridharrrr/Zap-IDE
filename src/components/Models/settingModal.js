// ─── Settings Modal ───────────────────────────────────────────
import * as state from "../../store/state.js";

export function openSettingsModal() {
  const existing = document.getElementById("settings-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "settings-modal-overlay";
  overlay.className = "modal-overlay";

  const currentModel = state.get("model");
  const currentKey   = state.get("apiKey") || "";
  const currentTheme = state.get("theme");
  const ghUser       = state.get("githubUsername") || "";
  const ghTok        = state.get("githubToken") || "";

  overlay.innerHTML = `
    <div class="modal settings-modal" role="dialog" aria-labelledby="settings-title">
      <h2 class="modal-title" id="settings-title">Settings</h2>

      <!-- API Key -->
      <div class="form-group">
        <label class="form-label" for="settings-apikey">Gemini API Key</label>
        <div class="input-eye-wrap">
          <input
            class="form-input"
            id="settings-apikey"
            type="password"
            placeholder="AIza…"
            value="${escapeHtml(currentKey)}"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="eye-btn" id="toggle-apikey" type="button" aria-label="Toggle API key visibility" title="Show / hide key">
            ${eyeIcon()}
          </button>
        </div>
      </div>

      <!-- Model -->
      <div class="form-group">
        <label class="form-label" for="settings-model">Model</label>
        <select class="form-select" id="settings-model">
          <optgroup label="Gemini (cloud)">
            <option value="gemini-2.5-flash"      ${currentModel === "gemini-2.5-flash"      ? "selected" : ""}>gemini-2.5-flash</option>
            <option value="gemini-2.5-flash-lite"  ${currentModel === "gemini-2.5-flash-lite"  ? "selected" : ""}>gemini-2.5-flash-lite</option>
            <option value="gemini-2.5-pro"         ${currentModel === "gemini-2.5-pro"         ? "selected" : ""}>gemini-2.5-pro</option>
          </optgroup>
          <optgroup label="Local (Ollama)">
            <option value="qwen2.5:3b"   ${currentModel === "qwen2.5:3b"   ? "selected" : ""}>qwen2.5:3b</option>
            <option value="qwen2.5:7b"   ${currentModel === "qwen2.5:7b"   ? "selected" : ""}>qwen2.5:7b</option>
            <option value="llama3.1:8b"  ${currentModel === "llama3.1:8b"  ? "selected" : ""}>llama3.1:8b</option>
          </optgroup>
        </select>
      </div>

      <!-- Editor Theme -->
      <div class="form-group">
        <label class="form-label" for="settings-theme">Editor Theme</label>
        <select class="form-select" id="settings-theme">
          <option value="vs-dark"  ${currentTheme === "vs-dark"  ? "selected" : ""}>Dark (vs-dark)</option>
          <option value="vs"       ${currentTheme === "vs"       ? "selected" : ""}>Light (vs)</option>
          <option value="hc-black" ${currentTheme === "hc-black" ? "selected" : ""}>High Contrast</option>
        </select>
      </div>

      <!-- GitHub username -->
      <div class="form-group">
        <label class="form-label" for="settings-gh-user">GitHub username</label>
        <input
          class="form-input"
          id="settings-gh-user"
          type="text"
          placeholder="Org or user for Community gist feed"
          value="${escapeHtml(ghUser)}"
          autocomplete="off"
          spellcheck="false"
        />
      </div>

      <!-- GitHub token -->
      <div class="form-group">
        <label class="form-label" for="settings-gh-token">GitHub token</label>
        <div class="input-eye-wrap">
          <input
            class="form-input"
            id="settings-gh-token"
            type="password"
            placeholder="Fine-grained token with Gists write permission"
            value="${escapeHtml(ghTok)}"
            autocomplete="off"
            spellcheck="false"
          />
          <button class="eye-btn" id="toggle-ghtoken" type="button" aria-label="Toggle token visibility" title="Show / hide token">
            ${eyeIcon()}
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" id="settings-cancel">Cancel</button>
        <button class="btn btn-run" id="settings-save">Save</button>
      </div>
    </div>
  `;

  // Inject scoped styles once
  if (!document.getElementById("settings-modal-style")) {
    const style = document.createElement("style");
    style.id = "settings-modal-style";
    style.textContent = `
      .settings-modal { min-width: 420px; max-width: 480px; }

      .input-eye-wrap {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-eye-wrap .form-input {
        flex: 1;
        padding-right: 38px;
      }
      .eye-btn {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        color: var(--text-muted, #888);
        border-radius: 4px;
        transition: color 0.15s;
      }
      .eye-btn:hover { color: var(--text, #ddd); }
      .eye-btn svg { width: 16px; height: 16px; display: block; }
      .eye-btn.revealed svg .eye-line { display: none; }
      .eye-btn:not(.revealed) svg .eye-open { display: none; }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);

  // ── eye toggle helper ──────────────────────────────────────
  function attachEyeToggle(btnId, inputId) {
    const btn   = overlay.querySelector(`#${btnId}`);
    const input = overlay.querySelector(`#${inputId}`);
    btn.addEventListener("click", () => {
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      btn.classList.toggle("revealed", hidden);
      btn.setAttribute("aria-label", hidden ? "Hide key" : "Show key");
    });
  }

  attachEyeToggle("toggle-apikey",  "settings-apikey");
  attachEyeToggle("toggle-ghtoken", "settings-gh-token");

  overlay.querySelector("#settings-save").addEventListener("click", () => {
    state.set("apiKey",          overlay.querySelector("#settings-apikey").value.trim());
    state.set("model",           overlay.querySelector("#settings-model").value);
    state.set("theme",           overlay.querySelector("#settings-theme").value);
    state.set("githubUsername",  overlay.querySelector("#settings-gh-user").value.trim());
    state.set("githubToken",     overlay.querySelector("#settings-gh-token").value.trim());
    localStorage.setItem("zap_setup_complete", "true");
    closeModal();
  });

  overlay.querySelector("#settings-cancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  const escHandler = (e) => {
    if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", escHandler); }
  };
  document.addEventListener("keydown", escHandler);

  function closeModal() { overlay.remove(); }
}

// ── SVG eye icon (open = visible, line = slash) ──────────────
function eyeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g class="eye-open">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </g>
    <line class="eye-line" x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}