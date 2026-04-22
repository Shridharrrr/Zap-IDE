# Zap-IDE

Zap-IDE is a browser-based, AI-powered IDE designed to empower developers with an integrated execution environment, AI-driven code scaffolding, and easy sharing.

It runs entirely in the browser, providing a high-performance playground for modern JavaScript, React, and Python applications without the need for complex local infrastructure.

---

## 🌟 Key Features

### 🤖 AI-Powered Autopilot
Deeply integrated AI capabilities designed for autonomous code generation and problem-solving:
- **Write:** Generates boilerplate, intricate logic, or entire files based on natural language prompts.
- **Fix:** Analyzes code and runtime errors (e.g., Python tracebacks or JS stack traces) to debug and rewrite the logic automatically.
- **Explain:** Patiently breaks down complex code visually with inline comments.
- **Refactor:** Optimizes given code blocks for readability, performance, or modern paradigms.
- **Test Generation:** Instantly writes assertions and unit tests.
- **Vite Multi-File Generation:** Generates multi-file React/Vite project architectures synchronously, managing the structure, styling, and interconnections seamlessly.

### ⚡ Local Sandbox Execution
Execute code entirely client-side using encapsulated runtime environments.
- **JavaScript Runtime:** Sandboxed execution inside non-blocking Web Workers.
- **Python Runtime:** Python code execution facilitated by Pyodide integrations.
- **React/HTML Previewer:** Instantly preview and hot-reload React components, HTML, and styling from the editor to see your UI exactly as your users will.

### 🌐 Community & Sharing
- **GitHub Gists Community:** Load and publish snippets through a GitHub username feed.
- **Direct URL Sharing:** Entire workspace states encode into the URL hash using LZ-String, enabling direct peer-to-peer sharing without a backend database.

### 🗂 Robust File System & Workspace
- **Virtual File Tree:** An intuitive explorer allowing you to create, navigate, import, and delete files seamlessly within your conceptual browser file-system.
- **Bulk Folder Importing:** Mount multi-file codebases natively into the Web application for immediate use.
- **Context Preservation:** Files automatically save state as they traverse between tabs, ensuring no code is lost.

### 🎨 Premium Developer Experience
- **Monaco Editor Support:** Utilizes Microsoft’s Monaco Editor (the heart of VS Code) for industry-standard syntax highlighting, keybinds, and navigation capabilities.
- **Dynamic Resizeable UI:** Drag-and-drop panes to perfectly balance your view between the code editor, terminal output, AI panel, and browser preview.
- **Modern UI Aesthetic:** A stunning frontend featuring glassmorphic components, fluid transitions, and professional styling details.

---

## 🏗 System Architecture & Design

### 1. Component Structure
The UI is modularized logically into components, driven via pure JavaScript:
```
src/
 ├── ai/                # AI prompt logic processing mapping single/multi-file schemas
 ├── components/        # UI pieces (FileTree, Editor, AI Panel, Output, Preview, Topbar)
 ├── runtime/           # Execution logic isolating User Code from System Code (Sandbox, Worker, Pyodide)
 ├── services/          # External connections (GitHub Gists, Community backend)
 ├── sharing/           # Codebase encoding/decoding and URL state management
 └── store/             # Global vanilla-JS centralized state pub/sub management
```

### 2. Runtime Isolation Model
To ensure that generated code doesn't crash the main interface loop, Zap-IDE executes code externally:
- **JavaScript:** Shunted to `worker.js` via `sandbox.js`. If execution exceeds 30 seconds or infinite loops occur, the Worker is violently terminated and recycled for safety.
- **Python:** Python tasks leverage the Wasm-compiled `Pyodide` runtime. Stdout, Stderr, and execution lifetimes are deeply monitored and proxied back to the main UI Output Panel.

### 3. Application State Lifecycle (`store/state.js`)
State mutations are handled cleanly. Setting state parameters (e.g., `state.set('currentFile', path)`) auto-triggers a subscription cascade to properly rerender dependent components, such as changing the syntax highlighting natively inside the Monaco instance. 

### 4. Code Generation Engine
The `src/ai/prompt.js` handles LLM directives rigidly, operating under strict constraints. It functions in two primary modes:
- `SINGLE_FILE`: Injecting and targeting specific components.
- `MULTI_FILE`: Emitting abstract codebase schemas mapped conceptually to:
  ```markdown
  FILE: path/to/file.ext
  ```
  The IDE intercepts these output tokens and dynamically populates the respective nodes natively within the Virtual File tree.

---

## 🛠️ Technology Stack

**Frontend Framework / Tooling:**
- **Vite:** Blazing-fast build tool and dev server.
- **Vanilla JS:** Standardized pure module architecture (no bulky frontend frameworks mapping the state).

**Editor & Core Logic:**
- **Monaco Editor:** High-performance, fully-featured code editor.
- **Pyodide:** Python in WASM setup.
- **LZ-String:** Compressed string representations for URL sharing.

**Community Integration:**
- **GitHub Gists API:** Snippet publishing and community feed.

---

## 🚀 Getting Started

### Prerequisites
- Node.js environment (v16.14.0 or greater recommended).

### Install & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local Vite DEV environment:
   ```bash
   npm run dev
   ```
3. Open the specified port on your localhost to access the app workspace.
4. **Build for production:**
   ```bash
   npm run build
   ```

### Community Setup (GitHub Gists)
1. Open **Settings** in Zap-IDE.
2. Set **GitHub username** to the account/org whose public gists should appear in Community.
3. (Optional, for publishing) Add a **fine-grained GitHub token** with only **Gists write** permission.
4. Open **Community** from the topbar and use **Push Current File** to publish.

---

## 📝 License
*(Add License here, e.g., MIT, GPLv3, etc.)*
