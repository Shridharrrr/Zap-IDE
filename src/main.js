// ─── Zap-IDE — Main Entry ────────────────────────────
import "./global.css";
import * as state from "./store/state.js";
import { initTopbar } from "./components/Topbar.js";
import { initAIPanel } from "./components/AIpanel.js";
import {
  initOutputPanel,
  appendLine,
  clearOutput,
} from "./components/outputpanel.js";
import {
  initEditor,
  getEditorValue,
  setEditorValue,
  getEditorLanguage,
} from "./components/editor.js";
import { initFileTree, getFileTreeAPI } from "./components/FileTree.js";
import { importFolder, importSingleFile } from "./components/folderImport.js";
import { initPreviewPanel, updatePreview } from "./components/previewPanel.js";
import { openSettingsModal } from "./components/Models/settingModal.js";
import { openShareModal } from "./components/Models/sharemodal.js";
import { openOnboardingModal } from "./components/Models/onboardingModal.js";
import { runCode, killWorker, detectLanguage } from "./runtime/sandbox.js";
import { decode, clearHash } from "./sharing/urlshare.js";
import { initCommunityFeed } from "./components/CommunityFeed.js";

// ─── Render skeleton HTML ─────────────────────────────────────
document.getElementById("app").innerHTML = `
  <header id="topbar"></header>

  <aside id="file-tree-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-label">Explorer</span>
      <div class="sidebar-actions">
        <button class="icon-btn" id="btn-create-file" title="New File" data-tooltip="New File">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1H4a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6L9 1zm0 1.5L12.5 6H9V2.5zM4 13V3h4v4h4v6H4z"/>
          </svg>
        </button>
        <button class="icon-btn" id="btn-import-folder" title="Import Folder" data-tooltip="Import Folder">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 4.5V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2h5.5L14 4.5zM8 7.5a.5.5 0 00-1 0V10H4.5a.5.5 0 000 1H7v2.5a.5.5 0 001 0V11h2.5a.5.5 0 000-1H8V7.5z"/>
          </svg>
        </button>
        <button class="icon-btn" id="btn-import-file" title="Import File" data-tooltip="Import File">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1h5.5L14 5.5V14a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2zm0 1a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V6l-4-4H4z"/>
            <path d="M9.5 1.5V5h3.5L9.5 1.5z"/>
          </svg>
        </button>
      </div>
    </div>
    <div id="file-tree" class="file-tree"></div>
  </aside>

  <main id="editor-area">
    <div id="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
      <p style="font-family:var(--font-ui); font-size:13px; font-weight:500; color:var(--text-3);">Create or select a file to begin</p>
    </div>
    <div id="editor-pane" style="display: none;">
      <div id="editor-breadcrumb">
        <span class="bc-file" id="bc-filename">—</span>
      </div>
      <div id="editor-container"></div>
    </div>
    <div id="panel-resize-handle" style="display: none;"></div>
    <div id="bottom-pane" style="display: none;">
      <div id="output-panel"></div>
    </div>
  </main>

  <aside id="ai-panel"></aside>

  <div id="viewer-banner" class="hidden"></div>
`;

// ─── Output panel ref for AI error context ────────────────────
let outputPanelAPI = null;

// ─── Breadcrumb updater ───────────────────────────────────────
function updateBreadcrumb(path) {
  const el = document.getElementById("bc-filename");
  if (!el || !path) return;
  const parts = path.split("/");
  el.textContent = parts[parts.length - 1] || path;
  el.title = path;
}

