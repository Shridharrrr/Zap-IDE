// ─── Share Modal ──────────────────────────────────────────────
import { getShareURL, getPayloadSize } from '../../sharing/urlshare.js'
import { deploy } from '../../sharing/arweaveshare.js'

export function openShareModal({ getCode, getFilename }) {
    const existing = document.getElementById('share-modal-overlay')
    if (existing) existing.remove()

    const code = getCode()
    const filename = getFilename()
    const shareURL = getShareURL(code, filename)
    const sizeKB = Math.round(getPayloadSize(code, filename) / 1024 * 10) / 10
    const sizeOK = sizeKB < 40

    const overlay = document.createElement('div')
    overlay.id = 'share-modal-overlay'
    overlay.className = 'modal-overlay'

    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="share-title">
      <h2 class="modal-title" id="share-title">Share</h2>

      <div class="form-group">
        <label class="form-label">Share URL</label>
        <div class="url-preview-box" id="share-url-box">${escapeHtml(shareURL)}</div>
        <p class="size-indicator ${sizeOK ? 'size-ok' : 'size-warn'}">
          ${sizeOK
            ? `✓ Payload: ${sizeKB} KB — safe for URL sharing`
            : `⚠ Payload: ${sizeKB} KB — large! Consider Arweave deploy below`
        }
        </p>
        <button class="btn" id="btn-copy-url" style="width:100%">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2h8v2H4zm-2 2h12v10H2zm2 2v6h8V6z" opacity="0.7"/>
          </svg>
          Copy Link
        </button>
      </div>

      <div class="arweave-expand">
        <div class="arweave-expand-header" id="arweave-toggle">
          <span>🌐 Deploy to Arweave (permanent)</span>
          <span id="arweave-chevron">▸</span>
        </div>
        <div class="arweave-expand-body" id="arweave-body">
          <p style="font-size:12px;color:var(--text-muted);line-height:1.6">
            Deploy to the permaweb for a permanent, decentralized URL.<br>
            Your wallet JSON is used once and never stored.
          </p>
          <label class="form-label" style="margin-top:8px">Arweave Wallet JSON</label>
          <textarea id="wallet-textarea" placeholder='Paste your wallet JSON here…'></textarea>
          <button class="btn btn-run" id="btn-deploy" style="width:100%">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 1v10M4 7l4-6 4 6M2 14h12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Deploy to Arweave
          </button>
          <p class="arlink-result" id="arlink-result"></p>
          <p id="deploy-status" style="font-size:11px;color:var(--text-muted);display:none"></p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn" id="share-close">Close</button>
      </div>
    </div>
  `

    document.body.appendChild(overlay)

    // Copy link
    overlay.querySelector('#btn-copy-url').addEventListener('click', () => {
        navigator.clipboard.writeText(shareURL).then(() => {
            const btn = overlay.querySelector('#btn-copy-url')
            btn.textContent = '✓ Copied!'
            btn.style.color = 'var(--success)'
            setTimeout(() => {
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2h8v2H4zm-2 2h12v10H2zm2 2v6h8V6z" opacity="0.7"/></svg> Copy Link`
                btn.style.color = ''
            }, 2000)
        })
    })

    // Arweave expand toggle
    overlay.querySelector('#arweave-toggle').addEventListener('click', () => {
        const body = overlay.querySelector('#arweave-body')
        const chevron = overlay.querySelector('#arweave-chevron')
        body.classList.toggle('open')
        chevron.textContent = body.classList.contains('open') ? '▾' : '▸'
    })

    // Deploy
    overlay.querySelector('#btn-deploy').addEventListener('click', async () => {
        const walletJSON = overlay.querySelector('#wallet-textarea').value.trim()
        if (!walletJSON) {
            alert('Please paste your Arweave wallet JSON first')
            return
        }

        const deployBtn = overlay.querySelector('#btn-deploy')
        const statusEl = overlay.querySelector('#deploy-status')
        const arLinkResult = overlay.querySelector('#arlink-result')

        deployBtn.disabled = true
        statusEl.style.display = 'block'
        arLinkResult.style.display = 'none'

        // Build a standalone HTML for arweave
        const htmlContent = buildStandaloneHTML(code, filename)

        try {
            const result = await deploy(walletJSON, htmlContent, (msg) => {
                statusEl.textContent = msg
            })

            arLinkResult.style.display = 'block'
            arLinkResult.innerHTML = `
        ✓ Deployed! <a href="${escapeHtml(result.arlinkUrl)}" target="_blank" style="color:var(--teal)">${escapeHtml(result.arlinkUrl)}</a>
      `
            statusEl.style.display = 'none'
            // Clear wallet from memory
            overlay.querySelector('#wallet-textarea').value = ''

        } catch (err) {
            statusEl.textContent = '⚠ Deploy failed: ' + err.message
            statusEl.style.color = 'var(--error)'
        } finally {
            deployBtn.disabled = false
        }
    })

    // Close
    const closeModal = () => overlay.remove()
    overlay.querySelector('#share-close').addEventListener('click', closeModal)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler) } }
    document.addEventListener('keydown', escHandler)
}

function buildStandaloneHTML(code, filename) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(filename)} — Antigravity IDE</title>
  <meta name="description" content="Shared via Antigravity IDE"/>
</head>
<body>
  <p>This file was shared via <strong>Antigravity IDE</strong>.</p>
  <p>Return to the IDE to view: <a href="https://antigravity-ide.ar.io">antigravity-ide.ar.io</a></p>
  <pre>${escapeHtml(code)}</pre>
</body>
</html>`
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}