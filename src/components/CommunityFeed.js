import * as state from "../store/state.js";
import {
  loadCommunitySnippets,
  publishSnippet,
  hasBrowserArweaveWallet,
  connectArweaveWallet,
  isAoConfigured,
} from "../services/community.js";

let modalEl = null;

export function initCommunityFeed() {
  return {
    open: showCommunityFeed,
  };
}

function feedFooterNote() {
  const backend = state.get("communityBackend") || "ao";
  if (backend === "gist") {
    const u = state.get("githubUsername")?.trim();
    return u
      ? `GitHub · @${u} · descriptions tagged ${"[antiG-IDE]"}`
      : "Set GitHub username in Settings for the gist feed.";
  }
  if (!isAoConfigured()) {
    return "AO · Set process ID in Settings or VITE_AO_PROCESS_ID.";
  }
  return hasBrowserArweaveWallet()
    ? "AO · Wander (ArConnect) · decentralized feed"
    : "AO · Local signer — install Wander for a funded wallet, or use GitHub Gists.";
}

async function showCommunityFeed() {
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.className = "modal-overlay welcome-overlay";
  modalEl.style.zIndex = "100001";

  const backend = state.get("communityBackend") || "ao";
  const loadingMsg =
    backend === "gist"
      ? "Fetching gists from GitHub…"
      : "Fetching snippets from AO…";

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
                <span id="feed-backend-badge" style="font-size:10px;padding:2px 8px;border-radius:999px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-3);text-transform:uppercase;letter-spacing:0.04em">${backend === "gist" ? "GitHub" : "AO"}</span>
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
                <p style="font-size:13px;">${loadingMsg}</p>
            </div>
        </div>

        <div class="modal-footer" style="padding: 12px 16px; border-top: 1px solid var(--border); display:flex; flex-wrap:wrap; gap:10px; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02)">
            <p style="font-size:11px; color:var(--text-3); margin:0; flex:1; min-width:160px">${feedFooterNote()}</p>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
              <button class="btn btn-ghost" id="btn-connect-wander" style="font-size:12px; padding: 8px 12px; display:none">Connect Wander</button>
              <button class="btn btn-run" id="btn-publish-now" style="font-size:12px; padding: 8px 16px;">
                  Push Current File
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

  const wanderBtn = modalEl.querySelector("#btn-connect-wander");
  if (
    (state.get("communityBackend") || "ao") === "ao" &&
    !hasBrowserArweaveWallet()
  ) {
    wanderBtn.style.display = "inline-flex";
    wanderBtn.onclick = async () => {
      try {
        await connectArweaveWallet();
        wanderBtn.textContent = "Connected";
        wanderBtn.disabled = true;
      } catch (e) {
        alert(e.message || String(e));
      }
    };
  }

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
                <p style="font-size:12px;">Publish from this IDE or adjust Settings (process ID / GitHub user).</p>
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
                <div class="snippet-card" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-md); padding:16px; cursor:pointer; transition:var(--t-fast); position:relative; overflow:hidden;"
                  data-code="${safeB64Encode(s.code)}"
                  data-title="${escapeAttr(s.title || "Untitled")}">
                    <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:8px; gap:8px;">
                        <span class="snippet-title" style="font-weight:600; color:var(--text-1); font-size:14px;">${escapeHtml(s.title || "Untitled")}</span>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">
                          ${s.html_url ? `<a href="${escapeAttr(s.html_url)}" target="_blank" rel="noopener noreferrer" class="gist-link" style="font-size:11px;color:var(--accent);text-decoration:none" onclick="event.stopPropagation()">View on GitHub →</a>` : ""}
                          <span style="font-size:10px; color:var(--text-3); font-family:var(--font-mono)">${formatTs(s.timestamp)}</span>
                        </div>
                    </div>
                    <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-2); background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; max-height:60px; overflow:hidden; mask-image: linear-gradient(to bottom, black 50%, transparent 100%);">
                        ${escapeHtml(s.code)}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  container.querySelectorAll(".snippet-card").forEach((card) => {
    card.onclick = () => {
      const code = safeB64Decode(card.dataset.code);
      const title = card.dataset.title || "snippet";
      loadSnippetToEditor(title, code);
    };
  });
}

function formatTs(ts) {
  const n = typeof ts === "number" ? ts : Number(ts);
  const d = Number.isFinite(n) ? new Date(n) : new Date();
  return d.toLocaleDateString();
}

function safeB64Encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str ?? "")));
  } catch {
    return btoa("");
  }
}

function safeB64Decode(b64) {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return "";
  }
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function loadSnippetToEditor(title, code) {
  if (
    confirm(`Load "${title}" into your editor? This will create or overwrite a file under Community/.`)
  ) {
    const safeName = String(title).replace(/[/\\\\?%*:|"<>]/g, "_") || "snippet";
    state.set("files", {
      ...state.get("files"),
      [`Community/${safeName}`]: code,
    });
    state.set("currentFile", `Community/${safeName}`);
    modalEl.remove();
  }
}

async function handlePublish() {
  const currentFile = state.get("currentFile");
  if (!currentFile) {
    alert("Please open a file first to publish.");
    return;
  }

  const files = state.get("files");
  const code = files[currentFile];
  const title = prompt(
    "Enter a title for your snippet:",
    currentFile.split("/").pop(),
  );

  if (!title) return;

  const btn = modalEl.querySelector("#btn-publish-now");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Publishing…";

  try {
    const result = await publishSnippet(title, code, currentFile);
    if (result.backend === "gist" && result.html_url) {
      alert(`Published Gist:\n${result.html_url}`);
    } else if (result.backend === "ao") {
      alert(
        result.msgId
          ? `Posted to AO (message ${result.msgId}).`
          : "Posted to AO.",
      );
    }
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