// ─── Boot sequence ────────────────────────────────────────────
async function boot() {
  // 1. Init output panel
  outputPanelAPI = initOutputPanel();

  // 2. Init Preview Panel
  initPreviewPanel();

  let editorAPI;
  try {
    editorAPI = await initEditor("editor-container");
  } catch (err) {
    console.error("Editor init failed:", err);
    appendLine("⚠ Editor failed to load: " + err.message, "stderr");
  }

  const getCode = () => editorAPI?.getValue() ?? "";
  const setCode = (code) => {
    let currentFile = state.get("currentFile");
    if (!currentFile) {
      currentFile = "Component.jsx";
      state.set("currentFile", currentFile);
      updateBreadcrumb(currentFile);
      state.set("filename", currentFile);
    }
    // Auto-sync into file tree state so rendering updates
    const files = state.get("files") || {};
    files[currentFile] = code;
    state.set("files", { ...files });
    
    editorAPI?.setValue(code);
  };

  // Auto-save on editor changes
  let saveTimeout;
  const autoSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const currentFile = state.get("currentFile");
      if (currentFile) {
        const files = state.get("files") || {};
        files[currentFile] = getCode();
        state.set("files", files);
      }
    }, 500);
  };

  // Subscribe to editor changes for auto-save
  if (window.editor) {
    window.editor.onDidChangeModelContent(() => autoSave());
  }

  // 4. Check for shared URL
  const shared = decode();
  if (shared) {
    if (shared.files && typeof shared.files === "object") {
      const projectFiles = shared.files || {};
      state.set("files", { ...projectFiles });

      const editorCandidates = [
        shared.entryFile,
        "src/App.jsx",
        "src/App.tsx",
        "src/main.jsx",
        "src/main.tsx",
        "src/main.js",
        "src/index.jsx",
        "src/index.js",
        "main.jsx",
        "main.js",
        "index.html",
      ].filter(Boolean);

      const mainFile =
        editorCandidates.find((f) => projectFiles[f]) ||
        Object.keys(projectFiles).find((f) => /\.(jsx|tsx|html?)$/.test(f)) ||
        Object.keys(projectFiles)[0];

      if (mainFile) {
        state.set("currentFile", mainFile);
        state.set("filename", mainFile.split("/").pop());
        updateBreadcrumb(mainFile);
        setCode(projectFiles[mainFile] || "");
        editorAPI?.setLanguage(getEditorLanguage(mainFile));
        updatePreview(projectFiles, mainFile);
      }

      showViewerBanner(setCode, projectFiles[mainFile] || "");
    } else {
      setCode(shared.code || "");
      if (shared.filename) state.set("filename", shared.filename);
      showViewerBanner(setCode, shared.code);
    }
    clearHash();
  }

  // 5. Init File Tree
  const fileTreeAPI = initFileTree({
    onFileSelect: (path) => {
      const files = state.get("files");
      if (files && files[path] !== undefined) {
        // Save current file content before switching
        const currentFile = state.get("currentFile");
        if (currentFile && state.get("files")[currentFile] !== undefined) {
          const updatedFiles = {
            ...state.get("files"),
            [currentFile]: getCode(),
          };
          state.set("files", updatedFiles);
        }

        // Update state to the new file BEFORE setting code
        state.set("currentFile", path);
        state.set("filename", path.split("/").pop());
        updateBreadcrumb(path);

        setCode(files[path]);
        editorAPI?.setLanguage(getEditorLanguage(path));
      }
    },
    onImportFolder: handleImportFolder,
  });

  // 6. Setup import buttons
  document
    .getElementById("btn-import-folder")
    ?.addEventListener("click", handleImportFolder);
  document
    .getElementById("btn-import-file")
    ?.addEventListener("click", handleImportFile);

  // Setup keyboard shortcut for save (Ctrl+S)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      const currentFile = state.get("currentFile");
      if (currentFile) {
        fileTreeAPI.saveFile(currentFile, getCode());
        appendLine(`💾 Saved ${currentFile}`, "info");
      }
    }
  });

  // 7. Init Community Feed
  const communityFeed = initCommunityFeed();

  // 8. Init Topbar
  initTopbar({
    onRun() {
      handleRun(getCode);
    },
    onStop() {
      killWorker();
      state.set("isRunning", false);
      appendLine("● Execution stopped", "warn");
    },
    onShare() {
      openShareModal({
        getFiles: () => {
          const currentFile = state.get("currentFile");
          const files = state.get("files") || {};
          // Ensure the current editor buffer is included.
          if (currentFile) return { ...files, [currentFile]: getCode() };
          return { ...files };
        },
        getEntryFile: () => state.get("currentFile") || state.get("filename"),
      });
    },
    onSettings() {
      openSettingsModal();
    },
    onCommunity: () => communityFeed.open(),
  });

  // 8. Init AI Panel
  initAIPanel({
    getCode,
    setCode,
    getOutput: () => outputPanelAPI?.getLastLines(30) ?? "",
    onApplyProject: (projectFiles) => {
      // Load all files into state (triggers file tree re-render)
      state.set("files", { ...projectFiles });

      // Pick the best file to open in the editor
      // Prefer App component so the user sees something meaningful immediately
      const editorCandidates = [
        "src/App.jsx",
        "src/App.tsx",
        "src/main.jsx",
        "src/main.tsx",
        "src/main.js",
        "src/index.jsx",
        "src/index.js",
        "main.jsx",
        "main.js",
      ];
      const mainFile =
        editorCandidates.find((f) => projectFiles[f]) ||
        Object.keys(projectFiles).find((f) => /\.(jsx|tsx)$/.test(f)) ||
        Object.keys(projectFiles)[0];

      if (mainFile) {
        state.set("currentFile", mainFile);
        updateBreadcrumb(mainFile);
        state.set("filename", mainFile.split("/").pop());
        setCode(projectFiles[mainFile] || "");

        // Sync the editor language using the full path for accuracy
        editorAPI?.setLanguage(getEditorLanguage(mainFile));
      }

      // Trigger the React preview (virtual bundler kicks in)
      updatePreview(projectFiles, mainFile || "src/main.jsx");

      appendLine(
        `🚀 Project applied — ${Object.keys(projectFiles).length} files loaded`,
        "info",
      );
    },
  });

  // 9. Toggle Editor visibility based on current file selection
  const updateEditorVisibility = (file) => {
    const emptyState = document.getElementById("empty-state");
    const editorPane = document.getElementById("editor-pane");
    const resizeHandle = document.getElementById("panel-resize-handle");
    const bottomPane = document.getElementById("bottom-pane");
    
    if (file) {
      emptyState.style.display = "none";
      editorPane.style.display = "flex";
      resizeHandle.style.display = "block"; // vertical bar

      // Let Monaco resize after becoming visible
      setTimeout(() => window.editor?.layout(), 0);
    } else {
      emptyState.style.display = "flex";
      editorPane.style.display = "none";
      resizeHandle.style.display = "none";
    }
    
    // Always show terminal
    bottomPane.style.display = "flex";
  };

  // Wire up visibility toggling 
  state.subscribe("currentFile", updateEditorVisibility);
  updateEditorVisibility(state.get("currentFile"));

  // 10. Toggle AI panel visibility based on model choice
  const updateAIPanelVisibility = (model) => {
    const aiPanel = document.getElementById("ai-panel");
    if (!aiPanel) return;
    
    if (model === "none") {
      aiPanel.style.display = "none";
      document.documentElement.style.setProperty("--ai-panel-w", "0px");
    } else {
      aiPanel.style.display = "flex";
      aiPanel.style.flexDirection = "column";
      // Only reset width if it's currently 0
      if (getComputedStyle(document.documentElement).getPropertyValue('--ai-panel-w').trim() === '0px') {
        document.documentElement.style.setProperty("--ai-panel-w", "480px");
      }
    }
    // Allow Monaco to resize itself since grid changed
    setTimeout(() => window.editor?.layout(), 0);
  };

  state.subscribe("model", updateAIPanelVisibility);
  updateAIPanelVisibility(state.get("model"));

  // Open onboarding on every new initialization
  openOnboardingModal();
} // End of boot()

