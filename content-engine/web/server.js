// web/server.js — minimal, zero-dependency local approval UI.
// Lists submissions, shows generated captions, and exposes approve / reject /
// posted / generate actions. Built on Node's http module (no Express).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CONFIG } from "../src/env.js";
import { listSubmissions, getSubmission, setStatus, generateFor } from "../src/actions.js";
import { isImage } from "../src/image.js";
import { getProfile } from "../profiles/index.js";
import { getCalendar, autoSchedule, reorderSchedule } from "../src/schedule.js";
import { collectStatus } from "../src/setup.js";

const PROFILE = getProfile(CONFIG.profileId);

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

const STATUS_TABS = ["pending", "approved", "posted", "rejected", "all"];

function page(body, activeStatus, view = "queue") {
  const tabs =
    STATUS_TABS.map((s) => `<a class="tab ${view === "queue" && s === activeStatus ? "on" : ""}" href="/?status=${s}">${s}</a>`).join("") +
    `<a class="tab ${view === "calendar" ? "on" : ""}" href="/calendar">📅 calendar</a>` +
    `<a class="tab ${view === "setup" ? "on" : ""}" href="/setup">⚙️ setup</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${PROFILE.name} · Preset & Profit Content OS</title>
<style>
:root{--bg:#0b0d10;--card:#15191e;--line:#262c34;--txt:#e7ebf0;--dim:#8b94a3;--accent:#d11f2a;--green:#2ec27e;--yellow:#e3b341;--cyan:#3aa7c0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif}
header{padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:16px;position:sticky;top:0;background:var(--bg);z-index:5}
header h1{font-size:17px;margin:0;letter-spacing:.5px}header .sub{color:var(--dim);font-size:13px}
.tabs{display:flex;gap:6px;margin-left:auto}.tab{color:var(--dim);text-decoration:none;padding:6px 12px;border-radius:7px;border:1px solid transparent;text-transform:capitalize;font-size:13px}
.tab.on{color:var(--txt);border-color:var(--line);background:var(--card)}
main{max-width:1100px;margin:0 auto;padding:24px;display:grid;gap:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:grid;grid-template-columns:220px 1fr;scroll-margin-top:90px}
.card.sel{outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 0 4px rgba(209,31,42,.12)}
.card .ph{background:#0e1216;display:flex;align-items:center;justify-content:center;min-height:200px}
.card .ph a{display:block;width:100%;height:100%}
.card img{width:100%;height:100%;max-height:340px;object-fit:cover;display:block;background:#0e1216}
.card .noimg{color:var(--dim);font-size:13px;padding:20px;text-align:center}
.body{padding:16px 18px;display:grid;gap:10px;min-width:0}
.row1{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.user{font-weight:600}.pill{font-size:11px;padding:3px 9px;border-radius:20px;border:1px solid var(--line);color:var(--dim);text-transform:uppercase;letter-spacing:.4px}
.pill.pending{color:var(--yellow);border-color:var(--yellow)}.pill.approved{color:var(--green);border-color:var(--green)}
.pill.posted{color:var(--cyan);border-color:var(--cyan)}.pill.rejected{color:var(--dim)}
.id{color:var(--dim);font-size:12px;margin-left:auto;font-family:ui-monospace,monospace}
.cap{background:#0e1216;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
.cap label{display:block;color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.cap .txt{white-space:pre-wrap;word-break:break-word}.tags{color:var(--cyan);font-size:13px}
.empty{color:var(--dim);text-align:center;padding:60px}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
button{font:inherit;cursor:pointer;border:1px solid var(--line);background:#1b2128;color:var(--txt);padding:8px 14px;border-radius:8px}
button:hover{border-color:#3a434f}button.go{border-color:var(--green);color:var(--green)}button.no{border-color:var(--accent);color:#ff6b73}
button.post{border-color:var(--cyan);color:var(--cyan)}button.gen{border-color:var(--yellow);color:var(--yellow)}
form{display:inline}.meta{color:var(--dim);font-size:12px}
.copy{cursor:pointer;float:right;color:var(--dim);font-size:11px;border:1px solid var(--line);border-radius:6px;padding:1px 7px}
.keys{margin-left:auto;color:var(--dim);font-size:11px}.keys b{color:var(--txt);font-weight:600}.keys kbd{background:#1b2128;border:1px solid var(--line);border-radius:4px;padding:1px 5px;font-family:ui-monospace,monospace}
/* calendar */
.calbar{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}
.cal{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.day{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px;min-height:90px}
.day h3{margin:0 0 8px;font-size:13px;color:var(--txt);font-weight:600}.day .open{color:var(--dim);font-size:12px}
.ev{background:#0e1216;border:1px solid var(--line);border-radius:8px;padding:8px;margin-bottom:8px;cursor:grab;display:flex;gap:8px;align-items:center}
.ev.drag{opacity:.4}.day.over{border-color:var(--accent)}
.ev img{width:38px;height:38px;object-fit:cover;border-radius:6px;background:#0e1216;flex:none}
.ev .evb{min-width:0}.ev .evt{font-size:11px;color:var(--cyan)}.ev .evu{font-weight:600;font-size:13px}
.ev .evc{color:var(--dim);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev .done{margin-left:auto;border:1px solid var(--line);border-radius:6px;color:var(--cyan);font-size:11px;padding:2px 6px;cursor:pointer;background:none;flex:none}
</style></head><body>
<header><h1>🏁 ${PROFILE.name}</h1><span class="sub">Preset &amp; Profit Content OS · ${esc(PROFILE.niche)}</span>
<span class="keys"><kbd>A</kbd> approve · <kbd>R</kbd> reject · <kbd>P</kbd> posted · <kbd>↑↓</kbd> move</span>
<nav class="tabs">${tabs}</nav></header>
<main>${body}</main>
<script>
function copy(btn){const t=btn.parentElement.querySelector('.txt,.tags');navigator.clipboard.writeText(t.innerText);btn.textContent='copied';setTimeout(()=>btn.textContent='copy',1200);}
(function(){
  const cards=[...document.querySelectorAll('.card')];
  let sel=0;
  function select(i){if(!cards.length)return;sel=Math.max(0,Math.min(cards.length-1,i));cards.forEach((c,j)=>c.classList.toggle('sel',j===sel));cards[sel].scrollIntoView({block:'center',behavior:'smooth'});}
  function act(status){const c=cards[sel];if(!c)return;const f=c.querySelector('form[data-status="'+status+'"]');if(f)f.requestSubmit();}
  document.addEventListener('keydown',function(e){
    if(/^(input|textarea|select)$/i.test(e.target.tagName))return;
    var k=e.key.toLowerCase();
    if(k==='arrowdown'||k==='arrowright'){e.preventDefault();select(sel+1);}
    else if(k==='arrowup'||k==='arrowleft'){e.preventDefault();select(sel-1);}
    else if(k==='a'){e.preventDefault();act('approved');}
    else if(k==='r'){e.preventDefault();act('rejected');}
    else if(k==='p'){e.preventDefault();act('posted');}
  });
  if(cards.length)select(0);
})();
function markPosted(id){
  fetch('/action',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'id='+encodeURIComponent(id)+'&status=posted&back=calendar'}).then(()=>location.reload());
}
(function(){ // calendar drag-and-drop reorder
  var cal=document.getElementById('cal'); if(!cal)return;
  var dragged=null;
  document.querySelectorAll('.ev').forEach(function(ev){
    ev.addEventListener('dragstart',function(){dragged=ev;ev.classList.add('drag');});
    ev.addEventListener('dragend',function(){ev.classList.remove('drag');});
  });
  document.querySelectorAll('.day').forEach(function(day){
    day.addEventListener('dragover',function(e){e.preventDefault();day.classList.add('over');
      var after=null,evs=[].slice.call(day.querySelectorAll('.ev:not(.drag)'));
      for(var i=0;i<evs.length;i++){var b=evs[i].getBoundingClientRect();if(e.clientY < b.top+b.height/2){after=evs[i];break;}}
      var open=day.querySelector('.open'); if(open)open.remove();
      if(after)day.insertBefore(dragged,after); else day.appendChild(dragged);
    });
    day.addEventListener('dragleave',function(){day.classList.remove('over');});
    day.addEventListener('drop',function(e){e.preventDefault();day.classList.remove('over');
      var ids=[].slice.call(document.querySelectorAll('.ev')).map(function(x){return x.getAttribute('data-id');});
      fetch('/schedule/reorder',{method:'POST',headers:{'content-type':'text/plain'},body:ids.join(',')}).then(()=>location.reload());
    });
  });
})();
</script></body></html>`;
}

