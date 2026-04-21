// ─── Sandbox Bridge ───────────────────────────────────────────
// Main-thread side: creates & manages the Web Worker and Python runtime

import { runPython, isPyodideLoaded } from './python-runtime.js'

let workerRef = null
let timeoutHandle = null
const MAX_RUNTIME_MS = 30_000  // 30 seconds

export function detectLanguage(filename) {
    if (!filename) return 'javascript'
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    if (ext === 'py') return 'python'
    if (['js', 'mjs', 'cjs', 'ts'].includes(ext)) return 'javascript'
    return 'javascript'
}

export function runCode(code, { onStdout, onStderr, onWarn, onDone, language = 'javascript', filename }) {
    language = language || detectLanguage(filename)
    if (language === 'python') {
        return runPythonCode(code, { onStdout, onStderr, onWarn, onDone })
    }
    return runJavaScript(code, { onStdout, onStderr, onWarn, onDone })
}

function runPythonCode(code, { onStdout, onStderr, onWarn, onDone }) {
    return new Promise(async (resolve) => {
        if (!isPyodideLoaded()) {
            onStdout?.('Loading Python runtime (Pyodide)... This may take a moment on first run.\n')
        }
        
        // Safety timeout for Python
        timeoutHandle = setTimeout(() => {
            onStderr?.('⚠ Python execution timed out after 30 seconds')
            onDone?.({ error: true })
            resolve({ error: true, timedOut: true })
        }, MAX_RUNTIME_MS)

        const result = await runPython(code, {
            onStdout: (text) => {
                clearTimeout(timeoutHandle)
                onStdout?.(text)
            },
            onStderr: (text) => {
                clearTimeout(timeoutHandle)
                onStderr?.(text)
            },
            onWarn,
            onDone: ({ error }) => {
                clearTimeout(timeoutHandle)
                onDone?.({ error })
                resolve({ error })
            }
        })

        clearTimeout(timeoutHandle)
        return result
    })
}

function runJavaScript(code, { onStdout, onStderr, onWarn, onDone }) {
    return new Promise((resolve, reject) => {
        // Kill any running worker first
        killWorker()

        // Create fresh worker (no stale state)
        workerRef = new Worker(
            new URL('./worker.js', import.meta.url),
            { type: 'module' }
        )

        // Safety timeout
        timeoutHandle = setTimeout(() => {
            killWorker()
            onStderr?.('⚠ Execution timed out after 30 seconds')
            onDone?.({ error: true })
            resolve({ error: true, timedOut: true })
        }, MAX_RUNTIME_MS)

        workerRef.onmessage = ({ data }) => {
            switch (data.type) {
                case 'stdout':
                    onStdout?.(data.text)
                    break
                case 'stderr':
                    onStderr?.(data.text)
                    break
                case 'warn':
                    onWarn?.(data.text)
                    break
                case 'done':
                    clearTimeout(timeoutHandle)
                    workerRef?.terminate()
                    workerRef = null
                    onDone?.({ error: data.error })
                    resolve({ error: data.error })
                    break
            }
        }

        workerRef.onerror = (e) => {
            clearTimeout(timeoutHandle)
            onStderr?.(`Worker error: ${e.message}`)
            onDone?.({ error: true })
            killWorker()
            resolve({ error: true })
        }

        // Send code to worker
        workerRef.postMessage({ type: 'run', code })
    })
}

export function killWorker() {
    if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        timeoutHandle = null
    }
    if (workerRef) {
        workerRef.terminate()
        workerRef = null
    }
}

export function isRunning() {
    return workerRef !== null
}