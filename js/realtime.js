// AtlasQuest × Supabase Realtime — friend requests, challenge invites, result delivery.
//
// Design notes:
//  - Every player listens on a channel named after their own friend-code suffix
//    (`aq-sig-4W2J`). Anyone who knows the code can reach them.
//  - Nothing here needs a new table: Supabase broadcast carries small JSON
//    payloads, and both sides re-confirm through a PeerJS data connection during
//    the actual match. Realtime is the notification bus, PeerJS carries the game.
//  - Everything degrades: if the cloud is unreachable, send() returns false and
//    the UI falls back to sharing a plain text code.

import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudEnabled } from "./supabase-config.js";

let client = null;
let ready = false;
const handlers = new Set();
let myChannel = null;

export const busReady = () => ready;

/** Called once from main.js boot, before anything subscribes. */
export async function initBus() {
  if (!cloudEnabled()) return false;
  try {
    if (!window.supabase) return false;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // wait for the socket before anyone tries to subscribe
    const sock = client.channel("aq-boot");
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("bus timeout")), 6000);
      sock.subscribe((status) => {
        if (status === "SUBSCRIBED") { clearTimeout(t); resolve(); }
      });
    });
    ready = true;
    return true;
  } catch (e) {
    console.warn("realtime bus unavailable:", e?.message || e);
    return false;
  }
}

/** Start listening on our personal channel. Safe to call more than once. */
export function listenOn(code) {
  if (!ready || !code || myChannel) return myChannel;
  const ch = client.channel("aq-sig-" + String(code).toUpperCase());
  ch.on("broadcast", { event: "sig" }, ({ payload }) => {
    for (const h of handlers) { try { h(payload); } catch (e) { console.warn(e); } }
  });
  ch.subscribe();
  myChannel = ch;
  return ch;
}

export function stopListening() {
  try { myChannel?.unsubscribe(); } catch {}
  myChannel = null;
}

/** Subscribe to inbound signals. Returns an unsubscribe function. */
export function onSignal(fn) {
  handlers.add(fn);
  return () => handlers.delete(fn);
}

/**
 * Send a signal to a friend code.
 * @param {string} code  their code (the suffix, or a full NAME-CODE)
 * @param {object} msg   payload; must carry `kind` and `from`
 */
export async function sendSignal(code, msg) {
  if (!ready) return false;
  const target = String(code || "").toUpperCase().split("-").pop();
  if (!target) return false;
  try {
    const ch = client.channel("aq-sig-" + target);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("send timeout")), 6000);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") { clearTimeout(t); resolve(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); reject(new Error("channel error")); }
      });
    });
    await ch.send({ type: "broadcast", event: "sig", payload: msg });
    // keep the channel warm for a moment so the broadcast is flushed
    setTimeout(() => { try { ch.unsubscribe(); } catch {} }, 800);
    return true;
  } catch (e) {
    try { await client.removeChannel(ch); } catch {}
    console.warn("signal send failed:", e?.message || e);
    return false;
  }
}