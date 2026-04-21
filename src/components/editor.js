// ─── Monaco Editor Component ──────────────────────────────────
import * as state from "../store/state.js";

const EXT_LANG_MAP = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
  py: "python",
  sh: "shell",
  bash: "shell",
  yaml: "yaml",
  yml: "yaml",
  svg: "xml",
  xml: "xml",
};

const DEFAULT_CODE = `// Welcome to Antigravity IDE ✦
// A browser-based Node.js playground powered by AI

const greet = (name) => {
  return \`Hello, \${name}! Ready to build something extraordinary?\`
}

console.log(greet('World'))

// Try the AI panel →  ask it to "write a fibonacci generator"
// or hit Run to execute this code
`;

let monacoInstance = null;
let editorInstance = null;

function getLanguage(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_LANG_MAP[ext] || "plaintext";
}

/**
 * Exported version — use this anywhere you need a Monaco language ID
 * (file tree selection, onApplyProject, import handlers, etc.)
 * Always returns the correct Monaco language ID based on file extension.
 */
export function getEditorLanguage(filename) {
  if (!filename) return "plaintext";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_LANG_MAP[ext] || "plaintext";
}

export async function initEditor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container #${containerId} not found`);

  // Load Monaco from CDN if not bundled
  let monaco;
  try {
    monaco = await import("monaco-editor");
  } catch {
    // Fallback: load via AMD from CDN
    await loadMonacoCDN();
    monaco = window.monaco;
  }

  monacoInstance = monaco;

  const theme = state.get("theme");
  const filename = state.get("filename");

  editorInstance = monaco.editor.create(container, {
    value: DEFAULT_CODE,
    language: getLanguage(filename),
    theme: theme,
    fontSize: 13,
    fontFamily: '"Space Mono", "Fira Code", monospace',
    fontLigatures: true,
    lineHeight: 22,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    automaticLayout: true,
    smoothScrolling: true,
    cursorBlinking: "phase",
    cursorSmoothCaretAnimation: "on",
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: "gutter",
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  });

  // Expose globally for emergencies
  window.editor = editorInstance;
  window.monaco = monaco;

  // React to theme changes
  state.subscribe("theme", (newTheme) => {
    monaco.editor.setTheme(newTheme);
  });

  // React to filename changes → update language (covers all file-switch paths)
  state.subscribe("filename", (newFilename) => {
    if (!newFilename) return;
    const lang = getLanguage(newFilename);
    const model = editorInstance.getModel();
    if (model) monaco.editor.setModelLanguage(model, lang);
  });

  return {
    getValue() {
      return editorInstance?.getValue() ?? "";
    },
    setValue(code) {
      editorInstance?.setValue(code);
    },
    setLanguage(lang) {
      const model = editorInstance?.getModel();
      if (model) monaco.editor.setModelLanguage(model, lang);
    },
    setTheme(theme) {
      monaco.editor.setTheme(theme);
    },
    focus() {
      editorInstance?.focus();
    },
    getEditor() {
      return editorInstance;
    },
  };
}

async function loadMonacoCDN() {
  if (window.monaco) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js";
    script.onload = () => {
      window.require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
        },
      });
      window.require(["vs/editor/editor.main"], () => resolve());
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function getEditorValue() {
  return editorInstance?.getValue() ?? "";
}

export function setEditorValue(code) {
  editorInstance?.setValue(code);
}
