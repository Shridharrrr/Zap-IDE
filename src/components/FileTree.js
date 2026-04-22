// ─── File Tree Sidebar Component ──────────────────────────────
// Displays folder structure and handles file navigation

import * as state from '../store/state.js'

let fileTreeAPI = null

// ── SVG file icons (VS Code–style, colored) ───────────────────
const SVG_ICONS = {
  js: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f0db4f" fill-opacity="0.15"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#f0db4f">JS</text></svg>`,
  mjs: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f0db4f" fill-opacity="0.15"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#f0db4f">JS</text></svg>`,
  jsx: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#61dafb" fill-opacity="0.15"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#61dafb">JSX</text></svg>`,
  ts: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#3178c6" fill-opacity="0.2"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#3b82f6">TS</text></svg>`,
  tsx: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#61dafb" fill-opacity="0.12"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#61dafb">TSX</text></svg>`,
  py: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#3572a5" fill-opacity="0.18"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#60a5fa">PY</text></svg>`,
  json: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f59e0b" fill-opacity="0.12"/><text x="1" y="12" font-size="7.5" font-family="monospace" font-weight="bold" fill="#f59e0b">JSON</text></svg>`,
  html: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#e34c26" fill-opacity="0.15"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#f97316">HTML</text></svg>`,
  htm: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#e34c26" fill-opacity="0.15"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#f97316">HTML</text></svg>`,
  css: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#264de4" fill-opacity="0.15"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#818cf8">CSS</text></svg>`,
  scss: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#c6538c" fill-opacity="0.15"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#f472b6">SCSS</text></svg>`,
  md: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#a3a3a3" fill-opacity="0.12"/><text x="2" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#a1a1aa">MD</text></svg>`,
  mdx: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#a3a3a3" fill-opacity="0.12"/><text x="1" y="12" font-size="7.5" font-family="monospace" font-weight="bold" fill="#a1a1aa">MDX</text></svg>`,
  svg: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f97316" fill-opacity="0.12"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#f97316">SVG</text></svg>`,
  png: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#10b981" fill-opacity="0.12"/><path d="M3 11 L6 7 L9 10 L11 8 L13 11Z" fill="#10b981" fill-opacity="0.5"/><circle cx="5.5" cy="5.5" r="1.5" fill="#10b981" fill-opacity="0.7"/></svg>`,
  jpg: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#10b981" fill-opacity="0.12"/><path d="M3 11 L6 7 L9 10 L11 8 L13 11Z" fill="#10b981" fill-opacity="0.5"/><circle cx="5.5" cy="5.5" r="1.5" fill="#10b981" fill-opacity="0.7"/></svg>`,
  webp: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#10b981" fill-opacity="0.12"/><path d="M3 11 L6 7 L9 10 L11 8 L13 11Z" fill="#10b981" fill-opacity="0.5"/><circle cx="5.5" cy="5.5" r="1.5" fill="#10b981" fill-opacity="0.7"/></svg>`,
  sh: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#4ade80" fill-opacity="0.12"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#4ade80">SH</text></svg>`,
  env: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#facc15" fill-opacity="0.12"/><text x="1" y="12" font-size="7.5" font-family="monospace" font-weight="bold" fill="#facc15">ENV</text></svg>`,
  toml: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f87171" fill-opacity="0.12"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#f87171">TOML</text></svg>`,
  yaml: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#a78bfa" fill-opacity="0.12"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#a78bfa">YAML</text></svg>`,
  yml: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#a78bfa" fill-opacity="0.12"/><text x="1" y="12" font-size="7" font-family="monospace" font-weight="bold" fill="#a78bfa">YML</text></svg>`,
  rs: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#f97316" fill-opacity="0.15"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#fb923c">RS</text></svg>`,
  go: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#00add8" fill-opacity="0.15"/><text x="2" y="12" font-size="9" font-family="monospace" font-weight="bold" fill="#22d3ee">GO</text></svg>`,
  lua: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#5b6ee1" fill-opacity="0.15"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#818cf8">LUA</text></svg>`,
  vue: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" rx="2" fill="#42b883" fill-opacity="0.15"/><text x="1" y="12" font-size="8" font-family="monospace" font-weight="bold" fill="#4ade80">VUE</text></svg>`,
  // generic
  default: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#52525b" stroke-width="1.2"/><path d="M10 2v3h3" stroke="#52525b" stroke-width="1.2"/></svg>`,
  folder: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4a1 1 0 011-1h4l2 2h6a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="#a78bfa" fill-opacity="0.25" stroke="#a78bfa" stroke-width="1"/></svg>`,
  folderOpen: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4a1 1 0 011-1h4l2 2h6a1 1 0 011 1v1H1V4z" fill="#a78bfa" fill-opacity="0.3" stroke="#a78bfa" stroke-width="1"/><path d="M1 7h14l-1.5 6H2.5L1 7z" fill="#a78bfa" fill-opacity="0.2" stroke="#a78bfa" stroke-width="1"/></svg>`,
}

