import * as state from "../store/state.js";
import { loadCommunitySnippets, publishSnippet } from "../services/community.js";
import { fetchFullGistProject } from "../services/gist.js";

let modalEl = null;

export function initCommunityFeed() {
  return {
    open: showCommunityFeed,
  };
}

function feedFooterNote() {
  const u = state.get("githubUsername")?.trim();
  return u
    ? `GitHub · @${u} · descriptions tagged ${"[Zap-IDE]"}`
    : "Set GitHub username in Settings to load the feed.";
}

async function showCommunityFeed() {
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.className = "modal-overlay welcome-overlay";
  modalEl.style.zIndex = "100001";

  modalEl.innerHTML = `
      <div class="modal welcome-modal" style="width: 600px; max-width: 90vw; height: 500px; padding:0; display:flex; flex-direction:column; overflow:hidden;">
        <div class="pane-header" style="padding: 0 16px; height: 50px; border-bottom: 1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:10px; flex:1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span style="font-weight:600; font-size:15px; color:var(--text-1)">Community Feed</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em">GitHub</span>
            </div>
            <button class="icon-btn" id="close-feed" style="margin-left:auto">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        <div id="feed-content" style="flex:1; overflow-y:auto; padding: 20px;">
            <div class="loading-state" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-3); gap:12px;">
                <div class="spinner" style="display:block; width:24px; height:24px;"></div>
                <p style="font-size:13px;">Fetching gists from GitHub…</p>
            </div>
        </div>

        <div class="modal-footer" style="padding: 12px 16px; border-top: 1px solid var(--border); display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02)">
            <p style="font-size:11px; color:var(--text-3); margin:0; flex:1; min-width:160px">${feedFooterNote()}</p>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <button class="btn btn-run" id="btn-publish-now" style="font-size:12px; padding: 8px 16px;">
                  Push Full Project
              </button>
            </div>
        </div>
      </div>
    `;

  document.body.appendChild(modalEl);

  const closeBtn = modalEl.querySelector("#close-feed");
  closeBtn.onclick = () => modalEl.remove();
  modalEl.onclick = (e) => {
    if (e.target === modalEl) modalEl.remove();
  };

  const publishBtn = modalEl.querySelector("#btn-publish-now");
  publishBtn.onclick = handlePublish;

  try {
    const snippets = await loadCommunitySnippets();
    renderSnippets(snippets);
  } catch (err) {
    showError(err.message || "Failed to load feed.");
  }
}

