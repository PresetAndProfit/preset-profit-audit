// api/_lib/safeFetch.js — SSRF-hardened HTTP fetch for the website scanner.
//
// The scanner fetches arbitrary user-supplied URLs server-side, which is a
// classic SSRF sink. This module makes that safe:
//   1. Static URL validation: only http/https, only ports 80/443, no obvious
//      internal hostnames, and reject IP-literals that point at private space.
//   2. Connection-time IP guard: a custom undici Agent resolves DNS and refuses
//      to CONNECT to any private/reserved/link-local address. Because the check
//      runs at connect time, it also covers HTTP redirects AND DNS-rebinding
//      (the IP is re-validated on every socket, not just once up front).
//   3. Caps: connection/headers/body timeouts, a hard response-size limit, and
//      a capped redirect count.
import dns from "node:dns";
import net from "node:net";
import { Agent } from "undici";

// ── private / reserved IP detection ──────────────────────────────────────────
function ipv4ToInt(ip) {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    const o = Number(part);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = n * 256 + o;
  }
  return n >>> 0;
}

// CIDR blocks that must never be reachable from the scanner.
const V4_BLOCKS = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
].map(([base, bits]) => {
  const baseInt = ipv4ToInt(base);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  // Force unsigned: a masked base with the high bit set is a negative int32,
  // which would never equal the unsigned (>>> 0) value compared in isPrivateV4.
  return [(baseInt & mask) >>> 0, mask];
});

function isPrivateV4(ip) {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // treat unparseable as unsafe
  return V4_BLOCKS.some(([base, mask]) => (n & mask) >>> 0 === base);
}

function isPrivateV6(ip) {
  const a = ip.toLowerCase();
  if (a === "::1" || a === "::" || a === "::0") return true;        // loopback / unspecified
  if (a.startsWith("fe8") || a.startsWith("fe9") || a.startsWith("fea") || a.startsWith("feb")) return true; // fe80::/10 link-local
  if (a.startsWith("fc") || a.startsWith("fd")) return true;        // fc00::/7 unique-local
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4.
  const mapped = a.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateV4(mapped[1]);
  return false;
}

// Public exported predicate (also used by tests / dev guard).
export function isBlockedAddress(ip) {
  const fam = net.isIP(ip);
  if (fam === 4) return isPrivateV4(ip);
  if (fam === 6) return isPrivateV6(ip);
  return true; // not a valid IP → block
}

// ── static URL validation ────────────────────────────────────────────────────
const BLOCKED_HOST_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home.arpa"];

export function validateUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return { ok: false, reason: "invalid-url" }; }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "bad-protocol" };
  }
  // Only standard web ports. Empty = default for the protocol.
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "bad-port" };
  }
  // URL hostnames keep IPv6 literals in brackets ("[::1]"); strip them so the
  // IP-literal check below sees a parseable address.
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "blocked-host" };
  }
  // If the host is a literal IP, validate it now (no DNS needed).
  if (net.isIP(host) && isBlockedAddress(host)) {
    return { ok: false, reason: "blocked-ip" };
  }
  return { ok: true, url };
}

// ── connection-time guarded DNS lookup ───────────────────────────────────────
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    for (const a of list) {
      if (isBlockedAddress(a.address)) {
        return callback(new Error(`blocked-private-address:${a.address}`));
      }
    }
    if (options && options.all) return callback(null, list);
    const first = list[0];
    return callback(null, first.address, first.family);
  });
}

// One shared agent; the guard runs on every new connection it opens.
const guardedAgent = new Agent({
  connect: { lookup: guardedLookup, timeout: 8000 },
  headersTimeout: 9000,
  bodyTimeout: 9000,
  maxRedirections: 0, // we follow manually so we can re-validate each hop
});

const MAX_BYTES = 1_200_000;
const MAX_REDIRECTS = 4;

async function readCapped(res) {
  // Stream the body and stop once we hit the cap, so a malicious/huge response
  // can't exhaust memory.
  const reader = res.body?.getReader?.();
  if (!reader) {
    const txt = await res.text();
    return txt.length > MAX_BYTES ? txt.slice(0, MAX_BYTES) : txt;
  }
  const chunks = [];
  let total = 0;
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    out += dec.decode(value, { stream: true });
    chunks.push(value);
    if (total >= MAX_BYTES) { try { await reader.cancel(); } catch { /* ignore */ } break; }
  }
  out += dec.decode();
  return out;
}

// Drop-in replacement for the scanner's fetchOnce: same return shape, but
// SSRF-guarded and with manual, re-validated redirect handling.
export async function safeFetchPage(rawUrl, timeoutMs = 9000) {
  let current = rawUrl;
  const started = Date.now();

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const v = validateUrl(current);
    if (!v.ok) throw new Error(`ssrf-blocked:${v.reason}`);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(v.url.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        dispatcher: guardedAgent,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PresetProfitAuditBot/1.0; +https://presetandprofit.com)",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      // Follow redirects ourselves so each new target is re-validated.
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const next = new URL(res.headers.get("location"), v.url).toString();
        try { await res.body?.cancel?.(); } catch { /* ignore */ }
        current = next;
        continue;
      }

      const html = await readCapped(res);
      const finalUrl = res.url || v.url.toString();
      return {
        ok: res.ok,
        status: res.status,
        finalUrl,
        secure: finalUrl.startsWith("https://"),
        html,
        bytes: html.length,
        fetchMs: Date.now() - started,
      };
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error("too-many-redirects");
}