function captionBlock(label, value, cls = "txt") {
  if (!value) return "";
  return `<div class="cap"><span class="copy" onclick="copy(this)">copy</span><label>${label}</label><div class="${cls}">${esc(value)}</div></div>`;
}

function card(r) {
  const mediaSrc = `/media/${encodeURIComponent(r.submission_id)}`;
  const img = r.local_image_path
    ? `<a href="${mediaSrc}" target="_blank" title="Open full size"><img src="${mediaSrc}" loading="lazy" decoding="async" alt="${esc(r.car_model || "submission")}" onerror="this.parentElement.innerHTML='&lt;div class=\\'noimg\\'&gt;Image unavailable&lt;/div&gt;'"></a>`
    : r.media_url
      ? `<div class="noimg">No local image.<br><a style="color:var(--cyan)" href="${esc(r.media_url)}" target="_blank">open media url ↗</a></div>`
      : `<div class="noimg">No image</div>`;

  const car = [r.color, r.car_model].filter(Boolean).join(" ") || PROFILE.niche;
  const generated = r.generated_instagram_caption;

  const actionFor = (status, cls, label) =>
    `<form method="post" action="/action" data-status="${status}"><input type="hidden" name="id" value="${esc(r.submission_id)}"><input type="hidden" name="status" value="${status}"><input type="hidden" name="back" value="${esc(r._status)}"><button class="${cls}">${label}</button></form>`;
  const genBtn = `<form method="post" action="/generate"><input type="hidden" name="id" value="${esc(r.submission_id)}"><input type="hidden" name="back" value="${esc(r._status)}"><button class="gen">⟳ ${generated ? "Regenerate" : "Generate"} captions</button></form>`;

  return `<div class="card">
  <div class="ph">${img}</div>
  <div class="body">
    <div class="row1">
      <span class="user">@${esc(r.instagram_username || "unknown")}</span>
      <span class="pill ${r.approval_status}">${r.approval_status}</span>
      <span class="pill">${esc(r.source)}</span>
      <span class="id">${esc(r.submission_id)}</span>
    </div>
    <div class="meta">${esc(car)}${r.mods ? " · " + esc(r.mods) : ""}</div>
    ${generated ? "" : '<div class="meta">No captions yet — generate to review.</div>'}
    ${captionBlock("Instagram", r.generated_instagram_caption)}
    ${captionBlock("Story", r.generated_story_caption)}
    ${captionBlock("Facebook", r.generated_facebook_caption)}
    ${captionBlock("Engagement", r.generated_engagement_question)}
    ${captionBlock("Hashtags", r.generated_hashtags, "tags")}
    ${captionBlock("Credit", r.credit_block)}
    <div class="actions">
      ${genBtn}
      ${actionFor("approved", "go", "✓ Approve")}
      ${actionFor("rejected", "no", "✕ Reject")}
      ${actionFor("posted", "post", "↑ Mark posted")}
    </div>
  </div></div>`;
}