// ─── Folder Import Handler ────────────────────────────────────
async function handleImportFolder() {
  try {
    const result = await importFolder();
    if (!result) return; // User cancelled

    state.set("folderName", result.name);
    state.set("files", result.files);

    // Select first file by default
    const firstFile = Object.keys(result.files)[0];
    if (firstFile) {
      state.set("currentFile", firstFile);
      state.set("filename", firstFile.split("/").pop());
      setEditorValue(result.files[firstFile]);

      // Update editor language
      const editor = window.editor;
      if (editor && window.monaco) {
        window.monaco.editor.setModelLanguage(
          editor.getModel(),
          getEditorLanguage(firstFile),
        );
      }
    }

    appendLine(
      `✓ Imported folder "${result.name}" with ${Object.keys(result.files).length} files`,
      "info",
    );
  } catch (err) {
    appendLine(`✗ Import failed: ${err.message}`, "stderr");
  }
}

// ─── Single File Import Handler ───────────────────────────────
async function handleImportFile() {
  try {
    const result = await importSingleFile();
    if (!result) return; // User cancelled

    const files = state.get("files") || {};
    files[result.name] = result.content;
    state.set("files", files);
    state.set("currentFile", result.name);
    state.set("filename", result.name);
    setEditorValue(result.content);

    // Update editor language
    const editor = window.editor;
    if (editor && window.monaco) {
      window.monaco.editor.setModelLanguage(
        editor.getModel(),
        getEditorLanguage(result.name),
      );
    }

    appendLine(`✓ Imported file "${result.name}"`, "info");
  } catch (err) {
    appendLine(`✗ Import failed: ${err.message}`, "stderr");
  }
}