function getFileIcon(filename) {
    if (!filename) return SVG_ICONS.default
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return SVG_ICONS[ext] || SVG_ICONS.default
}

export function initFileTree({ onFileSelect, onImportFolder }) {
    const el = document.getElementById('file-tree')
    if (!el) {
        // Create file tree container if it doesn't exist
        const container = document.createElement('aside')
        container.id = 'file-tree-sidebar'
        container.innerHTML = `
            <div class="file-tree-header">
                <span class="file-tree-title">📁 Explorer</span>
                <button class="file-tree-import-btn" id="btn-import-folder" title="Import Folder">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1v6h6v-1h-5V1H8z"/>
                        <path d="M2 3v11h12V5H8.5l-2-2H2zm11 10H3V4h3.5l2 2H13v7z"/>
                    </svg>
                </button>
            </div>
            <div id="file-tree" class="file-tree"></div>
        `
        document.body.appendChild(container)
    }

    const treeEl = document.getElementById('file-tree')
    const importBtn = document.getElementById('btn-import-folder')

    // Subscribe to file structure changes
    state.subscribe('files', (files) => {
        renderFileTree(files, treeEl, onFileSelect)
    })

    state.subscribe('currentFile', (currentFile) => {
        highlightCurrentFile(currentFile)
    })

    importBtn?.addEventListener('click', () => {
        onImportFolder?.()
    })

    fileTreeAPI = {
        refresh() {
            const files = state.get('files')
            renderFileTree(files, treeEl, onFileSelect)
        },
        setCurrentFile(filename) {
            state.set('currentFile', filename)
        },
        createFile(filename, content = '') {
            const files = state.get('files') || {}
            if (files[filename]) {
                throw new Error(`File "${filename}" already exists`)
            }
            files[filename] = content
            state.set('files', files)
            state.set('currentFile', filename)
            this.refresh()
            return filename
        },
        saveFile(filename, content) {
            const files = state.get('files') || {}
            files[filename] = content
            state.set('files', files)
        },
        deleteFile(filename) {
            const files = state.get('files') || {}
            delete files[filename]
            state.set('files', files)
            if (state.get('currentFile') === filename) {
                const remaining = Object.keys(files)
                state.set('currentFile', remaining[0] || null)
            }
            this.refresh()
        }
    }

    // Add new file button handler
    const createFileBtn = document.getElementById('btn-create-file')
    createFileBtn?.addEventListener('click', () => {
        showCreateFileDialog(fileTreeAPI)
    })

    // Initial render
    fileTreeAPI.refresh()

    return fileTreeAPI
}

function showCreateFileDialog(fileTreeAPI) {
    const existing = document.getElementById('create-file-modal')
    if (existing) existing.remove()

    const overlay = document.createElement('div')
    overlay.id = 'create-file-modal'
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
        <div class="modal" style="width: 360px">
            <h3 class="modal-title">Create New File</h3>
            <div class="form-group">
                <label class="form-label">Filename</label>
                <input type="text" id="new-filename" class="form-input" placeholder="example.js" 
                    style="font-family: var(--font-mono)" autocomplete="off">
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancel-create">Cancel</button>
                <button class="btn btn-run" id="confirm-create">Create</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)

    const filenameInput = overlay.querySelector('#new-filename')
    filenameInput?.focus()

    overlay.querySelector('#cancel-create').addEventListener('click', () => overlay.remove())
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
    
    const createHandler = () => {
        const filename = filenameInput.value.trim()
        if (!filename) {
            filenameInput.style.borderColor = 'var(--error)'
            return
        }

        try {
            fileTreeAPI.createFile(filename, '')
            overlay.remove()
            const onFileSelect = fileTreeAPI._onFileSelect
            if (onFileSelect) onFileSelect(filename)
        } catch (err) {
            filenameInput.style.borderColor = 'var(--error)'
            filenameInput.placeholder = err.message
        }
    }

    overlay.querySelector('#confirm-create').addEventListener('click', createHandler)
    filenameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') createHandler()
        if (e.key === 'Escape') overlay.remove()
    })
}

