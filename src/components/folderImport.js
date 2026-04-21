// ─── Folder Import Functionality ──────────────────────────────
// Uses File System Access API to import folders

export async function importFolder() {
    try {
        // Check if File System Access API is supported
        if (!('showDirectoryPicker' in window)) {
            // Fallback to file input for older browsers
            return importFolderFallback()
        }

        const dirHandle = await window.showDirectoryPicker()
        const files = {}

        await processDirectory(dirHandle, '', files)

        return {
            name: dirHandle.name,
            files,
            rootHandle: dirHandle // Keep reference for future reads
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            return null // User cancelled
        }
        throw new Error(`Failed to import folder: ${err.message}`)
    }
}

async function processDirectory(dirHandle, path, files) {
    for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name

        if (entry.kind === 'directory') {
            // Recursively process subdirectory
            const subDirHandle = await dirHandle.getDirectoryHandle(entry.name)
            await processDirectory(subDirHandle, entryPath, files)
        } else if (entry.kind === 'file') {
            // Read file content
            const fileHandle = await dirHandle.getFileHandle(entry.name)
            const file = await fileHandle.getFile()
            const content = await file.text()
            files[entryPath] = content
        }
    }
}

function importFolderFallback() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.directory = true
        input.multiple = true

        input.addEventListener('change', async (e) => {
            const fileList = e.target.files
            if (!fileList || fileList.length === 0) {
                resolve(null)
                return
            }

            const files = {}
            const rootName = fileList[0].webkitRelativePath.split('/')[0]

            for (const file of fileList) {
                // Remove the root folder name from the path
                const relativePath = file.webkitRelativePath.replace(`${rootName}/`, '')
                const content = await file.text()
                files[relativePath] = content
            }

            resolve({
                name: rootName,
                files,
                rootHandle: null
            })
        })

        input.addEventListener('cancel', () => resolve(null))
        input.click()
    })
}

// Get a single file using File System Access API
export async function importSingleFile() {
    try {
        if (!('showOpenFilePicker' in window)) {
            return importSingleFileFallback()
        }

        const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: [
                {
                    description: 'Code Files',
                    accept: {
                        'text/javascript': ['.js', '.mjs', '.cjs'],
                        'text/typescript': ['.ts'],
                        'text/python': ['.py'],
                        'text/html': ['.html', '.htm'],
                        'text/css': ['.css'],
                        'application/json': ['.json'],
                        'text/markdown': ['.md'],
                        'text/plain': ['.txt']
                    }
                }
            ]
        })

        const file = await fileHandle.getFile()
        const content = await file.text()

        return {
            name: file.name,
            content,
            handle: fileHandle
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            return null
        }
        throw new Error(`Failed to import file: ${err.message}`)
    }
}

function importSingleFileFallback() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.js,.mjs,.cjs,.ts,.py,.html,.htm,.css,.json,.md,.txt'

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0]
            if (!file) {
                resolve(null)
                return
            }

            const content = await file.text()
            resolve({
                name: file.name,
                content,
                handle: null
            })
        })

        input.addEventListener('cancel', () => resolve(null))
        input.click()
    })
}
