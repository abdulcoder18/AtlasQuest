// Downloads SVG flags for every country code in data/countries.json from flagcdn.com
import { readFile, writeFile, mkdir } from "node:fs/promises";

const countries = JSON.parse(await readFile("data/countries.json", "utf8"));
await mkdir("assets/flags", { recursive: true });

const ok = [], failed = [];
const CONC = 12;
const queue = [...countries];
async function worker() {
  while (queue.length) {
    const c = queue.shift();
    const code = c.cca2.toLowerCase();
    try {
      const res = await fetch(`https://flagcdn.com/${code}.svg`);
      const text = await res.text();
      if (res.ok && (text.includes("<svg") || text.startsWith("<?xml"))) {
        await writeFile(`assets/flags/${code}.svg`, text);
        ok.push(code);
      } else failed.push(code);
    } catch { failed.push(code); }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`Downloaded: ${ok.length}, failed: ${failed.length}${failed.length ? " -> " + failed.join(",") : ""}`);

// extra territory/dependency codes worth trying even if not in countries.json
const extras = ["va","um","eu","un","gb-eng","gb-sct","gb-wls","gb-nir"];
const extraOk = [], extraFail = [];
for (const code of extras) {
  try {
    const res = await fetch(`https://flagcdn.com/${code}.svg`);
    const text = await res.text();
    if (res.ok && text.includes("<svg")) { await writeFile(`assets/flags/${code}.svg`, text); extraOk.push(code); }
    else extraFail.push(code);
  } catch { extraFail.push(code); }
}
console.log(`Extras ok: ${extraOk.join(",")} | fail: ${extraFail.join(",") || "none"}`);
