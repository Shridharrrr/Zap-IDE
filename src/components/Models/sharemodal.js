// ─── Share Modal ──────────────────────────────────────────────
import { shareProject } from "../../sharing/arweaveshare.js";

export async function openShareModal({ getFiles, getEntryFile }) {
  const existing = document.getElementById("share-modal-overlay");
  if (existing) existing.remove();

  const files = getFiles?.() || {};
  const entryFile = getEntryFile?.() || null;

  const overlay = document.createElement("div");
  overlay.id = "share-modal-overlay";
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="share-title">
      <h2 class="modal-title" id="share-title">Share Project</h2>
      <div id="share-content" class="form-group">
        <p style="color:var(--text-muted); display:flex; align-items:center; gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          Deploying to Arweave...
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn" id="share-close">Close</button>
      </div>
    </div>
  `;

  const spinStyle = document.createElement("style");
  spinStyle.innerHTML = `@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`;
  overlay.appendChild(spinStyle);

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();
  overlay.querySelector("#share-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  try {
    const result = await shareProject(files, entryFile);
    
    const content = overlay.querySelector("#share-content");
    content.innerHTML = `
      <label class="form-label">Permanent Arweave Link</label>
      <div class="url-preview-box" id="share-url-box" style="margin-bottom: 8px;">${escapeHtml(result.shareURL)}</div>
      
      <button class="btn" id="btn-copy-url" style="width:100%; margin-bottom: 16px;">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2h8v2H4zm-2 2h12v10H2zm2 2v6h8V6z" opacity="0.7"/>
        </svg>
        Copy Link
      </button>

      <label class="form-label" style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; display: block;">Fallback Tunnels</label>
      <div style="display:flex; flex-direction:column; gap:6px;">
        ${result.links.map(link => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel); padding:6px 8px; border-radius:4px; border:1px solid var(--border-subtle); font-size:11px;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%; opacity: 0.8;">${escapeHtml(link)}</span>
            <button class="icon-btn fallback-copy" data-url="${escapeHtml(link)}" title="Copy" style="padding: 4px; height: auto;">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2h8v2H4zm-2 2h12v10H2zm2 2v6h8V6z" opacity="0.7"/>
              </svg>
            </button>
          </div>
        `).join('')}
      </div>
    `;

    content.querySelector("#btn-copy-url").addEventListener("click", () => {
      navigator.clipboard.writeText(result.shareURL).then(() => {
        const btn = content.querySelector("#btn-copy-url");
        btn.textContent = "✓ Copied!";
        btn.style.color = "var(--success)";
        setTimeout(() => {
          btn.innerHTML =
            '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8v2H4zm-2 2h12v10H2zm2 2v6h8V6z" opacity="0.7"/></svg> Copy Link';
          btn.style.color = "";
        }, 2000);
      });
    });

    content.querySelectorAll(".fallback-copy").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const url = e.currentTarget.getAttribute("data-url");
        navigator.clipboard.writeText(url).then(() => {
          const original = e.currentTarget.innerHTML;
          e.currentTarget.innerHTML = `<span style="color:var(--success)">✓</span>`;
          setTimeout(() => {
            e.currentTarget.innerHTML = original;
          }, 2000);
        });
      });
    });

  } catch (err) {
    const content = overlay.querySelector("#share-content");
    content.innerHTML = `
      <div style="color:var(--error); padding:12px; background:rgba(255,0,0,0.1); border-radius:4px;">
        <strong>Deployment Failed</strong><br/>
        ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
