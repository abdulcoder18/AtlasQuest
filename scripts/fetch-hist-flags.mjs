// Resolve historical flag files via the Wikipedia API, download local copies,
// write the resolved asset filename back into the dataset, and DROP entries
// that could not be resolved (so the game never shows broken images).
// Only processes entries that don't already have a local asset.
// usage: node scripts/fetch-hist-flags.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import fsSync from "node:fs";

const UA = { "User-Agent": "AtlasQuest/1.0 (educational geography app; contact: local)" };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const dataAll = JSON.parse(await readFile("data/historical-flags.json", "utf8"));
await mkdir("assets/flags/hist", { recursive: true });
const data = dataAll.filter(e => !e.asset); // only fetch new entries

async function api(params, tries = 4) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams(params)}`;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429) { await sleep(8000 * (i + 1)); continue; }
    if (!res.ok) throw new Error(`api ${res.status}`);
    return res.json();
  }
  throw new Error("api 429 (gave up)");
}

async function fetchBin(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429) { await sleep(8000 * (i + 1)); continue; }
    if (!res.ok) throw new Error(`bin ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("bin 429 (gave up)");
}

const missing = [];
let okCount = 0;
for (const entry of data) {
  try {
    const j = await api({ action: "query", titles: `File:${entry.file}`, prop: "imageinfo", iiprop: "url", format: "json", redirects: 1 });
    const page = Object.values(j.query?.pages || {})[0];
    const info = page?.imageinfo?.[0];
    if (page?.missing || !info) { missing.push(entry.slug); console.log("MISSING", entry.slug, "|", entry.file); await sleep(1400); continue; }
    const orig = info.url.split("?")[0];
    const ext = (orig.split(".").pop() || "png").toLowerCase();
    const buf = await fetchBin(orig);
    if (buf.length < 120) { console.log("TOO SMALL", entry.slug); await sleep(1400); continue; }
    await writeFile(`assets/flags/hist/${entry.slug}.${ext}`, buf);
    entry.asset = `${entry.slug}.${ext}`;
    okCount++;
    console.log("OK", entry.slug, `(${(buf.length / 1024).toFixed(0)} KB) <- ${orig.split("/").pop()}`);
  } catch (e) {
    missing.push(entry.slug); console.log("ERR", entry.slug, e.message);
  }
  await sleep(1400);
}

// drop entries that failed so the game never shows broken images
const keep = dataAll.filter(e => e.asset && fsSync.existsSync(`assets/flags/hist/${e.asset}`));
await writeFile("data/historical-flags.json", JSON.stringify(keep, null, 1));
console.log(`\nDownloaded ${okCount}, missing/failed ${missing.length}${missing.length ? ": " + missing.join(",") : ""}`);
console.log(`kept ${keep.length} / ${dataAll.length}`);