// ─── Run handler ──────────────────────────────────────────────
async function handleRun(getCode) {
  if (state.get("isRunning")) return;

  const code = getCode();
  const filename = state.get("currentFile") || state.get("filename");
  const language = detectLanguage(filename);
  const files = state.get("files") || {};

  // Check if this is a React/HTML file that should be previewed
  const ext = filename.split(".").pop()?.toLowerCase();
  const isPreviewable =
    ["html", "htm", "jsx", "tsx"].includes(ext) ||
    Object.keys(files).some((f) => f.endsWith(".html") || f.endsWith(".htm"));

  if (isPreviewable) {
    // Update preview for React/HTML files
    updatePreview(files, filename);
    appendLine(`▸ Preview updated — ${filename}`, "info");
    return;
  }

  clearOutput();
  state.set("isRunning", true);

  const langLabel = language === "python" ? "Python" : "JavaScript";
  appendLine(`▸ Running ${langLabel}…`, "info");

  const start = Date.now();

  await runCode(code, {
    filename,
    language,
    onStdout: (text) => {
      text.split("\n").forEach((line) => {
        if (line !== "") appendLine(line, "stdout");
      });
    },
    onStderr: (text) => {
      text.split("\n").forEach((line) => {
        if (line !== "") appendLine(line, "stderr");
      });
    },
    onWarn: (text) => {
      appendLine(text, "warn");
    },
    onDone: ({ error }) => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      appendLine(
        error ? `✗ Exited with error — ${elapsed}s` : `✓ Done — ${elapsed}s`,
        error ? "stderr" : "done",
      );
      state.set("isRunning", false);
    },
  });
}

// ─── Viewer Banner ────────────────────────────────────────────
function showViewerBanner(setCode, originalCode) {
  const banner = document.getElementById("viewer-banner");
  if (!banner) return;

  banner.innerHTML = `
    <span>👁 Viewing shared code</span>
    <button class="btn fork-btn" id="fork-btn">Fork & Edit</button>
    <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px" id="banner-close">✕</button>
  `;
  banner.classList.remove("hidden");
  banner.style.display = "flex";

  banner.querySelector("#banner-close").addEventListener("click", () => {
    banner.style.display = "none";
  });
  banner.querySelector("#fork-btn").addEventListener("click", () => {
    // Code is already loaded — just remove the viewer mode hint
    banner.style.display = "none";
    appendLine("✓ Forked! You can now edit freely.", "info");
  });
}




// ─── Pane resize + collapse wiring ────────────────────────────
function initResizeHandles() {
  // ── Editor ↔ bottom pane vertical resize ──────────────────
  const resizeH = document.getElementById("panel-resize-handle");
  const bottomPane = document.getElementById("bottom-pane");
  let rH = false,
    rHStartY = 0,
    rHStartH = 0;

  resizeH?.addEventListener("mousedown", (e) => {
    rH = true;
    rHStartY = e.clientY;
    rHStartH = bottomPane.getBoundingClientRect().height;
    resizeH.classList.add("dragging");
    document.body.style.cssText += "cursor:row-resize;user-select:none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!rH) return;
    const delta = rHStartY - e.clientY;
    const newH = Math.max(
      36,
      Math.min(window.innerHeight - 180, rHStartH + delta),
    );
    document.documentElement.style.setProperty("--bottom-h", newH + "px");
    // Remove collapsed class if dragging open
    if (newH > 60) bottomPane?.classList.remove("collapsed");
  });

  window.addEventListener("mouseup", () => {
    if (!rH) return;
    rH = false;
    resizeH?.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  // ── AI panel horizontal resize ─────────────────────────────
  const aiPanel = document.getElementById("ai-panel");
  const aiHandle = document.getElementById("ai-resize-handle");
  let rA = false,
    rAStartX = 0,
    rAStartW = 0;

  aiHandle?.addEventListener("mousedown", (e) => {
    rA = true;
    rAStartX = e.clientX;
    rAStartW = aiPanel.getBoundingClientRect().width;
    aiHandle.classList.add("dragging");
    document.body.style.cssText += "cursor:col-resize;user-select:none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!rA) return;
    const delta = rAStartX - e.clientX;
    const newW = Math.max(320, Math.min(960, rAStartW + delta));
    document.documentElement.style.setProperty("--ai-panel-w", newW + "px");
  });

  window.addEventListener("mouseup", () => {
    if (!rA) return;
    rA = false;
    aiHandle?.classList.remove("dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });
}

initResizeHandles();

// ─── Start ────────────────────────────────────────────────────
boot().catch((err) => {
  console.error("Boot failed:", err);
  document.getElementById("app").innerHTML = `
    <div style="padding:40px;font-family:monospace;color:#ff4d6a;background:#07070d;min-height:100vh">
      <h2>Boot Error</h2>
      <pre>${err.stack || err.message}</pre>
    </div>
  `;
});
