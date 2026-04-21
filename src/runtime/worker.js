// ─── AlmostNode Web Worker ────────────────────────────────────
// Runs inside a Vite Web Worker (type: 'module')
// Uses Function-sandbox executor with Node.js polyfills

// ─── Fallback: Function sandbox with mocked Node env ─────────
function createSandboxExecutor(onStdout, onStderr) {
    const fakeProcess = {
        stdout: {
            write(msg) { onStdout(String(msg)) }
        },
        stderr: {
            write(msg) { onStderr(String(msg)) }
        },
        argv: ['node', 'script.js'],
        env: {},
        exit: () => { },
        version: 'v18.0.0-sandbox',
        platform: 'browser',
    }

    const fakeRequire = (mod) => {
        const mocks = {
            'path': {
                join: (...args) => args.join('/'),
                resolve: (...args) => args.join('/'),
                dirname: (p) => p.split('/').slice(0, -1).join('/'),
                basename: (p) => p.split('/').pop(),
                extname: (p) => { const b = p.split('/').pop(); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : '' },
            },
            'os': {
                platform: () => 'browser',
                homedir: () => '/home/user',
                tmpdir: () => '/tmp',
                cpus: () => [{ model: 'Browser CPU', speed: 2400 }],
            },
            'util': {
                promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (e, r) => e ? rej(e) : res(r))),
                inspect: (obj) => JSON.stringify(obj, null, 2),
                format: (msg, ...args) => args.reduce((s, a) => s.replace('%s', a).replace('%d', a), msg),
            },
            'events': {
                EventEmitter: class {
                    constructor() { this._events = {} }
                    on(ev, fn) { (this._events[ev] = this._events[ev] || []).push(fn); return this }
                    off(ev, fn) { this._events[ev] = (this._events[ev] || []).filter(f => f !== fn); return this }
                    emit(ev, ...args) { (this._events[ev] || []).forEach(fn => fn(...args)); return this }
                    once(ev, fn) { const wrap = (...a) => { this.off(ev, wrap); fn(...a) }; return this.on(ev, wrap) }
                }
            },
            'assert': {
                ok: (v, msg) => { if (!v) throw new Error(msg || 'Assertion failed') },
                equal: (a, b, msg) => { if (a != b) throw new Error(msg || `${a} != ${b}`) },
                strictEqual: (a, b, msg) => { if (a !== b) throw new Error(msg || `${a} !== ${b}`) },
                deepEqual: (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(msg || 'Deep equal failed') },
                throws: (fn, msg) => { try { fn(); throw new Error(msg || 'Expected throw') } catch (e) { if (e.message === (msg || 'Expected throw')) throw e } },
            },
            'crypto': {
                randomBytes: (n) => { const arr = new Uint8Array(n); crypto.getRandomValues(arr); return { toString: (enc) => enc === 'hex' ? Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...arr)) } },
                createHash: () => ({ update: (d) => ({ digest: () => btoa(d) }) }),
            },
            'buffer': {
                Buffer: {
                    from: (data, enc) => ({ toString: (e) => e === 'base64' ? btoa(data) : data }),
                    alloc: (size) => new Uint8Array(size),
                    isBuffer: () => false,
                }
            },
        }
        if (mocks[mod]) return mocks[mod]
        throw new Error(`require('${mod}') is not available in the browser sandbox`)
    }

    return { fakeRequire, fakeProcess }
}

// ─── Message Handler ──────────────────────────────────────────
self.onmessage = async ({ data }) => {
    if (data.type !== 'run') return

    const { code } = data

    const stdout = (text) => self.postMessage({ type: 'stdout', text })
    const stderr = (text) => self.postMessage({ type: 'stderr', text })

    const fakeConsole = {
        log: (...args) => stdout(args.map(formatArg).join(' ')),
        error: (...args) => stderr(args.map(formatArg).join(' ')),
        warn: (...args) => self.postMessage({ type: 'warn', text: args.map(formatArg).join(' ') }),
        info: (...args) => stdout(args.map(formatArg).join(' ')),
        dir: (obj) => stdout(JSON.stringify(obj, null, 2)),
        table: (obj) => stdout(JSON.stringify(obj, null, 2)),
        time: (label) => { fakeConsole._timers = fakeConsole._timers || {}; fakeConsole._timers[label] = Date.now() },
        timeEnd: (label) => { const t = fakeConsole._timers?.[label]; stdout(`${label}: ${t ? Date.now() - t : '?'}ms`) },
        group: (...args) => stdout('▸ ' + args.join(' ')),
        groupEnd: () => { },
        assert: (cond, ...args) => { if (!cond) stderr('Assertion failed: ' + args.join(' ')) },
        clear: () => { },
        count: (label = 'default') => stdout(`${label}: ${(fakeConsole._counts = fakeConsole._counts || {})[label] = ((fakeConsole._counts || {})[label] || 0) + 1}`),
        _timers: {},
        _counts: {},
    }

    try {
        // ── Sandbox path ────────────────────────────────────────
        const { fakeRequire, fakeProcess } = createSandboxExecutor(stdout, stderr)

            const wrappedCode = `
        'use strict';
        const __result = (async () => {
          ${code}
        })();
        return __result;
      `

            const fn = new Function('console', 'process', 'require', '__filename', '__dirname', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Promise', 'Buffer', wrappedCode)

            const fakeBuffer = {
                from: (data, enc) => {
                    const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
                    buf.toString = (e) => e === 'base64' ? btoa(String.fromCharCode(...buf)) : new TextDecoder().decode(buf)
                    return buf
                },
                alloc: (size, fill = 0) => { const b = new Uint8Array(size).fill(fill); b.toString = () => new TextDecoder().decode(b); return b },
                isBuffer: (v) => v instanceof Uint8Array,
                concat: (bufs) => { const total = bufs.reduce((n, b) => n + b.length, 0); const out = new Uint8Array(total); let i = 0; for (const b of bufs) { out.set(b, i); i += b.length } out.toString = () => new TextDecoder().decode(out); return out },
            }

            await fn(fakeConsole, fakeProcess, fakeRequire, 'script.js', '/', setTimeout, clearTimeout, setInterval, clearInterval, Promise, fakeBuffer)

        self.postMessage({ type: 'done' })

    } catch (err) {
        stderr(err.stack || err.message || String(err))
        self.postMessage({ type: 'done', error: true })
    }
}

function formatArg(arg) {
    if (arg === null) return 'null'
    if (arg === undefined) return 'undefined'
    if (typeof arg === 'string') return arg
    if (typeof arg === 'function') return arg.toString()
    try {
        return JSON.stringify(arg, null, 2)
    } catch {
        return String(arg)
    }
}