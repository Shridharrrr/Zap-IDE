// ─── Reactive Vanilla Store ───────────────────────────────────
// Simple pub/sub with localStorage persistence for key settings

const STORAGE_KEYS = {
    apiKey: 'ag_key',
    model: 'ag_model',
    theme: 'ag_theme',
    githubUsername: 'ag_gh_user',
    githubToken: 'ag_gh_token',
}

const state = {
    apiKey: localStorage.getItem('ag_key') || '',
    model: localStorage.getItem('ag_model') || 'qwen2.5:3b',
    theme: localStorage.getItem('ag_theme') || 'vs-dark',
    githubUsername: localStorage.getItem('ag_gh_user') || '',
    githubToken: localStorage.getItem('ag_gh_token') || '',
    filename: 'main.js',
    files: {},         // Map of filename -> content for folder view
    currentFile: null, // Currently selected file path
    folderName: null,  // Name of imported folder
    folderExpanded: {}, // Track expanded/collapsed state of folders
    chatHistory: [],   // [{ role: 'user'|'assistant', content, timestamp, extractedCode? }]
    isRunning: false,
    isStreaming: false,
}

const subscribers = {}  // { key: [fn, ...] }

export function get(key) {
    return state[key]
}

export function set(key, val) {
    state[key] = val
    if (STORAGE_KEYS[key]) {
        localStorage.setItem(STORAGE_KEYS[key], val)
    }
    if (subscribers[key]) {
        subscribers[key].forEach(fn => fn(val))
    }
}

export function subscribe(key, fn) {
    if (!subscribers[key]) subscribers[key] = []
    subscribers[key].push(fn)
    return () => {
        subscribers[key] = subscribers[key].filter(f => f !== fn)
    }
}

export function pushChat(message) {
    state.chatHistory.push(message)
    if (subscribers['chatHistory']) {
        subscribers['chatHistory'].forEach(fn => fn(state.chatHistory))
    }
}

export function updateLastChat(update) {
    const last = state.chatHistory[state.chatHistory.length - 1]
    if (last) {
        Object.assign(last, update)
        if (subscribers['chatHistory']) {
            subscribers['chatHistory'].forEach(fn => fn(state.chatHistory))
        }
    }
}

export function getAll() {
    return { ...state }
}