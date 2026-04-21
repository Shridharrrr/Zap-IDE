// ─── File Tree Sidebar Component ──────────────────────────────
// Displays folder structure and handles file navigation

import * as state from '../store/state.js'

let fileTreeAPI = null

const FILE_ICONS = {
    js: '📜', javascript: '📜',
    ts: '📘', typescript: '📘',
    py: '🐍', python: '🐍',
    json: '📋',
    html: '🌐', htm: '🌐',
    css: '🎨',
    md: '📝', markdown: '📝',
    folder: '📁',
    folderOpen: '📂',
    default: '📄'
}

function getFileIcon(filename) {
    if (!filename) return FILE_ICONS.default
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    return FILE_ICONS[ext] || FILE_ICONS.default
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
            <div class="form-group">
                <label class="form-label">Template (optional)</label>
                <select id="file-template" class="form-select">
                    <option value="">Empty file</option>
                    <option value="js">JavaScript (.js)</option>
                    <option value="jsx">React Component (.jsx)</option>
                    <option value="ts">TypeScript (.ts)</option>
                    <option value="tsx">React TS (.tsx)</option>
                    <option value="py">Python (.py)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="css">CSS (.css)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="md">Markdown (.md)</option>
                </select>
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancel-create">Cancel</button>
                <button class="btn btn-run" id="confirm-create">Create</button>
            </div>
        </div>
    `
    document.body.appendChild(overlay)

    const filenameInput = overlay.querySelector('#new-filename')
    const templateSelect = overlay.querySelector('#file-template')
    filenameInput?.focus()

    overlay.querySelector('#cancel-create').addEventListener('click', () => overlay.remove())
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
    
    const createHandler = () => {
        let filename = filenameInput.value.trim()
        if (!filename) {
            filenameInput.style.borderColor = 'var(--error)'
            return
        }

        // Auto-add extension from template if not provided
        const template = templateSelect.value
        if (template && !filename.includes('.')) {
            filename += '.' + template
        }

        const templates = {
            'js': `// ${filename}\n\nconsole.log('Hello from ${filename}');\n`,
            'jsx': `// ${filename}\nimport React from 'react';\n\nexport default function App() {\n  return (\n    <div>\n      <h1>Hello from ${filename}</h1>\n    </div>\n  );\n}\n`,
            'ts': `// ${filename}\n\nconst greeting: string = 'Hello from ${filename}';\nconsole.log(greeting);\n`,
            'tsx': `// ${filename}\nimport React from 'react';\n\ninterface Props {\n  name?: string;\n}\n\nexport default function App({ name = 'World' }: Props) {\n  return (\n    <div>\n      <h1>Hello, {name}!</h1>\n    </div>\n  );\n}\n`,
            'py': `# ${filename}\n\nprint('Hello from ${filename}')\n`,
            'html': `<!DOCTYPE html>\n<html>\n<head>\n  <title>${filename}</title>\n</head>\n<body>\n  <h1>Hello from ${filename}</h1>\n</body>\n</html>\n`,
            'css': `/* ${filename} */\n\nbody {\n  font-family: system-ui, sans-serif;\n}\n`,
            'json': `{\n  "name": "${filename.replace('.json', '')}",\n  "version": "1.0.0"\n}\n`,
            'md': `# ${filename}\n\nWrite your documentation here.\n`
        }

        const ext = filename.split('.').pop()
        const content = templates[ext] || ''

        try {
            fileTreeAPI.createFile(filename, content)
            overlay.remove()
            // Trigger file select callback
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
                <span class="file-icon">${icon}</span>
                <span class="file-name">${escapeHtml(node.name)}</span>
            </div>
        `
    }

    const folderPath = path ? `${path}/${node.name}` : node.name
    const isExpanded = state.get(`folderExpanded:${folderPath}`) ?? true
    const folderIcon = isExpanded ? FILE_ICONS.folderOpen : FILE_ICONS.folder

    let html = ''
    if (level > 0) {
        html += `
            <div class="file-tree-folder ${isExpanded ? 'expanded' : 'collapsed'}" data-path="${folderPath}" style="padding-left: ${(level - 1) * 12}px">
                <span class="folder-toggle">${isExpanded ? '▼' : '▶'}</span>
                <span class="folder-icon">${folderIcon}</span>
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
