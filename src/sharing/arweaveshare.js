import { TurboFactory } from "@ardrive/turbo-sdk/web";
import Arweave from "arweave";
import { buildVitePreviewHTML } from "../runtime/vitePreview.js";

export async function shareCode(codeContent) {
    const tags = [
        { name: "Content-Type", value: "text/plain" },
        { name: "App-Name", value: "antigravity-ide" },
    ];

    // Generate a throwaway wallet — free for uploads under 100KB
    const arweave = Arweave.init({});
    const jwk = await arweave.wallets.generate();

    const turbo = await TurboFactory.authenticated({
        privateKey: jwk,
        token: "arweave",
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(codeContent);

    // Check size — warn if over 100KB
    if (data.byteLength > 100 * 1024) {
        throw new Error(
            `Code is ${(data.byteLength / 1024).toFixed(1)}KB — exceeds the 100KB free limit.`
        );
    }

    const result = await turbo.upload({
        data,
        dataItemOpts: { tags },
    });

    return await buildShareResult(result.id);
}

export async function shareProject(files, entryFile) {
    const tags = [
        { name: "Content-Type", value: "text/html" },
        { name: "App-Name", value: "antigravity-ide" },
        { name: "Share-Type", value: "project-preview" },
    ];

    const arweave = Arweave.init({});
    const jwk = await arweave.wallets.generate();

    const turbo = await TurboFactory.authenticated({
        privateKey: jwk,
        token: "arweave",
    });

    const html = buildVitePreviewHTML(files || {}, entryFile || "index.html");
    const encoder = new TextEncoder();
    const data = encoder.encode(html);

    if (data.byteLength > 100 * 1024) {
        throw new Error(
            `Project preview is ${(data.byteLength / 1024).toFixed(1)}KB — exceeds the 100KB free limit. Try URL share for smaller projects, or reduce files.`,
        );
    }

    const result = await turbo.upload({
        data,
        dataItemOpts: { tags },
    });

    return await buildShareResult(result.id);
}

async function buildShareResult(id) {
    const links = [
        `https://turbo-gateway.com/${id}`,
        `https://arweave.net/${id}`,
        `https://ar.io/${id}`,
    ];

    const readyURL = await waitForReadableLink(links, {
        attempts: 8,
        delayMs: 2500,
    });

    return {
        id,
        shareURL: readyURL || links[0],
        links,
        isReady: Boolean(readyURL),
    };
}

async function waitForReadableLink(links, { attempts, delayMs }) {
    for (let i = 0; i < attempts; i++) {
        for (const link of links) {
            if (await isReadable(link)) return link;
        }
        if (i < attempts - 1) {
            await sleep(delayMs);
        }
    }
    return null;
}

async function isReadable(url) {
    try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        return res.ok;
    } catch {
        return false;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}