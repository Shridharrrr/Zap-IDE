// ─── Topbar Component ─────────────────────────────────────────
import * as state from "../store/state.js";

export function initTopbar({ onRun, onStop, onShare, onSettings }) {
  const el = document.getElementById("topbar");
  if (!el) return;

  el.innerHTML = `
    <a class="topbar-logo" href="#" aria-label="Antigravity IDE">
      <svg width="26" height="26" viewBox="0 0 64 64" fill="none">
        <path d="M16 32L32 14L48 32L32 50Z" fill="none" stroke="var(--accent-2)" stroke-width="2.5"/>
        <path d="M24 32L32 22L40 32L32 42Z" fill="var(--accent)" opacity="0.9"/>
        <circle cx="32" cy="32" r="3" fill="#fff"/>
      </svg>
      <span class="topbar-brand">anti<span>gravity</span></span>
    </a>

    <div class="topbar-divider"></div>

    <div id="active-file-pill" title="">
      <span class="lang-dot"></span>
      <span id="active-file-name">—</span>
    </div>

    <span class="topbar-spacer"></span>

    <div class="topbar-actions">
      <button class="btn btn-run" id="btn-run">
        <span class="run-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 2.5l10 5.5-10 5.5V2.5z"/>
          </svg>
        </span>
        <div class="spinner"></div>
        <span class="run-label">Run</span>
      </button>

      <div class="topbar-divider"></div>

      <button class="btn btn-ghost" id="btn-share" title="Share">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="3" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="13" r="1.5"/>
          <path d="M5.5 7.1L10.5 4M5.5 9L10.5 12" stroke-linecap="round"/>
        </svg>
        Share
      </button>

      <button class="btn btn-ghost" id="btn-settings" title="Settings">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="2.5"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M2.9 13.1l1.4-1.4M11.7 4.3l1.4-1.4" stroke-linecap="round"/>
        </svg>
        Settings
      </button>
    </div>
  `;

  const btnRun = el.querySelector("#btn-run");
  const runLabel = el.querySelector(".run-label");
  const activeFileName = el.querySelector("#active-file-name");
  const activeFilePill = el.querySelector("#active-file-pill");

  // Update active file pill when currentFile changes
  state.subscribe("currentFile", (path) => {
    if (!path) return;
    const parts = path.split("/");
    const name = parts[parts.length - 1];
    activeFileName.textContent = name || path;
    activeFilePill.title = path;
  });

  // Also update on filename state change (single-file mode)
  state.subscribe("filename", (name) => {
    if (!state.get("currentFile") && name) {
      activeFileName.textContent = name;
    }
  });

  // Run / Stop
  btnRun.addEventListener("click", () => {
    if (state.get("isRunning")) onStop?.();
    else onRun?.();
  });

  state.subscribe("isRunning", (running) => {
    btnRun.classList.toggle("running", running);
    runLabel.textContent = running ? "Stop" : "Run";
  });

  // Keyboard shortcut Ctrl+Enter
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!state.get("isRunning")) onRun?.();
    }
  });

  el.querySelector("#btn-share").addEventListener("click", () => onShare?.());
  el.querySelector("#btn-settings").addEventListener("click", () =>
    onSettings?.(),
  );
}
