// ─── URL Share (LZ-String) ────────────────────────────────────
import LZString from 'lz-string'

// Back-compat: single-file share payload.
export function encode(code, filename) {
    const payload = JSON.stringify({ code, filename })
    const compressed = LZString.compressToEncodedURIComponent(payload)
    return '#s=' + compressed
}

// Multi-file share payload (preferred).
export function encodeProject(files, entryFile) {
    const payload = JSON.stringify({ files, entryFile })
    const compressed = LZString.compressToEncodedURIComponent(payload)
    return '#s=' + compressed
}

export function decode() {
    const hash = window.location.hash
    if (!hash.startsWith('#s=')) return null

    try {
        const compressed = hash.slice(3)
        const decompressed = LZString.decompressFromEncodedURIComponent(compressed)
        if (!decompressed) return null
        const parsed = JSON.parse(decompressed)

        // Normalize for back-compat consumers.
        if (parsed && parsed.files && typeof parsed.files === 'object') {
            return {
                files: parsed.files,
                entryFile: parsed.entryFile || null,
            }
        }

        return parsed
    } catch {
        return null
    }
}

export function getShareURL(code, filename) {
    const fragment = encode(code, filename)
    return window.location.origin + window.location.pathname + fragment
}

export function getProjectShareURL(files, entryFile) {
    const fragment = encodeProject(files, entryFile)
    return window.location.origin + window.location.pathname + fragment
}

// Returns compressed byte size estimate
export function getPayloadSize(code, filename) {
    const payload = JSON.stringify({ code, filename })
    const compressed = LZString.compressToEncodedURIComponent(payload)
    return compressed.length
}

export function getProjectPayloadSize(files, entryFile) {
    const payload = JSON.stringify({ files, entryFile })
    const compressed = LZString.compressToEncodedURIComponent(payload)
    return compressed.length
}

export function clearHash() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
}