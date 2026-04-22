// ─── Preview Panel Component ──────────────────────────────────
import { buildVitePreviewHTML, isViteProject } from "../runtime/vitePreview.js";

let previewContainer = null;
let previewFrame = null;
let isPreviewVisible = false;

export function initPreviewPanel() {
  const outputPanel = document.getElementById("output-panel");
  if (!outputPanel) return null;

  // ── Add "Preview" tab to the pane-tabs bar ──────────────────
  // Wait for outputpanel.js to have rendered #pane-tabs first.
  // Since initOutputPanel() is called before initPreviewPanel(), it's already there.
  const paneTabs = outputPanel.querySelector("#pane-tabs");
  if (paneTabs) {
    const previewTab = document.createElement("button");
    previewTab.id = "btn-toggle-preview";
    previewTab.className = "pane-tab";
    previewTab.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style="opacity:.7">
        <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4l1 2h2v1H3v-1h2l1-2H2s-2 0-2-2V4zm1 6V4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1z"/>
      </svg>
      Preview
    `;
    previewTab.addEventListener("click", togglePreview);
    paneTabs.appendChild(previewTab);

    // Also let the Terminal tab switch back
    const terminalTab = document.getElementById("pane-tab-output");
    if (terminalTab) {
      terminalTab.addEventListener("click", hidePreview);
    }
  }

  // ── Create preview container (initially hidden) ─────────────
  previewContainer = document.createElement("div");
  previewContainer.id = "preview-container";
  Object.assign(previewContainer.style, {
    display: "none",
    flex: "1",
    flexDirection: "column",
    minHeight: "0",
    overflow: "hidden",
    background: "var(--bg-surface)"
  });
  previewContainer.innerHTML = `
    <div class="pane-header" style="border-bottom:1px solid var(--border);flex-shrink:0">
      <div class="pane-tabs" style="flex:1">
        <span style="padding:0 14px;font-size:12px;color:var(--text-2);font-weight:500;display:flex;align-items:center">🌐 Live Preview</span>
      </div>
      <div class="pane-actions">
        <button class="icon-btn-sm" id="btn-refresh-preview" title="Refresh preview" data-tooltip="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z"/>
            <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0115.926 6.5H14.91A5.002 5.002 0 008 3zM3.1 9.5a5.002 5.002 0 007.9 2.182.5.5 0 11.771.636A6.002 6.002 0 01.074 9.5H3.1z"/>
          </svg>
        </button>
        <button class="icon-btn-sm" id="btn-open-preview" title="Open in new tab" data-tooltip="Open">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.636 3.5a.5.5 0 00-.5-.5H1.5A1.5 1.5 0 000 4.5v10A1.5 1.5 0 001.5 16h10a1.5 1.5 0 001.5-1.5V7.864a.5.5 0 00-1 0V14.5a.5.5 0 01-.5.5h-10a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5h6.636a.5.5 0 00.5-.5z"/>
            <path d="M16 .5a.5.5 0 00-.5-.5h-5a.5.5 0 000 1h3.793L6.146 9.146a.5.5 0 10.708.708L15 1.707V5.5a.5.5 0 001 0v-5z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="preview-frame-container">
      <iframe id="preview-frame" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"></iframe>
    </div>
  `;

  outputPanel.appendChild(previewContainer);

  previewFrame = previewContainer.querySelector("#preview-frame");

  previewContainer
    .querySelector("#btn-refresh-preview")
    ?.addEventListener("click", () => {
      if (previewFrame?.srcdoc) previewFrame.srcdoc = previewFrame.srcdoc;
    });

  previewContainer
    .querySelector("#btn-open-preview")
    ?.addEventListener("click", () => {
      if (!previewFrame?.srcdoc) return;
      const blob = new Blob([previewFrame.srcdoc], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });

  return {
    showPreview,
    hidePreview,
    togglePreview,
    updatePreview,
    isVisible: () => isPreviewVisible,
  };
}

export function togglePreview() {
  const outputLines = document.querySelector(".output-content");
  const outputTab = document.getElementById("pane-tab-output");
  const previewTab = document.getElementById("btn-toggle-preview");

  if (isPreviewVisible) {
    if (previewContainer) previewContainer.style.display = "none";
    if (outputLines) outputLines.style.display = "flex";
    if (outputTab) outputTab.classList.add("active");
    if (previewTab) previewTab.classList.remove("active");
    isPreviewVisible = false;
  } else {
    if (previewContainer) previewContainer.style.display = "flex";
    if (outputLines) outputLines.style.display = "none";
    if (outputTab) outputTab.classList.remove("active");
    if (previewTab) previewTab.classList.add("active");
    // Auto-expand the bottom pane if it's collapsed
    const bottomPane = document.getElementById("bottom-pane");
    if (bottomPane?.classList.contains("collapsed")) {
      const saved =
        document.documentElement.style.getPropertyValue("--bottom-h") ||
        "260px";
      document.documentElement.style.setProperty(
        "--bottom-h",
        saved === "36px" ? "300px" : saved,
      );
      bottomPane.classList.remove("collapsed");
      const expandBtn = document.getElementById("btn-expand-pane");
      const collapseBtn = document.getElementById("btn-collapse-pane");
      if (expandBtn) expandBtn.style.display = "none";
      if (collapseBtn) collapseBtn.style.display = "flex";
    }
    isPreviewVisible = true;
  }
}

export function showPreview() {
  if (!isPreviewVisible) togglePreview();
}
export function hidePreview() {
  if (isPreviewVisible) togglePreview();
}

export function updatePreview(files, entryFile = "index.html") {
  if (!previewFrame) return;

  if (files && isViteProject(files)) {
    previewFrame.srcdoc = buildVitePreviewHTML(files);
    if (!isPreviewVisible) showPreview();
    return;
  }

  let htmlContent = files ? files[entryFile] || files["index.html"] : null;

  if (!htmlContent && files) {
    const jsxFile = Object.keys(files).find(
      (f) => f.endsWith(".jsx") || f.endsWith(".tsx"),
    );
    const jsFile = Object.keys(files).find(
      (f) => f.endsWith(".js") && !f.endsWith(".jsx"),
    );
    if (jsxFile || jsFile)
      htmlContent = generateHTMLWrapper(files, jsxFile || jsFile);
  }

  if (!htmlContent) {
    previewFrame.srcdoc = `<!DOCTYPE html><html><head><style>
      body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#09090b;color:#52525b;flex-direction:column;gap:8px}
      h3{font-size:15px;color:#71717a}p{font-size:12px}
    </style></head><body><h3>No preview available</h3><p>Create an index.html or .jsx component</p></body></html>`;
    return;
  }

  previewFrame.srcdoc = processHTML(htmlContent, files || {});
  if (!isPreviewVisible) showPreview();
}

function generateHTMLWrapper(files, mainFile) {
  const ext = mainFile.split(".").pop();
  if (ext === "jsx" || ext === "tsx") {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>body{margin:0;font-family:system-ui}</style></head>
<body><div id="root"></div>
<script type="text/babel">
${files[mainFile] || ""}
const root = ReactDOM.createRoot(document.getElementById('root'));
if(typeof App!=='undefined') root.render(<App/>);
</script></body></html>`;
  }
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>body{margin:0;font-family:system-ui;padding:16px}</style></head>
<body><div id="output"></div>
<script>
const out=document.getElementById('output');
const orig=console.log;
console.log=(...a)=>{orig(...a);const d=document.createElement('div');d.textContent=a.join(' ');out.appendChild(d);};
try{${files[mainFile] || ""}}catch(e){console.log('Error:',e.message);}
</script></body></html>`;
}

function processHTML(html, files) {
  let processed = html.replace(
    /<script[^>]+src=["']([^"']+)["'][^>]*>(<\/script>)?/gi,
    (match, src) => {
      const clean = src.replace(/^\.\//, "");
      const content = files[clean] || files[src];
      return content ? `<script>${content}</script>` : match;
    },
  );
  processed = processed.replace(
    /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi,
    (match, href) => {
      const clean = href.replace(/^\.\//, "");
      const content = files[clean] || files[href];
      return content ? `<style>${content}</style>` : match;
    },
  );
  return processed;
}

export function clearPreview() {
  if (previewFrame) previewFrame.srcdoc = "";
}
