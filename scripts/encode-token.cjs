// Generates js/secure-tokens.js — the built-in Mapillary token wrapped in 3 layers:
//   L1: XOR with rotating key  L2: byte-reverse + Base64  L3: hex
// NOTE: this is obfuscation, not true encryption — see README security note.
const fs = require("fs");

const TOKEN = process.argv[2];
if (!TOKEN) { console.error("usage: node scripts/encode-token.cjs <token>"); process.exit(1); }

// layer 1: XOR with rotating key
const K = "atlasquest-expedition-2026";
const xored = Buffer.from([...TOKEN].map((c, i) => c.charCodeAt(0) ^ K.charCodeAt(i % K.length)));

// layer 2: reverse bytes then base64
const rev = Buffer.from([...xored].reverse());
const b64s = rev.toString("base64");

// layer 3: hex-encode the base64 string
const hex = Buffer.from(b64s, "utf8").toString("hex");

const out = `// AtlasQuest — built-in provider tokens (obfuscated, 3 layers: XOR -> reversed Base64 -> hex).
// NOTE: client-side obfuscation deters casual extraction but is NOT cryptographically secure —
// any token shipped to a browser can be recovered by a determined user. Rotate via scripts/encode-token.cjs.
const LAYERS_KEY = ${JSON.stringify(K)};

function unhex(h) {
  let s = "";
  for (let i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
  return s;
}
function xorKey(bytes) {
  return [...bytes].map((b, i) => b ^ LAYERS_KEY.charCodeAt(i % LAYERS_KEY.length));
}
function decode(encoded) {
  try {
    const b = unhex(encoded);                                     // L3
    const r = Uint8Array.from(atob(b), c => c.charCodeAt(0));     // L2
    const bytes = Uint8Array.from(r).reverse();
    return String.fromCharCode(...xorKey(bytes));                 // L1
  } catch { return ""; }
}

const MAPILLARY_TOKEN_ENC = ${JSON.stringify(hex)};

export function getMapillaryToken() {
  const t = decode(MAPILLARY_TOKEN_ENC);
  return t.startsWith("MLY|") ? t : "";
}
`;

fs.writeFileSync("js/secure-tokens.js", out);
console.log("js/secure-tokens.js written | hex length:", hex.length);

// self-test roundtrip (decode exactly like the browser will)
const unhex2 = (h) => { let s = ""; for (let i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.slice(i, i + 2), 16)); return s; };
const b64r = unhex2(hex);
const revBytes = Buffer.from(b64r, "base64");
const back = [...Buffer.from([...revBytes].reverse())].map((b, i) => String.fromCharCode(b ^ K.charCodeAt(i % K.length))).join("");
console.log("roundtrip OK:", back === TOKEN);
if (back !== TOKEN) process.exit(1);
