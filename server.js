// AtlasQuest — zero-dependency static file server. Run: node server.js
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === "/") path = "/index.html";
    // clean URLs: /flags -> /flags.html only if you add such files; default to index for SPA
    const filePath = normalize(join(ROOT, path));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const info = await stat(filePath).catch(() => null);
    const target = info?.isFile() ? filePath : join(ROOT, "index.html");
    const body = await readFile(target);
    res.writeHead(200, {
      "Content-Type": MIME[extname(target)] || "application/octet-stream",
      "Cache-Control": target.includes("data/") || target.includes("assets/") ? "public, max-age=86400" : "no-cache",
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500); res.end("Server error: " + err.message);
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log("\n  🌍  AtlasQuest running at " + url + "\n");
  if (process.argv.includes("--open") && process.platform === "win32") {
    import("node:child_process").then(cp => cp.exec(`start ${url}`));
  }
});