function renderFileTree(files, container, onFileSelect) {
    if (!files || Object.keys(files).length === 0) {
        container.innerHTML = `
            <div class="file-tree-empty">
                <p>No files imported</p>
                <button class="btn btn-sm" id="empty-import-btn">Import Folder</button>
            </div>
        `
        document.getElementById('empty-import-btn')?.addEventListener('click', () => {
            document.getElementById('btn-import-folder')?.click()
        })
        return
    }

    // Build tree structure
    const tree = buildTreeStructure(files)
    container.innerHTML = renderTreeNode(tree, '', onFileSelect)

    // Add click handlers
    container.querySelectorAll('.file-tree-file').forEach(el => {
        el.addEventListener('click', () => {
            const path = el.dataset.path
            onFileSelect?.(path)
            state.set('currentFile', path)
        })
    })

    // Add folder toggle handlers
    container.querySelectorAll('.file-tree-folder').forEach(el => {
        el.addEventListener('click', () => {
            const path = el.dataset.path
            toggleFolder(path, el)
        })
    })

    // Add delete handlers
    container.querySelectorAll('.delete-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation() // Prevent file select
            const path = btn.dataset.path
            if (confirm(`Are you sure you want to delete ${path.split('/').pop()}?`)) {
                if (fileTreeAPI) fileTreeAPI.deleteFile(path)
            }
        })
    })
}

function buildTreeStructure(files) {
    const root = { name: 'root', type: 'folder', children: {}, files: {} }

    for (const [path, content] of Object.entries(files)) {
        const parts = path.split('/')
        let current = root

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (i === parts.length - 1) {
                // File
                current.files[part] = { name: part, type: 'file', path, content }
            } else {
                // Folder
                if (!current.children[part]) {
                    current.children[part] = { name: part, type: 'folder', children: {}, files: {} }
                }
                current = current.children[part]
            }
        }
    }

    return root
}

function renderTreeNode(node, path, onFileSelect, level = 0) {
    if (node.type === 'file') {
        const icon = getFileIcon(node.name)
        return `
            <div class="file-tree-file" data-path="${node.path}" style="padding-left: ${level * 12}px">
                <span class="file-icon" style="width:16px;height:16px;display:inline-flex;align-items:center;flex-shrink:0">${icon}</span>
                <span class="file-name" style="flex: 1;">${escapeHtml(node.name)}</span>
                <button class="icon-btn-sm delete-file-btn" data-path="${node.path}" title="Delete File" style="opacity:0; padding:2px; height:auto; width:auto; margin-left:auto;">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            </div>
        `
    }

    const folderPath = path ? `${path}/${node.name}` : node.name
    const isExpanded = state.get(`folderExpanded:${folderPath}`) ?? true
    const folderIcon = isExpanded ? SVG_ICONS.folderOpen : SVG_ICONS.folder
    const chevron = isExpanded
        ? `<svg viewBox="0 0 16 16" fill="none" width="10" height="10"><polyline points="4,6 8,10 12,6" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg viewBox="0 0 16 16" fill="none" width="10" height="10"><polyline points="6,4 10,8 6,12" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`

    let html = ''
    if (level > 0) {
        html += `
            <div class="file-tree-folder ${isExpanded ? 'expanded' : 'collapsed'}" data-path="${folderPath}" style="padding-left: ${(level - 1) * 12}px">
                <span class="folder-toggle" style="display:inline-flex;align-items:center">${chevron}</span>
                <span class="folder-icon" style="width:16px;height:16px;display:inline-flex;align-items:center;flex-shrink:0">${folderIcon}</span>
                <span class="folder-name">${escapeHtml(node.name)}</span>
            </div>
        `
    }

    if (isExpanded || level === 0) {
        // Render children folders first (sorted)
        const sortedChildren = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name))
        for (const child of sortedChildren) {
            html += renderTreeNode(child, folderPath, onFileSelect, level + 1)
        }

        // Then render files (sorted)
        const sortedFiles = Object.values(node.files).sort((a, b) => a.name.localeCompare(b.name))
        for (const file of sortedFiles) {
            html += renderTreeNode(file, folderPath, onFileSelect, level + 1)
        }
    }

    return html
}

function toggleFolder(path, el) {
    const isExpanded = el.classList.contains('expanded')
    state.set(`folderExpanded:${path}`, !isExpanded)

    // Find the file tree API and refresh
    fileTreeAPI?.refresh()
}

function highlightCurrentFile(currentFile) {
    document.querySelectorAll('.file-tree-file').forEach(el => {
        el.classList.toggle('active', el.dataset.path === currentFile)
    })
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function getFileTreeAPI() {
    return fileTreeAPI
}
