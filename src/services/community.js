import * as state from "../store/state.js";
import { message, dryrun, createDataItemSigner } from "@permaweb/aoconnect";
import Arweave from "arweave";
import { loadGistFeed, shareGist } from "./gist.js";

const arweave = Arweave.init({});
const DEFAULT_AO_PLACEHOLDER = "YOUR_AO_PROCESS_ID_HERE";

function resolveAoProcessId() {
  const fromStore = state.get("aoProcessId")?.trim();
  const envId =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_AO_PROCESS_ID
      ? String(import.meta.env.VITE_AO_PROCESS_ID).trim()
      : "";
  return fromStore || envId || DEFAULT_AO_PLACEHOLDER;
}

export function isAoConfigured() {
  const id = resolveAoProcessId();
  return Boolean(id && id !== DEFAULT_AO_PLACEHOLDER);
}



export async function initBurnerWallet() {
  const storedWallet = localStorage.getItem("antiG_burner_wallet");
  if (storedWallet) {
    try {
      return JSON.parse(storedWallet);
    } catch {
      console.warn("antiG: invalid stored wallet, regenerating");
    }
  }

  const jwk = await arweave.wallets.generate();
  localStorage.setItem("antiG_burner_wallet", JSON.stringify(jwk));
  return jwk;
}

export async function connectArweaveWallet() {
  const w = globalThis.arweaveWallet;
  if (!w) {
    throw new Error("Install Wander (ArConnect) to sign AO messages.");
  }
  if (typeof w.connect === "function") {
    try {
      await w.connect(["ACCESS_ADDRESS", "SIGN_TRANSACTION"]);
    } catch {
      try {
        await w.connect({
          permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
        });
      } catch {
        /* some builds only need an empty connect */
        await w.connect();
      }
    }
  }
  return w;
}

export function hasBrowserArweaveWallet() {
  return typeof globalThis.arweaveWallet === "object" && globalThis.arweaveWallet !== null;
}

async function getAoSigner() {
  if (hasBrowserArweaveWallet()) {
    const w = await connectArweaveWallet();
    return createDataItemSigner(w);
  }
  const jwk = await initBurnerWallet();
  return createDataItemSigner(jwk);
}

export async function loadCommunitySnippets() {
  const backend = state.get("communityBackend") || "ao";

  if (backend === "gist") {
    const user = state.get("githubUsername")?.trim();
    if (!user) return [];
    return loadGistFeed(user, { requireMarker: true });
  }

  const process = resolveAoProcessId();
  if (!process || process === DEFAULT_AO_PLACEHOLDER) return [];

  try {
    const res = await Promise.race([
      dryrun({ process, tags: [{ name: "Action", value: "List" }] }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout retrieving AO feed (Process might be indexing or offline).")), 5000))
    ]);

    if (res.Messages?.length > 0) {
      const raw = res.Messages[0].Data;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.map((s) => ({ ...s, source: "ao" }))
          : [];
      } catch {
        return [];
      }
    }
    return [];
  } catch (e) {
    console.error("AO loadCommunitySnippets:", e);
    throw e;
  }
}

export async function publishSnippet(title, code, filenameHint) {
  const backend = state.get("communityBackend") || "ao";

  if (backend === "gist") {
    const token = state.get("githubToken")?.trim();
    const { html_url } = await shareGist(title, code, filenameHint, token);
    return { backend: "gist", html_url };
  }

  const process = resolveAoProcessId();
  if (!process || process === DEFAULT_AO_PLACEHOLDER) {
    throw new Error(
      "Set your AO process ID in Settings (or VITE_AO_PROCESS_ID in .env).",
    );
  }

  const signer = await getAoSigner();
  const msgId = await message({
    process,
    signer,
    tags: [
      { name: "Action", value: "Post" },
      { name: "Title", value: title },
    ],
    data: code ?? "",
  });

  return { backend: "ao", msgId };
}