function renderSnippets(snippets) {
  const container = modalEl.querySelector("#feed-content");
  if (!snippets || snippets.length === 0) {
    container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-3); text-align:center;">
                <p style="font-size:14px; margin-bottom:8px;">Nothing here yet.</p>
                <p style="font-size:12px;">Publish from this IDE or set a GitHub username in Settings.</p>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr; gap: 12px;">
            ${snippets
              .slice()
              .reverse()
              .map(
                (s) => `
                <div class="snippet-card" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-md); padding:18px; transition:var(--t-fast); position:relative; overflow:hidden; display:flex; flex-direction:column; gap:16px; border-left: 3px solid var(--accent);">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;">
                        <div style="display:flex; flex-direction:column; gap:4px">
                          <span class="snippet-title" style="font-weight:600; color:var(--text-1); font-size:15px; letter-spacing:-0.01em;">${escapeHtml(s.title || "Untitled")}</span>
                          <span style="font-size:10px; color:var(--text-3); font-family:var(--font-mono); opacity:0.8;">By @${escapeHtml(s.author)} • ${formatTs(s.timestamp)}</span>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
                      ${s.arweaveUrl ? `
                        <a href="${escapeAttr(s.arweaveUrl)}" target="_blank" rel="noopener noreferrer" 
                           style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3); font-size:11px; font-weight:600; padding:10px; border-radius:6px; text-decoration:none; transition:all 0.2s;" 
                           onmouseover="this.style.background='rgba(34,197,94,0.25)'; this.style.borderColor='rgba(34,197,94,0.5)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'; this.style.borderColor='rgba(34,197,94,0.3)'">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                          Launch App
                        </a>
                      ` : ""}
                      
                      <button class="btn-import-gist" 
                         data-gist-files="${escapeAttr(JSON.stringify(s.files))}"
                         data-title="${escapeAttr(s.title || "Untitled")}"
                         style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(123,97,255,0.15); color:#a78bff; border:1px solid rgba(123,97,255,0.3); font-size:11px; font-weight:600; padding:10px; border-radius:6px; cursor:pointer; transition:all 0.2s;"
                         onmouseover="this.style.background='rgba(123,97,255,0.25)'; this.style.borderColor='rgba(123,97,255,0.5)'" onmouseout="this.style.background='rgba(123,97,255,0.15)'; this.style.borderColor='rgba(123,97,255,0.3)'">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        Import to IDE
                      </button>

                      ${s.html_url ? `
                        <a href="${escapeAttr(s.html_url)}" target="_blank" rel="noopener noreferrer" 
                           style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(255,255,255,0.03); color:var(--text-2); border:1px solid var(--border); font-size:11px; padding:10px; border-radius:6px; text-decoration:none; transition:all 0.2s;" 
                           onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                          View Gist
                        </a>
                      ` : ""}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  container.querySelectorAll(".btn-import-gist").forEach((btn) => {
    btn.onclick = async (e) => {
      const gistFiles = JSON.parse(btn.dataset.gistFiles);
      const title = btn.dataset.title || "project";
      
      const originalText = btn.innerHTML;
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
      btn.textContent = "Loading…";
      
      try {
        const fullProject = await fetchFullGistProject(gistFiles);
        loadSnippetToEditor(title, fullProject);
      } catch (err) {
        alert("Failed to load full project: " + err.message);
      } finally {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
        btn.innerHTML = originalText;
      }
    };
  });
}

function loadSnippetToEditor(title, projectFiles) {
  if (
    confirm(`Load project "${title}" into your editor? This will overwrite or add files under Community/${title}/.`)
  ) {
    const safeTitle = String(title).replace(/[/\\\\?%*:|"<>]/g, "_") || "project";
    const currentFiles = state.get("files") || {};
    const newFiles = { ...currentFiles };
    
    for (const [path, content] of Object.entries(projectFiles)) {
      newFiles[`Community/${safeTitle}/${path}`] = content;
    }

    state.set("files", newFiles);
    // Find entry file if possible, else just pick the first one
    const paths = Object.keys(projectFiles);
    const entry = paths.find(p => p.endsWith("App.jsx") || p.endsWith("main.jsx") || p.endsWith("index.html")) || paths[0];
    state.set("currentFile", `Community/${safeTitle}/${entry}`);
    modalEl.remove();
  }
}

async function handlePublish() {
  const files = state.get("files");
  if (!files || Object.keys(files).length === 0) {
    alert("No files to publish.");
    return;
  }

  const title = prompt("Enter a title for your project:", "My Awesome Project");
  if (!title) return;

  const btn = modalEl.querySelector("#btn-publish-now");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Deploying & Publishing…";

  try {
    const entryFile = state.get("currentFile") || "index.html";
    const result = await publishSnippet(title, files, entryFile);
    
    let msg = `Project Published!`;
    if (result.html_url) msg += `\nGist: ${result.html_url}`;
    if (result.arweaveUrl) msg += `\nPreview: ${result.arweaveUrl}`;
    
    alert(msg);
    
    const snippets = await loadCommunitySnippets();
    renderSnippets(snippets);
  } catch (err) {
    alert(err.message || String(err));
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function showError(msg) {
  const container = modalEl.querySelector("#feed-content");
  container.innerHTML = `<div style="color:var(--red); text-align:center; padding:20px;">${escapeHtml(msg)}</div>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTs(ts) {
  const n = typeof ts === "number" ? ts : Number(ts);
  const d = Number.isFinite(n) ? new Date(n) : new Date();
  return d.toLocaleDateString();
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
