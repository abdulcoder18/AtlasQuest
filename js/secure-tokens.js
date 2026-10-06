// AtlasQuest — built-in provider tokens (obfuscated, 3 layers: XOR -> reversed Base64 -> hex).
// NOTE: client-side obfuscation deters casual extraction but is NOT cryptographically secure —
// any token shipped to a browser can be recovered by a determined user. Rotate via scripts/encode-token.cjs.
const LAYERS_KEY = "atlasquest-expedition-2026";

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

const MAPILLARY_TOKEN_ENC = "5146685443774a54486c6c59584577505667595348675a4f5445565545424157423168414177554b435642525756786652316c54556b4a4158426c4e526c3144535545644e546773";

export function getMapillaryToken() {
  const t = decode(MAPILLARY_TOKEN_ENC);
  return t.startsWith("MLY|") ? t : "";
}
