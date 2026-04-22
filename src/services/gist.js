/**
 * GitHub Gists backend for the community feed (no blockchain).
 * Reading public gists is unauthenticated; creating gists needs a PAT.
 */

const FEED_MARKER = "[Zap-IDE]";

function authHeaders(token) {
  const h = { Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * List recent public gists for a GitHub username; optional filter by our marker in description.
 */
export async function loadGistFeed(username, { requireMarker = true, token = "" } = {}) {
  if (!username?.trim()) return [];

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username.trim())}/gists?per_page=40&t=${Date.now()}`,
    { headers: authHeaders(token) },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `GitHub ${res.status}`);
  }

  const gists = await res.json();
  const items = [];

  for (const g of gists) {
    if (requireMarker && !(g.description || "").includes(FEED_MARKER)) continue;

    const gistFiles = g.files || {};
    const names = Object.keys(gistFiles);
    if (names.length === 0) continue;

    // To avoid fetching 10 files per gist in a list view, we just take the "main" one for preview
    const mainName = names.find(n => !n.includes("___")) || names[0];
    let previewCode = "";
    try {
      const rawUrl = gistFiles[mainName]?.raw_url;
      if (rawUrl) {
        const fr = await fetch(rawUrl);
        previewCode = await fr.text();
      }
    } catch { continue; }

    // Parse metadata from description
    const desc = g.description || "";
    const arweaveMatch = desc.match(/Preview: (https:\/\/[^\s]+)/);
    const arweaveUrl = arweaveMatch ? arweaveMatch[1] : "";
    const title = desc.replace(FEED_MARKER, "").replace(/Preview: https:\/\/[^\s]+/, "").trim() || "Untitled";

    items.push({
      id: g.id,
      author: g.owner?.login || username,
      title,
      code: previewCode, // still provide a preview for the UI card
      arweaveUrl,
      files: gistFiles, // Store the raw gist files metadata for later full fetch
      timestamp: new Date(g.updated_at || g.created_at).getTime(),
      html_url: g.html_url,
      source: "gist",
    });
  }

  return items;
}

/**
 * Fetch all files for a specific Gist and reconstruct the project object.
 */
export async function fetchFullGistProject(gistFiles) {
  const projectFiles = {};
  const names = Object.keys(gistFiles);
  
  await Promise.all(names.map(async (gistName) => {
    const fileMeta = gistFiles[gistName];
    if (!fileMeta.raw_url) return;
    
    try {
      const res = await fetch(fileMeta.raw_url);
      const content = await res.text();
      // Decode filename: "src___App.jsx" -> "src/App.jsx"
      const realPath = gistName.replace(/___/g, "/");
      projectFiles[realPath] = content;
    } catch (e) {
      console.error(`Failed to fetch ${gistName}`, e);
    }
  }));
  
  return projectFiles;
}

/**
 * Publish a full project (multiple files) as a public gist.
 */
export async function shareGist(title, files, arweaveUrl, token) {
  if (!token?.trim()) {
    throw new Error("Add a GitHub token in Settings to publish gists.");
  }

  const gistFiles = {};
  for (const [path, content] of Object.entries(files)) {
    // Encode path: "src/App.jsx" -> "src___App.jsx" (Gists don't support / in filenames)
    const gistName = path.replace(/\//g, "___");
    gistFiles[gistName] = { content: content || "" };
  }

  const description = `${FEED_MARKER} ${title} ${arweaveUrl ? `Preview: ${arweaveUrl}` : ""}`.trim();

  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      ...authHeaders(token.trim()),
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      description,
      public: true,
      files: gistFiles,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `GitHub ${res.status}`);
  }

  return {
    html_url: data.html_url,
    id: data.id,
  };
}
