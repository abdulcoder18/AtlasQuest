// For slugs listed in CANDIDATES, resolve+download the first working file and patch the dataset.
import { readFile, writeFile } from "node:fs/promises";

const UA = { "User-Agent": "AtlasQuest/1.0 (educational geography app; contact: local)" };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const CANDIDATES = {
  "rashidun-caliphate": ["Rashidun Flag.svg"],
  "abbasid-caliphate": ["Abbasid banner.svg"],
  "republic-of-china-1912": ["Flag of the Republic of China (1912-1928).svg"],
  "byzantine-empire": ["Flag of the Byzantine Empire (14th century).svg", "Byzantine imperial flag, 14th century.svg"],
  "rashidun-caliphate": ["Rashidun Flag.svg"],
  "umayyad-caliphate": ["Flag of the Umayyad Caliphate (Reconstructed).png"],
  "abbasid-caliphate": ["Abbasid banner.svg"],
  "british-east-india-company": ["Flag of the British East India Company (1801).svg"],
  "prussia": ["Flag of Prussia (1892-1918).svg"],
  "austria-hungary": ["Austria-Hungary civil ensign 1869-1918.png"],
  "qing-dynasty": ["Flag of China (1889–1912).svg"],
  "republic-of-china-1912": ["Flag of the Republic of China (1912-1928).svg"],
  "kingdom-of-siam": ["Flag of Siam (1855).svg"],
  "korean-empire": ["Flag of Korea (1882–1910).svg", "Flag of the Korean Empire.svg"],
  "empire-of-brazil": ["Flag of the Empire of Brazil (1870-1889).svg", "Flag of Empire of Brazil (1870-1889).svg"],
  "gran-colombia": ["Flag of Gran Colombia (1822-1834).svg", "Flag of Gran Colombia.svg"],
  "confederate-states": ["Confederate National Flag since Mar 4 1861.svg", "Flag of the Confederate States of America (1861-1863).svg"],
  "polish-lithuanian-commonwealth": ["Flag of the Polish-Lithuanian Commonwealth (c. 1635).svg", "Flag of the Commonwealth of Both Nations.svg", "Choragiew Rzeczypospolitej Obojga Narodow.svg"],
  "kingdom-of-jerusalem": ["Flag of the Kingdom of Jerusalem.svg", "Arms of the Kingdom of Jerusalem.svg", "Coat of arms of the Kingdom of Jerusalem.svg"],
  "qajar-iran": ["Flag of Persia (1886).svg", "Flag of Iran (1886).svg", "Lion and Sun (Qajar).svg"],
  "tsardom-of-russia": ["Flag of the Tsardom of Russia (1693-1700).svg", "Flag of Russia (1668-1693).svg"],
};

async function api(params, tries = 4) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams(params)}`;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: UA });
    if (res.status === 429) { await sleep(9000 * (i + 1)); continue; }
    if (!res.ok) throw new Error(`api ${res.status}`);
    return res.json();
  }
  throw new Error("api 429");
}

const data = JSON.parse(await readFile("data/historical-flags.json", "utf8"));
const stillMissing = [];

for (const [slug, candidates] of Object.entries(CANDIDATES)) {
  const entry = data.find(e => e.slug === slug);
  if (!entry) { console.log("no entry", slug); continue; }
  let done = false;
  for (const cand of candidates) {
    try {
      const j = await api({ action: "query", titles: `File:${cand}`, prop: "imageinfo", iiprop: "url", format: "json", redirects: 1 });
      const page = Object.values(j.query?.pages || {})[0];
      const info = page?.imageinfo?.[0];
      if (page?.missing || !info) { console.log("  miss:", slug, "|", cand); await sleep(1500); continue; }
      const orig = info.url.split("?")[0];
      const res = await fetch(orig, { headers: UA });
      if (!res.ok) { console.log("  dl fail:", res.status, slug, cand); await sleep(1500); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 120) { console.log("  too small:", slug, cand); await sleep(1500); continue; }
      const ext = (orig.split(".").pop() || "png").toLowerCase();
      await writeFile(`assets/flags/hist/${slug}.${ext}`, buf);
      entry.file = cand;
      entry.asset = `${slug}.${ext}`;
      console.log("OK", slug, "<-", cand, `(${(buf.length / 1024).toFixed(0)} KB)`);
      done = true;
      break;
    } catch (e) { console.log("  err:", slug, cand, e.message); await sleep(3000); }
  }
  if (!done) stillMissing.push(slug);
  await sleep(1500);
}

await writeFile("data/historical-flags.json", JSON.stringify(data, null, 1));
console.log(`\nFixed ${Object.keys(CANDIDATES).length - stillMissing.length}, still missing: ${stillMissing.join(",") || "none"}`);
