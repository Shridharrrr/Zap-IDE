// ─── Arweave Deploy ───────────────────────────────────────────
// Deploy the current IDE state to Arweave via arweave-js

export async function deploy(walletJSON, htmlContent, onProgress) {
    onProgress?.('Initializing Arweave client...')

    let Arweave
    try {
        const mod = await import('arweave')
        Arweave = mod.default
    } catch (e) {
        throw new Error('Failed to load arweave-js: ' + e.message)
    }

    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    })

    // Parse wallet
    let wallet
    try {
        wallet = typeof walletJSON === 'string' ? JSON.parse(walletJSON) : walletJSON
    } catch {
        throw new Error('Invalid wallet JSON — please paste your Arweave wallet file contents')
    }

    onProgress?.('Building transaction...')

    const data = typeof htmlContent === 'string'
        ? new TextEncoder().encode(htmlContent)
        : htmlContent

    const tx = await arweave.createTransaction({ data }, wallet)

    // Tags
    tx.addTag('Content-Type', 'text/html')
    tx.addTag('App-Name', 'AntigravityIDE')
    tx.addTag('Version', '1.0')
    tx.addTag('Created-At', new Date().toISOString())

    onProgress?.('Signing transaction...')
    await arweave.transactions.sign(tx, wallet)

    onProgress?.('Uploading to Arweave...')
    const response = await arweave.transactions.post(tx)

    if (response.status !== 200 && response.status !== 202) {
        throw new Error(`Arweave upload failed: ${response.status} ${response.statusText}`)
    }

    const txId = tx.id
    const arlinkUrl = `https://arlink.ar.io/${txId}`

    onProgress?.(`Deployed! TX: ${txId}`)

    return { txId, arlinkUrl, arweaveUrl: `https://arweave.net/${txId}` }
}