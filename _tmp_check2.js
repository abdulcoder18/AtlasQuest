// Batch 2: alternate spellings for the missing primaries
const cands = [
  "Flag of Prussia (1892-1918).svg",
  "Flag of Prussia (1918–1933).svg",
  "Flag of Prussia (1918-1933).svg",
  "Flag of the Kingdom of Prussia.svg",
  "Flag of Austria-Hungary (1869-1918).svg",
  "Civil Ensign of Austria-Hungary.svg",
  "Naval Ensign of the Polish-Lithuanian Commonwealth.svg",
  "Banner of the Polish-Lithuanian Commonwealth.svg",
  "Flag of the Papal States (1808-1870).svg",
  "Flag of Kingdom of Jerusalem.svg",
  "Flag of Jerusalem.svg",
  "Flag of Umayyad Caliphate.svg",
  "Umayyad Flag.svg",
  "Abbasid Flag.svg",
  "Rashidun Flag.svg",
  "Flag of the Qing dynasty (1889-1912).svg",
  "Flag of China (1889-1912).svg",
  "Flag of the Republic of China (1912-1928).svg",
  "Flag of Siam (1855-1916).svg",
  "Flag of Korea (1882).png",
  "Flag of Korea 1882.svg",
  "Flag of the Korean Empire (1888-1910).svg",
  "Flag of the Nguyễn dynasty (1885-1945).svg",
  "Flag of the Nguyễn dynasty (1920-1945).svg",
  "Flag of Mongolia (1911-1921).svg",
  "Flag of the Arab Revolt.svg",
  "Bandera del Tawantinsuyo.svg",
  "Flag of the Inca state.png",
  "Flag of Persia (1852-1907).svg",
  "Flag of Qajar dynasty.svg",
  "Flag of the Kingdom of Hejaz (1920).svg",
  "Flag of Hejaz (1921-1926).svg"
];
const fs = require("fs");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { "User-Agent": "FlagGuesserDatasetCheck/1.0 (educational flag-guessing app; one-off verification)" };
const status = {};
const imgUrl = {};

async function restOne(name) {
  const url = "https://api.wikimedia.org/core/v1/commons/file/" + encodeURIComponent("File:" + name);
  const res = await fetch(url, { headers: UA });
  if (res.status === 200) {
    const body = await res.json();
    status[name] = "OK";
    if (body.preferred && body.preferred.url) imgUrl[name] = body.preferred.url;
    return;
  }
  if (res.status === 404) { status[name] = "MISSING"; return; }
  if (res.status === 429) {
    const ra = parseInt(res.headers.get("retry-after") || "20", 10);
    console.log("429, waiting " + ra + "s");
    await sleep((ra + 3) * 1000);
    return restOne(name);
  }
  status[name] = "HTTP" + res.status;
}

async function main() {
  await sleep(20000);
  await restOne("Flag of Hawaii.svg"); // probe
  console.log("probe: " + status["Flag of Hawaii.svg"]);
  for (const n of cands) {
    try { await restOne(n); } catch (e) { status[n] = "ERR:" + e.message; }
    console.log(status[n] + " | " + n);
    await sleep(1700);
  }
  const prev = JSON.parse(fs.readFileSync("C:/Users/LUFY/Documents/Flag guesser/_tmp_results.json", "utf8"));
  Object.assign(prev.status, status);
  Object.assign(prev.imgUrl, imgUrl);
  fs.writeFileSync("C:/Users/LUFY/Documents/Flag guesser/_tmp_results.json", JSON.stringify(prev, null, 1));
  console.log("\nmerged into _tmp_results.json");
}
main().catch(e => { console.error("FATAL", e); process.exit(1); });
