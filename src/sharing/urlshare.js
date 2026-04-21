// ─── URL Share (LZ-String) ────────────────────────────────────
import LZString from 'lz-string'

export function encode(code, filename) {
    const payload = JSON.stringify({ code, filename })
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
        return JSON.parse(decompressed)
    } catch {
        return null
    }
}

export function getShareURL(code, filename) {
    const fragment = encode(code, filename)
    return window.location.origin + window.location.pathname + fragment
}

// Returns compressed byte size estimate
export function getPayloadSize(code, filename) {
    const payload = JSON.stringify({ code, filename })
    const compressed = LZString.compressToEncodedURIComponent(payload)
    return compressed.length
}

export function clearHash() {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
}