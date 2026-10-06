// AtlasQuest — GMI Cloud image generation CLI.
// Generates game assets, posters, banners, buttons etc. via GMI Cloud's async
// image request queue (e.g. model: hy-image-v3.5-preview).
//
// Config: API key is read from (first match wins):
//   1. --key <KEY> argument
//   2. GMI_API_KEY environment variable
//   3. ./gmi.key file (project root; do NOT commit this)
// Get a key: console.gmicloud.ai -> API Keys (Organization / user settings).
//
// Usage:
//   node scripts/gmi-image.mjs --prompt "..." --out assets/gen/hero.png --size 1024x1024
//   node scripts/gmi-image.mjs --from scripts/asset-jobs.json        (batch)
//   node scripts/gmi-image.mjs --prompt "..." --model <other-model> --wait 180
//
// Batch file format (asset-jobs.json): [{ "out": "...", "prompt": "...", "size": "..." }, ...]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const API = "https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey/requests";
const DEFAULT_MODEL = "hy-image-v3.5-preview";

function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const hasFlag = (name) => process.argv.includes("--" + name);

async function getKey() {
  const k = arg("key") || process.env.GMI_API_KEY;
  if (k) return k.trim();
  try {
    const f = await readFile("gmi.key", "utf8");
    const t = f.trim();
    if (t) return t;
  } catch {}
  console.error(`✗ No API key. Do ONE of:
  1. setx GMI_API_KEY "your-key"        (persistent, new terminals)
  2. echo your-key > gmi.key            (project root file)
  3. add --key your-key                 (inline, shows in history)
Get a key at console.gmicloud.ai -> API Keys.`);
  process.exit(1);
}

async function api(path, opts = {}, key) {
  const res = await fetch(`https://console.gmicloud.ai${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${String(text).slice(0, 300)}`);
  return body;
}

async function generate({ prompt, out, size = "1024x1024", model = DEFAULT_MODEL, wait = 300, extra = null }, key) {
  if (!prompt) throw new Error("missing prompt");
  const payload = { prompt, size, ...(extra || {}) };
  console.log(`→ submitting [${model}] ${size} :: ${prompt.slice(0, 90)}${prompt.length > 90 ? "…" : ""}`);
  let res = await api("/api/v1/ie/requestqueue/apikey/requests", {
    method: "POST",
    body: JSON.stringify({ model, payload }),
  }, key);

  const id = res.request_id;
  if (!id) throw new Error("no request_id in response: " + JSON.stringify(res).slice(0, 300));
  if (res.status === "failed") throw new Error("request failed immediately: " + JSON.stringify(res).slice(0, 300));

  // already done?
  let final = res.status === "success" ? res : null;

  // poll
  const deadline = Date.now() + wait * 1000;
  let waited = 0;
  while (!final) {
    await new Promise(r => setTimeout(r, 3000));
    waited += 3;
    final = await api(`/api/v1/ie/requestqueue/apikey/requests/${id}`, {}, key);
    if (final.status === "success") break;
    if (final.status === "failed") throw new Error("generation failed: " + JSON.stringify(final).slice(0, 300));
    if (Date.now() > deadline) throw new Error(`timed out after ${wait}s (request_id ${id} — try again with GET to retrieve)`);
    if (waited % 30 === 0) console.log(`   … still ${final.status || "queued"} (${waited}s)`);
  }

  const media = final.outcome?.media_urls || [];
  if (!media.length) throw new Error("success but no media_urls: " + JSON.stringify(final).slice(0, 300));
  const url = media[0].url;
  const bin = await fetch(url);
  if (!bin.ok) throw new Error(`image download failed: HTTP ${bin.status}`);
  const buf = Buffer.from(await bin.arrayBuffer());
  const outPath = out || `assets/gen/gen-${Date.now()}.png`;
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`✓ saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB, ${media[0].width}x${media[0].height})`);
  return outPath;
}

(async () => {
  const key = await getKey();
  const from = arg("from");
  if (from) {
    const jobs = JSON.parse(await readFile(from, "utf8"));
    console.log(`batch: ${jobs.length} jobs`);
    for (const j of jobs) {
      try { await generate({ model: DEFAULT_MODEL, ...j }, key); }
      catch (e) { console.error(`✗ ${j.out}: ${e.message}`); }
      await new Promise(r => setTimeout(r, 1500));
    }
    return;
  }
  const prompt = arg("prompt");
  if (!prompt) { console.error("usage: --prompt \"...\" --out path.png --size WxH [--model m] [--from jobs.json]"); process.exit(1); }
  const extraRaw = arg("payload");
  const extra = extraRaw ? JSON.parse(extraRaw) : null;
  await generate({
    prompt,
    out: arg("out"),
    size: arg("size") || "1024x1024",
    model: arg("model") || DEFAULT_MODEL,
    wait: parseInt(arg("wait") || "300"),
    extra,
  }, key);
})().catch(e => { console.error("✗", e.message); process.exit(1); });
