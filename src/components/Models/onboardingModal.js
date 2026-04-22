// ─── Onboarding Wizard ──────────────────────────────────────────
import * as state from '../../store/state.js'

/* ─── SVG Icons ──────────────────────────────────────────────── */
const ICONS = {
  gemini: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L8 8H4l4 4-1.5 5.5L12 14l5.5 3.5L16 12l4-4h-4z"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
  </svg>`,
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <rect x="8" y="8" width="8" height="8" rx="1"/>
    <path d="M9 4V2M12 4V2M15 4V2M9 22v-2M12 22v-2M15 22v-2M4 9H2M4 12H2M4 15H2M22 9h-2M22 12h-2M22 15h-2"/>
  </svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>`,
  key: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="7.5" cy="15.5" r="3.5"/>
    <path d="M10.5 12l8-8M16 6l2 2"/>
  </svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="currentColor">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>`,
  server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2"/>
    <rect x="2" y="14" width="20" height="8" rx="2"/>
    <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/>
    <circle cx="6" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>`,
}

/* ─── Styles (injected once) ─────────────────────────────────── */
function injectStyles() {
  if (document.getElementById('ob-styles')) return
  const s = document.createElement('style')
  s.id = 'ob-styles'
  s.textContent = `
    /* ── Overlay ── */
    #onboarding-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 9000;
      animation: ob-fade-in 0.2s ease;
    }
    @keyframes ob-fade-in { from { opacity:0 } to { opacity:1 } }

    /* ── Modal shell ── */
    .ob-modal {
      background: #0c0c0e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 36px;
      width: 540px;
      max-width: calc(100vw - 32px);
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04);
      position: relative;
    }

    /* ── Step transitions ── */
    .ob-step {
      animation: ob-step-in 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes ob-step-in {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Logo / header ── */
    .ob-logo {
      display: flex; align-items: center; justify-content: center;
      gap: 10px; margin-bottom: 28px;
    }
    .ob-logo-icon {
      width: 36px; height: 36px;
      background: #fff; color: #000;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .ob-logo-icon svg { width: 20px; height: 20px; }
    .ob-logo-name {
      font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: #fafafa;
    }
    .ob-logo-name span { color: rgba(255,255,255,0.4); }

    .ob-heading {
      text-align: center; font-size: 15px; font-weight: 600;
      color: #fafafa; margin-bottom: 6px;
    }
    .ob-sub {
      text-align: center; font-size: 12px; color: var(--text-2, #a1a1aa);
      margin-bottom: 28px; line-height: 1.6;
    }

    /* ── Cards ── */
    .ob-cards {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
      margin-bottom: 28px;
    }
    .ob-card {
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 18px 12px;
      cursor: pointer; text-align: center;
      background: rgba(255,255,255,0.02);
      transition: border-color 0.15s, background 0.15s, transform 0.15s, box-shadow 0.15s;
      user-select: none;
    }
    .ob-card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.15);
      transform: translateY(-2px);
    }
    .ob-card.selected {
      border-color: rgba(255,255,255,0.6);
      background: rgba(255,255,255,0.06);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 8px 24px rgba(0,0,0,0.4);
    }
    .ob-card-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
      background: rgba(255,255,255,0.07);
      color: #ededed;
      transition: background 0.15s;
    }
    .ob-card.selected .ob-card-icon {
      background: rgba(255,255,255,0.15);
    }
    .ob-card-icon svg { width: 20px; height: 20px; }
    .ob-card h3 {
      font-size: 12px; font-weight: 600; color: #fafafa;
      margin: 0 0 5px; line-height: 1.3;
    }
    .ob-card p {
      font-size: 10px; color: var(--text-2, #a1a1aa); margin: 0; line-height: 1.5;
    }

    /* ── Progress dots ── */
    .ob-progress {
      display: flex; justify-content: center; gap: 6px; margin-bottom: 24px;
    }
    .ob-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.15);
      transition: background 0.2s, width 0.2s;
    }
    .ob-dot.active { background: #fff; width: 18px; border-radius: 4px; }

    /* ── Form elements ── */
    .ob-form-group { margin-bottom: 16px; }
    .ob-label {
      display: block; font-size: 11px; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--text-2, #a1a1aa); margin-bottom: 7px;
    }
    .ob-input-wrap { position: relative; display: flex; align-items: center; }
    .ob-input {
      width: 100%; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 9px 38px 9px 12px;
      font-family: var(--font-mono, monospace); font-size: 12px;
      color: #fafafa; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .ob-input::placeholder { color: rgba(255,255,255,0.25); }
    .ob-input:focus {
      border-color: rgba(255,255,255,0.25);
      box-shadow: 0 0 0 3px rgba(255,255,255,0.05);
    }
    .ob-select {
      width: 100%; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; padding: 9px 12px;
      font-family: var(--font-ui, sans-serif); font-size: 12px;
      color: #fafafa; outline: none; cursor: pointer;
      transition: border-color 0.15s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 32px;
    }
    .ob-select:focus { border-color: rgba(255,255,255,0.25); }
    .ob-select option { background: #18181b; color: #fafafa; }
    .ob-select optgroup { background: #09090b; color: #a1a1aa; }

    .ob-eye-btn {
      position: absolute; right: 10px;
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.3); padding: 4px;
      border-radius: 4px; display: flex; align-items: center;
      transition: color 0.15s;
    }
    .ob-eye-btn:hover { color: rgba(255,255,255,0.7); }
    .ob-eye-btn svg { width: 15px; height: 15px; pointer-events: none; }

    /* ── Info chip ── */
    .ob-info {
      display: flex; align-items: flex-start; gap: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px; padding: 10px 12px;
      font-size: 11px; color: var(--text-2, #a1a1aa);
      line-height: 1.5; margin-bottom: 20px;
    }
    .ob-info code {
      background: rgba(255,255,255,0.08); border-radius: 3px;
      padding: 1px 5px; font-size: 10px; font-family: var(--font-mono, monospace);
      color: #fafafa;
    }

    /* ── Footer ── */
    .ob-footer {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px; margin-top: 8px;
    }
    .ob-footer-right { display: flex; gap: 8px; align-items: center; }
    .ob-btn {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 8px; padding: 8px 16px;
      font-family: var(--font-ui, sans-serif);
      font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; outline: none;
      transition: background 0.15s, opacity 0.15s, transform 0.1s;
    }
    .ob-btn:active { transform: translateY(1px); }
    .ob-btn-ghost {
      background: rgba(255,255,255,0.06);
      color: var(--text-2, #a1a1aa);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .ob-btn-ghost:hover { background: rgba(255,255,255,0.1); color: #fafafa; }
    .ob-btn-primary {
      background: #fafafa; color: #000;
    }
    .ob-btn-primary:hover { background: #fff; box-shadow: 0 0 18px rgba(255,255,255,0.2); }
    .ob-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
    .ob-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
  `
  document.head.appendChild(s)
}

