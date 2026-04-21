// ─── Settings Modal ───────────────────────────────────────────
import * as state from '../../store/state.js'

export function openSettingsModal() {
    const existing = document.getElementById('settings-modal-overlay')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = 'settings-modal-overlay'
    overlay.className = 'modal-overlay'

    const currentKey = state.get('apiKey')
    const currentModel = state.get('model')
    const currentTheme = state.get('theme')

    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="settings-title">
      <h2 class="modal-title" id="settings-title">Settings</h2>

      <div class="form-group">
        <label class="form-label" for="settings-apikey">Gemini API Key</label>
        <div class="form-input-wrap">
          <input
            class="form-input"
            id="settings-apikey"
            type="password"
            value="${escapeHtml(currentKey)}"
            placeholder="AIza…"
            spellcheck="false"
            autocomplete="off"
          />
          <button class="show-hide-btn" id="toggle-key-vis" title="Show/hide key">👁</button>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:6px">
          Get yours at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-bright)">aistudio.google.com</a>
        </p>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-model">Model</label>
        <select class="form-select" id="settings-model">
          <option value="gemini-2.5-pro-preview-05-06"  ${currentModel === 'gemini-2.5-pro-preview-05-06' ? 'selected' : ''}>Gemini 2.5 Pro (Preview)</option>
          <option value="gemini-2.0-flash"              ${currentModel === 'gemini-2.0-flash' ? 'selected' : ''}>Gemini 2.0 Flash</option>
          <option value="gemini-2.0-flash-thinking-exp" ${currentModel === 'gemini-2.0-flash-thinking-exp' ? 'selected' : ''}>Gemini 2.0 Flash Thinking</option>
          <option value="gemini-1.5-pro"                ${currentModel === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
          <option value="gemini-1.5-flash"              ${currentModel === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="settings-theme">Editor Theme</label>
        <select class="form-select" id="settings-theme">
          <option value="vs-dark"  ${currentTheme === 'vs-dark' ? 'selected' : ''}>Dark (vs-dark)</option>
          <option value="vs"       ${currentTheme === 'vs' ? 'selected' : ''}>Light (vs)</option>
          <option value="hc-black" ${currentTheme === 'hc-black' ? 'selected' : ''}>High Contrast</option>
        </select>
      </div>

      <div class="modal-footer">
        <button class="btn" id="settings-cancel">Cancel</button>
        <button class="btn btn-run" id="settings-save">Save</button>
      </div>
    </div>
  `

    document.body.appendChild(overlay)

    // Show/hide key toggle
    const keyInput = overlay.querySelector('#settings-apikey')
    const toggleBtn = overlay.querySelector('#toggle-key-vis')
    toggleBtn.addEventListener('click', () => {
        const isHidden = keyInput.type === 'password'
        keyInput.type = isHidden ? 'text' : 'password'
        toggleBtn.textContent = isHidden ? '🙈' : '👁'
    })

    // Save
    overlay.querySelector('#settings-save').addEventListener('click', () => {
        state.set('apiKey', overlay.querySelector('#settings-apikey').value.trim())
        state.set('model', overlay.querySelector('#settings-model').value)
        state.set('theme', overlay.querySelector('#settings-theme').value)
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