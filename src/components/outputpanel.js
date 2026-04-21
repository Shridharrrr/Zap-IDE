// ─── Output Panel Component ───────────────────────────────────
let outputLinesEl = null;
let lineCount = 0;
let isCollapsed = false;
let savedHeight = "260px";

export function initOutputPanel() {
  const panel = document.getElementById("output-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="pane-header">
      <div class="pane-tabs" id="pane-tabs">
        <button class="pane-tab active" id="pane-tab-output">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style="opacity:.7">
            <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v9A1.5 1.5 0 0113.5 13H10v1.5l-2 1.5-2-1.5V13H2.5A1.5 1.5 0 011 11.5v-9zM2.5 2a.5.5 0 00-.5.5v9a.5.5 0 00.5.5H6v2l1 .75 1-.75V12h3.5a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11z"/>
          </svg>
          Terminal
        </button>
      </div>
      <div class="pane-actions">
        <button class="icon-btn-sm" id="btn-copy-output" title="Copy output" data-tooltip="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2h7a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm0 1a1 1 0 00-1 1v9a1 1 0 001 1h7a1 1 0 001-1V4a1 1 0 00-1-1H4z"/>
            <path d="M6 0h7a2 2 0 012 2v9a2 2 0 01-2 2v-1a1 1 0 001-1V2a1 1 0 00-1-1H6a1 1 0 00-1 1H4a2 2 0 012-2z"/>
          </svg>
        </button>
        <button class="icon-btn-sm" id="btn-clear-output" title="Clear" data-tooltip="Clear">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 1.5v1h3.5a.5.5 0 010 1h-.538l-.853 10.66A2 2 0 0111.115 16h-6.23a2 2 0 01-1.994-1.84L2.038 3.5H1.5a.5.5 0 010-1H5v-1A1.5 1.5 0 016.5 0h3A1.5 1.5 0 0111 1.5zm-5 0v1h4v-1a.5.5 0 00-.5-.5h-3a.5.5 0 00-.5.5z"/>
          </svg>
        </button>
        <div class="pane-sep"></div>
        <button class="icon-btn-sm" id="btn-collapse-pane" title="Collapse panel">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 01.753 1.659l-4.796 5.48a1 1 0 01-1.506 0z"/>
          </svg>
        </button>
        <button class="icon-btn-sm" id="btn-expand-pane" title="Expand panel" style="display:none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 00.753-1.659l-4.796-5.48a1 1 0 00-1.506 0z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="output-content">
      <div class="output-lines" id="output-lines">
        <div class="output-empty" id="output-empty">Run your code to see output here</div>
      </div>
    </div>
  `;

  outputLinesEl = panel.querySelector("#output-lines");

  // Copy
  panel.querySelector("#btn-copy-output").addEventListener("click", () => {
    const text = [...outputLinesEl.querySelectorAll(".output-line")]
      .map((el) => el.textContent)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      const btn = panel.querySelector("#btn-copy-output");
      btn.title = "Copied!";
      setTimeout(() => (btn.title = "Copy output"), 1500);
    });
  });

  // Clear
  panel
    .querySelector("#btn-clear-output")
    .addEventListener("click", clearOutput);

  // Collapse / Expand
  const bottomPane = document.getElementById("bottom-pane");
  const collapseBtn = panel.querySelector("#btn-collapse-pane");
  const expandBtn = panel.querySelector("#btn-expand-pane");

  collapseBtn?.addEventListener("click", () => {
    savedHeight =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bottom-h")
        .trim() || "260px";
    document.documentElement.style.setProperty("--bottom-h", "36px");
    bottomPane?.classList.add("collapsed");
    collapseBtn.style.display = "none";
    expandBtn.style.display = "flex";
    isCollapsed = true;
  });

  expandBtn?.addEventListener("click", () => {
    document.documentElement.style.setProperty(
      "--bottom-h",
      savedHeight || "260px",
    );
    bottomPane?.classList.remove("collapsed");
    collapseBtn.style.display = "flex";
    expandBtn.style.display = "none";
    isCollapsed = false;
  });

  return {
    appendLine,
    clearOutput,
    getLastLines(n = 20) {
      return [...outputLinesEl.querySelectorAll(".output-line")]
        .slice(-n)
        .map((el) => el.textContent)
        .join("\n");
    },
  };
}

export function appendLine(text, type = "stdout") {
  if (!outputLinesEl) return;
  const emptyEl = outputLinesEl.querySelector("#output-empty");
  if (emptyEl) emptyEl.style.display = "none";
  const line = document.createElement("div");
  line.className = `output-line ${type}`;
  line.textContent = text;
  outputLinesEl.appendChild(line);
  lineCount++;
  outputLinesEl.scrollTop = outputLinesEl.scrollHeight;

  // Auto-expand if collapsed
  const bottomPane = document.getElementById("bottom-pane");
  if (isCollapsed && bottomPane) {
    const expandBtn = document.getElementById("btn-expand-pane");
    const collapseBtn = document.getElementById("btn-collapse-pane");
    document.documentElement.style.setProperty(
      "--bottom-h",
      savedHeight || "260px",
    );
    bottomPane.classList.remove("collapsed");
    if (expandBtn) expandBtn.style.display = "none";
    if (collapseBtn) collapseBtn.style.display = "flex";
    isCollapsed = false;
  }
}

export function clearOutput() {
  if (!outputLinesEl) return;
  outputLinesEl.innerHTML =
    '<div class="output-empty" id="output-empty">Run your code to see output here</div>';
  lineCount = 0;
}
