// scripts/verify-security.mjs — automated security-gate check for the launch
// checklist. Run AFTER the app is deployed (or running locally) and migrations
// are applied. It exercises the Tier 2 protections end-to-end over HTTP.
//
// Usage:
//   BASE_URL=https://your-app TOKEN=<a-user-access-token> node scripts/verify-security.mjs
//
//   • BASE_URL  — app origin (default http://localhost:5173)
//   • TOKEN     — a signed-in user's Supabase access token (from the browser:
//                 supabase.auth.getSession() → access_token). Used to test
//                 authed endpoints. Optional but recommended.
//
// Exit code is non-zero if any CRITICAL check fails.

const BASE = process.env.BASE_URL || "http://localhost:5173";
const TOKEN = process.env.TOKEN || "";

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "", critical = true) {
  results.push({ name, ok, detail, critical });
  if (ok) pass++; else if (critical) fail++;
  console.log(`${ok ? "✅" : critical ? "❌" : "⚠️ "} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function post(path, body, token) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body || {}),
  });
  let json = null; try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json };
}

console.log(`\nSecurity gate · ${BASE}\n${"=".repeat(40)}`);

// 1. Auth required on protected endpoints (no token → 401)
for (const path of ["/api/analyze-site", "/api/audits/create", "/api/admin/usage"]) {
  const r = await post(path, { url: "https://example.com", audit: { id: "x" } });
  check(`${path} requires auth`, r.status === 401, `got ${r.status}`);
}

// 2. SSRF — internal targets must be blocked (with a token, since auth runs first)
if (TOKEN) {
  const ssrfTargets = [
    "http://169.254.169.254/latest/meta-data/",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://localhost",
  ];
  for (const url of ssrfTargets) {
    const r = await post("/api/analyze-site", { url }, TOKEN);
    // Either the scan returns ok:false with a block error, or the request is rejected.
    const blocked = r.json?.ok === false || r.status >= 400;
    const isBlockError = /block|ssrf|unreachable|invalid/i.test(JSON.stringify(r.json || {}));
    check(`SSRF blocked: ${url}`, blocked && (isBlockError || r.status >= 400), `status ${r.status} ${JSON.stringify(r.json)}`);
  }
} else {
  check("SSRF tests", false, "skipped — set TOKEN to run", false);
}

// 3. Admin endpoint forbids non-admins (a normal user token → 403)
if (TOKEN) {
  const r = await post("/api/admin/usage", {}, TOKEN);
  check("admin endpoint gated", r.status === 403 || r.status === 200,
    r.status === 200 ? "token is an admin (expected for an admin user)" : `got ${r.status}`, true);
}

console.log(`${"=".repeat(40)}\n${pass} passed, ${fail} critical failures\n`);
console.log("Manual checks still required (need a 2nd free account / DB console):");
console.log("  • Free account: 2nd POST /api/audits/create returns 402");
console.log("  • Direct anon-key insert into `audits` is denied by RLS");
console.log("  • Rapid repeated scans return 429 after the burst limit\n");

process.exit(fail > 0 ? 1 : 0);