// --- Calendar view (Phase 3) ---
function eventCard(r) {
  const time = new Date(r.scheduled_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const img = r.local_image_path ? `<img src="/media/${encodeURIComponent(r.submission_id)}" loading="lazy" alt="">` : "";
  const cap = esc((r.generated_instagram_caption || "").slice(0, 70));
  const posted = r.approval_status === "posted";
  return `<div class="ev" draggable="true" data-id="${esc(r.submission_id)}">
    ${img}
    <div class="evb"><div class="evt">${time}${posted ? " · posted" : ""}</div><div class="evu">@${esc(r.instagram_username || "?")}</div><div class="evc">${cap}</div></div>
    ${posted ? "" : `<button class="done" onclick="markPosted('${esc(r.submission_id)}')">posted</button>`}
  </div>`;
}

function calendarView(data) {
  const dayCol = (day) => {
    const label = new Date(day.day + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    return `<div class="day" data-day="${day.day}"><h3>${label}</h3>${day.items.length ? day.items.map(eventCard).join("") : '<div class="open">— open —</div>'}</div>`;
  };
  const overflow = data.overflow.length
    ? `<h2 class="meta" style="margin:22px 0 8px">Scheduled later</h2><div class="cal">${data.overflow.map(dayCol).join("")}</div>`
    : "";
  const scheduledCount = data.window.reduce((n, d) => n + d.items.length, 0) + data.overflow.reduce((n, d) => n + d.items.length, 0);
  return `
  <div class="calbar">
    <form method="post" action="/schedule/auto"><button class="go">⚡ Auto-schedule approved</button></form>
    <form method="post" action="/schedule/auto"><input type="hidden" name="reschedule" value="1"><button>↺ Reschedule all</button></form>
    <span class="meta">${scheduledCount} item(s) scheduled · drag to reorder</span>
  </div>
  <div class="cal" id="cal">${data.window.map(dayCol).join("")}</div>
  ${overflow}`;
}

// --- Setup / connections view ---
function setupView(s) {
  const dot = (ok) => `<span style="color:${ok ? "var(--green)" : "var(--dim)"};font-weight:600">${ok ? "● connected" : "○ not set"}</span>`;
  const row = (label, ok, detail = "") =>
    `<div class="cap" style="display:flex;align-items:center;gap:12px"><div style="flex:1"><label>${esc(label)}</label><div class="txt">${detail ? esc(detail) : ""}</div></div><div>${dot(ok)}</div></div>`;

  const fileLink = (p, text) => `<a style="color:var(--cyan)" href="${pathToFileURL(p).href}" target="_blank">${esc(text)}</a>`;

  const aiDetail = [s.ai.anthropic ? "Anthropic/Claude" : "", s.ai.openai ? "OpenAI" : ""].filter(Boolean).join(" + ") || "template captions (no key)";
  const sheetsDetail = s.sheets.connected ? `id ${s.sheets.sheetId.slice(0, 10)}… · tab ${s.sheets.tab}` : s.sheets.mode ? "mode selected — credentials missing" : "not in use";
  const igDetail = s.instagram.connected
    ? `@${s.instagram.handle || "?"} · token + business id set`
    : s.instagram.mode
      ? "mode selected — token/business id missing"
      : s.instagram.handle
        ? `@${s.instagram.handle} (manual import only)`
        : "not in use";

  const missing = s.missing.length
    ? `<div class="cap"><label>Missing / optional</label><div class="txt">${s.missing.map((m) => "· " + esc(m)).join("<br>")}</div></div>`
    : `<div class="cap"><label>Missing</label><div class="txt" style="color:var(--green)">Nothing required — you're good to go.</div></div>`;

  return `<div class="card" style="grid-template-columns:1fr">
    <div class="body">
      <div class="row1">
        <span class="user">⚙️ Setup &amp; connections</span>
        <span class="pill ${s.appRunning ? "approved" : "pending"}">app ${s.appRunning ? "running" : "starting"}</span>
        <span class="pill">mode: ${esc(s.mode)}</span>
        <span class="pill">${esc(s.profile.id)}</span>
      </div>
      <div class="meta">Profile: ${esc(s.profile.name)} · ${esc(s.profile.niche)} — storage: ${esc(s.storage)}</div>
      ${row("App running", s.appRunning, s.appRunning ? `http://localhost:${s.port}` : "start with: node cli.js web")}
      ${row("AI key", s.ai.connected, aiDetail)}
      ${row("Google Sheets", s.sheets.connected, sheetsDetail)}
      ${row("Instagram", s.instagram.connected, igDetail)}
      ${missing}
      <div class="cap" style="border-color:var(--accent)">
        <label>Next step</label>
        <div class="txt">${esc(s.nextStep)}</div>
      </div>
      <div class="cap">
        <label>Quick links</label>
        <div class="txt">
          📥 Inbox folder: ${fileLink(s.paths.inbox, s.paths.inbox)}<br>
          📦 Exports folder: ${fileLink(s.paths.exports, s.paths.exports)}<br>
          📝 Edit config: <code>${esc(s.paths.env)}</code> &nbsp;·&nbsp; run <code>node cli.js setup</code> to fill it in<br>
          📸 No API yet? Import a post by hand: <code>node cli.js intake-manual</code><br>
          📖 Instagram connection guide: <code>INSTAGRAM_SETUP.md</code>
        </div>
      </div>
    </div>
  </div>`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
  });
}
function readForm(req) {
  return readBody(req).then((d) => new URLSearchParams(d));
}

export async function startWebServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${CONFIG.port}`);

      // Serve a local image by submission id.
      if (req.method === "GET" && url.pathname.startsWith("/media/")) {
        const id = decodeURIComponent(url.pathname.slice("/media/".length));
        const rec = await getSubmission(id);
        if (rec?.local_image_path && isImage(rec.local_image_path) && fs.existsSync(rec.local_image_path)) {
          const ext = path.extname(rec.local_image_path).slice(1).toLowerCase();
          res.writeHead(200, {
            "content-type": `image/${ext === "jpg" ? "jpeg" : ext === "heic" || ext === "heif" ? "jpeg" : ext}`,
            "cache-control": "public, max-age=300",
          });
          return fs.createReadStream(rec.local_image_path).pipe(res);
        }
        res.writeHead(404).end("no image");
        return;
      }

      if (req.method === "POST" && url.pathname === "/action") {
        const form = await readForm(req);
        await setStatus(form.get("id"), form.get("status"));
        const back = form.get("back");
        const location = back === "calendar" ? "/calendar" : `/?status=${back || "pending"}`;
        res.writeHead(303, { location }).end();
        return;
      }

      if (req.method === "POST" && url.pathname === "/generate") {
        const form = await readForm(req);
        await generateFor(form.get("id"), { force: true });
        res.writeHead(303, { location: `/?status=${form.get("back") || "pending"}` }).end();
        return;
      }

      // --- Setup / connections ---
      if (req.method === "GET" && url.pathname === "/setup") {
        const status = await collectStatus();
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(setupView(status), null, "setup"));
        return;
      }

      // --- Calendar (Phase 3) ---
      if (req.method === "GET" && url.pathname === "/calendar") {
        const days = Number(url.searchParams.get("days")) || 7;
        const data = await getCalendar({ days });
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(calendarView(data), null, "calendar"));
        return;
      }
      if (req.method === "POST" && url.pathname === "/schedule/auto") {
        const form = await readForm(req);
        await autoSchedule({ reschedule: form.get("reschedule") === "1" });
        res.writeHead(303, { location: "/calendar" }).end();
        return;
      }
      if (req.method === "POST" && url.pathname === "/schedule/reorder") {
        const ids = (await readBody(req)).split(",").map((s) => s.trim()).filter(Boolean);
        await reorderSchedule(ids);
        res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
        return;
      }

      // Main list view — approval queue in drop order (oldest first).
      const status = url.searchParams.get("status") || "pending";
      const rows = await listSubmissions(status === "all" ? undefined : status, { order: "asc" });
      rows.forEach((r) => (r._status = status));
      const body = rows.length
        ? rows.map(card).join("")
        : `<div class="empty">No ${status === "all" ? "" : status + " "}submissions.<br><span class="meta">Add some with <code>node cli.js intake-folder</code> or <code>intake-url</code>.</span></div>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(body, status, "queue"));
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain" }).end(`Error: ${e.message}`);
    }
  });

  await new Promise((resolve) => server.listen(CONFIG.port, resolve));
  const store = (await import("../src/store.js")).getStore;
  const kind = (await store()).kind;
  console.log(`\n🏁 Preset & Profit Content OS — ${PROFILE.name}`);
  console.log(`   http://localhost:${CONFIG.port}   (storage: ${kind} · profile: ${PROFILE.id})`);
  console.log(`   Approval queue + content calendar. Ctrl+C to stop.\n`);
}
