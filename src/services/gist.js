/**
 * GitHub Gists backend for the community feed (no blockchain).
 * Reading public gists is unauthenticated; creating gists needs a PAT.
 */

const FEED_MARKER = "[antiG-IDE]";

function authHeaders(token) {
  const h = { Accept: "application/vnd.github+json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * List recent public gists for a GitHub username; optional filter by our marker in description.
 */
export async function loadGistFeed(username, { requireMarker = true } = {}) {
  if (!username?.trim()) return [];

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username.trim())}/gists?per_page=40`,
    { headers: authHeaders() },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `GitHub ${res.status}`);
  }

  const gists = await res.json();
  const items = [];

  for (const g of gists) {
    if (requireMarker && !(g.description || "").includes(FEED_MARKER)) continue;

    const files = g.files || {};
    const names = Object.keys(files);
    const mainName = names[0];
    if (!mainName) continue;

    let code = "";
    try {
      const rawUrl = files[mainName]?.raw_url;
      if (rawUrl) {
        const fr = await fetch(rawUrl);
        code = await fr.text();
      }
    } catch {
      continue;
    }

    let title =
      (g.description || "").replace(FEED_MARKER, "").trim() ||
      mainName.replace(/^snippet\.?/i, "") ||
      "Untitled";

    items.push({
      id: g.id,
      author: g.owner?.login || username,
      title,
      code,
      timestamp: new Date(g.updated_at || g.created_at).getTime(),
      html_url: g.html_url,
      source: "gist",
    });
  }

  return items;
}

/**
 * Publish current file as a public gist.
 */
export async function shareGist(title, code, filenameHint, token) {
  if (!token?.trim()) {
    throw new Error("Add a GitHub token in Settings to publish gists.");
  }

  const extMatch = filenameHint?.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "txt";

  const fname = `snippet.${ext}`;
  const description = `${FEED_MARKER} ${title}`;

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
      files: {
        [fname]: { content: code ?? "" },
      },
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
