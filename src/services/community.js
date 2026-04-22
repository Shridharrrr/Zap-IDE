import * as state from "../store/state.js";
import { loadGistFeed, shareGist } from "./gist.js";
import { shareProject } from "../sharing/arweaveshare.js";

export async function loadCommunitySnippets() {
  const user = state.get("githubUsername")?.trim();
  const token = state.get("githubToken")?.trim();
  if (!user) return [];
  return loadGistFeed(user, { requireMarker: true, token });
}

export async function publishSnippet(title, files, entryFile) {
  const token = state.get("githubToken")?.trim();
  
  // 1. Generate Arweave preview link (optional, don't fail publish if arweave fails)
  let arweaveUrl = "";
  try {
    const result = await shareProject(files, entryFile);
    arweaveUrl = result.shareURL;
  } catch (e) {
    console.error("Arweave preview generation failed:", e);
  }

  // 2. Publish all files to Gist
  const { html_url } = await shareGist(title, files, arweaveUrl, token);
  return { backend: "gist", html_url, arweaveUrl };
}