/* ─── Main export ────────────────────────────────────────────── */
export function openOnboardingModal() {
  const existing = document.getElementById('onboarding-modal-overlay')
  if (existing) existing.remove()

  injectStyles()

  const overlay = document.createElement('div')
  overlay.id = 'onboarding-modal-overlay'

  let selectedMode = null // 'cloud' | 'local' | 'none'

  /* ── Step 1: Choose engine ── */
  const renderStep1 = () => `
    <div class="ob-modal ob-step">
      <div class="ob-logo">
        <div class="ob-logo-icon">${ICONS.zap}</div>
        <div class="ob-logo-name">Zap<span>-IDE</span></div>
      </div>

      <div class="ob-progress">
        <div class="ob-dot active"></div>
        <div class="ob-dot"></div>
      </div>

      <div class="ob-heading">Choose your AI engine</div>
      <div class="ob-sub">Pick how you want the AI Copilot to power this IDE.</div>

      <div class="ob-cards">
        <div class="ob-card" id="card-cloud">
          <div class="ob-card-icon">${ICONS.gemini}</div>
          <h3>Gemini API</h3>
          <p>Bring your Google AI key. Best speed & performance.</p>
        </div>
        <div class="ob-card" id="card-local">
          <div class="ob-card-icon">${ICONS.cpu}</div>
          <h3>Local Ollama</h3>
          <p>Run models entirely on your own hardware.</p>
        </div>
        <div class="ob-card" id="card-none">
          <div class="ob-card-icon">${ICONS.code}</div>
          <h3>Just code</h3>
          <p>Skip AI and use Zap-IDE as a pure sandbox.</p>
        </div>
      </div>

      <div class="ob-footer">
        <span></span>
        <div class="ob-footer-right">
          <button class="ob-btn ob-btn-primary" id="btn-next" disabled>
            Continue ${ICONS.arrowLeft.replace('M19 12H5', 'M5 12h14').replace('12 19 5 12 12 5', '12 5 19 12 12 19')}
          </button>
        </div>
      </div>
    </div>
  `

  /* ── Step 2a: Gemini ── */
  const renderStep2Cloud = () => `
    <div class="ob-modal ob-step">
      <div class="ob-logo">
        <div class="ob-logo-icon">${ICONS.zap}</div>
        <div class="ob-logo-name">Zap<span>-IDE</span></div>
      </div>

      <div class="ob-progress">
        <div class="ob-dot"></div>
        <div class="ob-dot active"></div>
      </div>

      <div class="ob-heading">Configure Gemini AI</div>
      <div class="ob-sub">Your key is stored only in your browser's local storage.</div>

      <div class="ob-form-group">
        <label class="ob-label" for="ob-apikey">API Key</label>
        <div class="ob-input-wrap">
          <input class="ob-input" id="ob-apikey" type="password" placeholder="AIza…" autocomplete="off" spellcheck="false"/>
          <button class="ob-eye-btn" id="ob-toggle-key" type="button" aria-label="Show key">${ICONS.eye}</button>
        </div>
      </div>

      <div class="ob-form-group">
        <label class="ob-label" for="ob-model">Model</label>
        <select class="ob-select" id="ob-model">
          <option value="gemini-2.5-flash" selected>gemini-2.5-flash</option>
          <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
        </select>
      </div>

      <div class="ob-footer">
        <button class="ob-btn ob-btn-ghost" id="btn-back">${ICONS.arrowLeft} Back</button>
        <div class="ob-footer-right">
          <button class="ob-btn ob-btn-primary" id="btn-finish">${ICONS.check} Finish Setup</button>
        </div>
      </div>
    </div>
  `

  /* ── Step 2b: Ollama ── */
  const renderStep2Local = () => `
    <div class="ob-modal ob-step">
      <div class="ob-logo">
        <div class="ob-logo-icon">${ICONS.zap}</div>
        <div class="ob-logo-name">Zap<span>-IDE</span></div>
      </div>

      <div class="ob-progress">
        <div class="ob-dot"></div>
        <div class="ob-dot active"></div>
      </div>

      <div class="ob-heading">Configure Local Ollama</div>
      <div class="ob-sub">Ensure Ollama is running before continuing.</div>

      <div class="ob-form-group">
        <label class="ob-label" for="ob-model">Local Model</label>
        <select class="ob-select" id="ob-model">
          <option value="qwen2.5:3b" selected>qwen2.5:3b</option>
          <option value="qwen2.5:7b">qwen2.5:7b</option>
          <option value="llama3.1:8b">llama3.1:8b</option>
        </select>
      </div>

      <div class="ob-footer">
        <button class="ob-btn ob-btn-ghost" id="btn-back">${ICONS.arrowLeft} Back</button>
        <div class="ob-footer-right">
          <button class="ob-btn ob-btn-primary" id="btn-finish">${ICONS.check} Finish Setup</button>
        </div>
      </div>
    </div>
  `

  /* ── Render & bind ── */
  const renderDOM = (html) => {
    overlay.innerHTML = html
    if (!document.getElementById('onboarding-modal-overlay')) {
      document.body.appendChild(overlay)
    }

    // Step 1 — card selection
    const cards = ['card-cloud', 'card-local', 'card-none']
    if (overlay.querySelector('#card-cloud')) {
      cards.forEach(id => {
        const el = overlay.querySelector('#' + id)
        el.addEventListener('click', () => {
          cards.forEach(c => overlay.querySelector('#' + c).classList.remove('selected'))
          el.classList.add('selected')
          selectedMode = id.replace('card-', '')
          overlay.querySelector('#btn-next').disabled = false
        })
      })

      overlay.querySelector('#btn-next').addEventListener('click', () => {
        if (selectedMode === 'cloud') renderDOM(renderStep2Cloud())
        else if (selectedMode === 'local') renderDOM(renderStep2Local())
        else if (selectedMode === 'none') completeSetup('', undefined)
      })
    }

    // Step 2 Cloud
    if (overlay.querySelector('#ob-apikey')) {
      const keyInput = overlay.querySelector('#ob-apikey')
      const eyeBtn = overlay.querySelector('#ob-toggle-key')
      eyeBtn.addEventListener('click', () => {
        const show = keyInput.type === 'password'
        keyInput.type = show ? 'text' : 'password'
        eyeBtn.innerHTML = show ? ICONS.eyeOff : ICONS.eye
        eyeBtn.setAttribute('aria-label', show ? 'Hide key' : 'Show key')
      })
      overlay.querySelector('#btn-back').addEventListener('click', () => renderDOM(renderStep1()))
      overlay.querySelector('#btn-finish').addEventListener('click', () => {
        const key = keyInput.value.trim()
        const model = overlay.querySelector('#ob-model').value
        completeSetup(key, model)
      })
    }

    // Step 2 Local
    if (overlay.querySelector('#ob-model') && !overlay.querySelector('#ob-apikey')) {
      overlay.querySelector('#btn-back').addEventListener('click', () => renderDOM(renderStep1()))
      overlay.querySelector('#btn-finish').addEventListener('click', () => {
        const model = overlay.querySelector('#ob-model').value
        completeSetup('', model)
      })
    }
  }

  function completeSetup(apiKey, modelName) {
    state.set('apiKey', apiKey)
    state.set('model', modelName || 'none')
    localStorage.setItem('zap_setup_complete', 'true')
    overlay.style.animation = 'ob-fade-out 0.18s ease forwards'
    setTimeout(() => overlay.remove(), 180)
  }

  // Inject fade-out keyframe
  if (!document.getElementById('ob-fadeout-style')) {
    const s = document.createElement('style')
    s.id = 'ob-fadeout-style'
    s.textContent = `@keyframes ob-fade-out { to { opacity:0; } }`
    document.head.appendChild(s)
  }

  document.body.appendChild(overlay)
  renderDOM(renderStep1())
}
