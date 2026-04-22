// ─── Settings Modal ───────────────────────────────────────────
import * as state from '../../store/state.js'

export function openSettingsModal() {
    const existing = document.getElementById('settings-modal-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = 'settings-modal-overlay'
    overlay.className = 'modal-overlay'

    const currentModel = state.get('model')
    const currentKey = state.get('apiKey') || ''
    const currentTheme = state.get('theme')
    const feedBackend = state.get('communityBackend') || 'ao'
    const aoPid = state.get('aoProcessId') || ''
    const ghUser = state.get('githubUsername') || ''
    const ghTok = state.get('githubToken') || ''

    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="settings-title">
      <h2 class="modal-title" id="settings-title">Settings</h2>

      <div class="form-group">
        <label class="form-label" for="settings-apikey">Bring your API key (Gemini)</label>
        <input
          class="form-input"
          id="settings-apikey"
          type="password"
          placeholder="AIza…"
          value="${escapeHtml(currentKey)}"
          autocomplete="off"
          spellcheck="false"
        />
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px">
          <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);cursor:pointer">
            <input type="checkbox" id="settings-showkey" style="accent-color:var(--accent)" />
            Show key
          </label>
          <span style="font-size:11px;color:var(--text-muted)">
            Stored locally in your browser.
          </span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-model">Model</label>
        <select class="form-select" id="settings-model">
          <optgroup label="Gemini (cloud)">
            <option value="gemini-2.5-flash" ${currentModel === 'gemini-2.5-flash' ? 'selected' : ''}>gemini-2.5-flash</option>
            <option value="gemini-2.5-flash-lite" ${currentModel === 'gemini-2.5-flash-lite' ? 'selected' : ''}>gemini-2.5-flash-lite</option>
            <option value="gemini-2.5-pro" ${currentModel === 'gemini-2.5-pro' ? 'selected' : ''}>gemini-2.5-pro</option>
          </optgroup>
          <optgroup label="Local (Ollama)">
            <option value="qwen2.5:3b" ${currentModel === 'qwen2.5:3b' ? 'selected' : ''}>qwen2.5:3b</option>
            <option value="qwen2.5:7b" ${currentModel === 'qwen2.5:7b' ? 'selected' : ''}>qwen2.5:7b</option>
            <option value="llama3.1:8b" ${currentModel === 'llama3.1:8b' ? 'selected' : ''}>llama3.1:8b</option>
          </optgroup>
        </select>
        <p style="font-size:11px;color:var(--text-muted);margin-top:6px">
          Gemini requires an API key. Local models require Ollama at <code>http://127.0.0.1:11434</code>.
        </p>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-theme">Editor Theme</label>
        <select class="form-select" id="settings-theme">
          <option value="vs-dark"  ${currentTheme === 'vs-dark' ? 'selected' : ''}>Dark (vs-dark)</option>
          <option value="vs"       ${currentTheme === 'vs' ? 'selected' : ''}>Light (vs)</option>
          <option value="hc-black" ${currentTheme === 'hc-black' ? 'selected' : ''}>High Contrast</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-feed-backend">Community feed backend</label>
        <select class="form-select" id="settings-feed-backend">
          <option value="ao" ${feedBackend === 'ao' ? 'selected' : ''}>Arweave AO (shared process)</option>
          <option value="gist" ${feedBackend === 'gist' ? 'selected' : ''}>GitHub Gists (username feed)</option>
        </select>
        <p style="font-size:11px;color:var(--text-muted);margin-top:6px">
          AO: deploy <code>registry.lua</code> once, paste the process ID below. Gists: set a GitHub username to read; add a fine-grained PAT to publish (stored locally).
        </p>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-ao-pid">AO process ID</label>
        <input class="form-input" id="settings-ao-pid" type="text" placeholder="From BetterIDEA / ao deploy" value="${escapeHtml(aoPid)}" autocomplete="off" spellcheck="false" />
        <p style="font-size:11px;color:var(--text-muted);margin-top:6px">
          Optional override for <code>VITE_AO_PROCESS_ID</code> in <code>.env</code>.
        </p>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-gh-user">GitHub username (gist feed)</label>
        <input class="form-input" id="settings-gh-user" type="text" placeholder="Organization or user whose public gists appear in Community" value="${escapeHtml(ghUser)}" autocomplete="off" spellcheck="false" />
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-gh-token">GitHub token (gist publish only)</label>
        <input class="form-input" id="settings-gh-token" type="password" placeholder="ghp_… or fine-grained token" value="${escapeHtml(ghTok)}" autocomplete="off" spellcheck="false" />
      </div>

      <div class="modal-footer">
        <button class="btn" id="settings-cancel">Cancel</button>
        <button class="btn btn-run" id="settings-save">Save</button>
      </div>
    </div>
  `

    document.body.appendChild(overlay)

    // Show/hide key
    overlay.querySelector('#settings-showkey').addEventListener('change', (e) => {
        const input = overlay.querySelector('#settings-apikey')
        input.type = e.target.checked ? 'text' : 'password'
    })

    // Save
    overlay.querySelector('#settings-save').addEventListener('click', () => {
        state.set('apiKey', overlay.querySelector('#settings-apikey').value.trim())
        state.set('model', overlay.querySelector('#settings-model').value)
        state.set('theme', overlay.querySelector('#settings-theme').value)
        state.set('communityBackend', overlay.querySelector('#settings-feed-backend').value)
        state.set('aoProcessId', overlay.querySelector('#settings-ao-pid').value.trim())
        state.set('githubUsername', overlay.querySelector('#settings-gh-user').value.trim())
        state.set('githubToken', overlay.querySelector('#settings-gh-token').value.trim())
        closeModal()
    })

    // Cancel / overlay click
    overlay.querySelector('#settings-cancel').addEventListener('click', closeModal)
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })

    // Escape key
    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler) } }
    document.addEventListener('keydown', escHandler)

    function closeModal() { overlay.remove() }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}