#!/usr/bin/env node
// cli.js — Preset & Profit Content OS command line (multi-profile).
// Run `node cli.js help` for the full command list.
import { PATHS, CONFIG } from "./src/env.js";
import { getStore } from "./src/store.js";
import { getProfile, hasProfile, listProfiles } from "./profiles/index.js";
import { intakeFromUrl, intakeFolder } from "./src/intake.js";
import {
  listSubmissions,
  getSubmission,
  generateFor,
  generatePending,
  setStatus,
  exportApproved,
  runBatch,
  ensureVision,
} from "./src/actions.js";
import { exportPack, exportCsv, exportJsonAll } from "./src/contentPack.js";
import { pull as pullSources, listAdapters } from "./src/sources/index.js";
import { autoSchedule, getCalendar, scheduledQueue } from "./src/schedule.js";
import { startWebServer } from "./web/server.js";
import { runSetup, runIntakeManual, collectStatus } from "./src/setup.js";

// ---- tiny arg parser: positionals + --flags (--k v or --k=v or boolean) ----
function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inlineV] = a.slice(2).split("=");
      if (inlineV !== undefined) flags[k] = inlineV;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[k] = argv[++i];
      else flags[k] = true;
    } else pos.push(a);
  }
  return { pos, flags };
}

const COLORS = { dim: "\x1b[2m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", reset: "\x1b[0m", bold: "\x1b[1m" };
const c = (col, s) => `${COLORS[col]}${s}${COLORS.reset}`;

function printRow(r) {
  const gen = r.generated_instagram_caption ? c("green", "✓gen") : c("dim", "·gen");
  const statusColor = { pending: "yellow", approved: "green", rejected: "dim", posted: "cyan" }[r.approval_status] || "reset";
  const car = [r.color, r.car_model].filter(Boolean).join(" ") || "Audi A4 B7";
  console.log(
    `${c("bold", r.submission_id)}  ${c(statusColor, r.approval_status.padEnd(8))} ${gen}  ` +
      `@${r.instagram_username || "?"}  ${c("dim", r.source)}  ${car}`,
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, flags } = parseArgs(rest);

  // Per-run profile override (otherwise CONTENT_PROFILE / default b7squad).
  if (flags.profile) {
    if (!hasProfile(flags.profile)) return fail(`Unknown profile "${flags.profile}". Run: node cli.js profiles`);
    CONFIG.profileId = flags.profile;
  }

  switch (cmd) {
    case "intake-url": {
      const url = pos[0] || flags.url;
      if (!url) return fail("Usage: intake-url <media_url> [--user name] [--source tagged_post|dm] [--caption ..] [--car ..] [--color ..] [--mods ..]");
      const rec = await intakeFromUrl({
        url,
        username: flags.user,
        source: flags.source,
        caption: flags.caption,
        car_model: flags.car,
        color: flags.color,
        mods: flags.mods,
        subject: flags.subject,
        descriptor: flags.descriptor,
        details: flags.details,
      });
      console.log(c("green", "✓ intake (pending):"));
      printRow(rec);
      hint(`Generate captions:  node cli.js generate ${rec.submission_id}`);
      break;
    }

    case "batch": {
      const folder = pos[0] || flags.folder || PATHS.inbox;
      console.log(c("dim", `Batch: ingesting + generating from ${folder} …`));
      const { ingested, generated } = await runBatch(folder, { source: flags.source || "upload" });
      if (!ingested.length) {
        console.log(c("dim", "No new images found. Drop photos into inbox/ and re-run."));
      } else {
        console.log(c("green", `✓ ${ingested.length} ingested · ${generated.length} captioned · all queued as pending (drop order preserved).`));
        ingested.forEach((r, i) => console.log(`  ${c("dim", String(i + 1).padStart(2, "0"))}  ${c("bold", r.submission_id)}  @${r.instagram_username || "?"}  ${[r.color, r.car_model].filter(Boolean).join(" ")}`));
        hint("Review the queue:  node cli.js web   (then press A / R / P)");
      }
      break;
    }

    case "intake-folder": {
      const folder = pos[0] || flags.folder || PATHS.inbox;
      const created = await intakeFolder(folder, { source: flags.source || "upload" });
      if (!created.length) {
        console.log(c("dim", `No new images in ${folder} (drop photos there and re-run).`));
      } else {
        console.log(c("green", `✓ ${created.length} new submission(s):`));
        created.forEach(printRow);
        hint("Generate captions for all pending:  node cli.js generate all-pending");
      }
      break;
    }

    case "sources": {
      console.log(c("dim", "Intake adapters (all feed the same submission queue):\n"));
      for (const a of listAdapters()) console.log(`  ${c("bold", a.id.padEnd(9))} ${a.label}  ${c("dim", "→ source: " + a.source)}`);
      hint("Pull everything:  node cli.js intake-pull --source all");
      break;
    }

    case "intake-pull": {
      const source = flags.source || "all";
      const { created, duplicates } = await pullSources(source, { url: flags.url, folder: flags.folder });
      console.log(c("green", `✓ pulled ${created.length} new submission(s) from "${source}"${duplicates ? c("dim", ` (${duplicates} duplicate(s) skipped)`) : ""}.`));
      created.forEach((r) => console.log(`  ${c("dim", r._source_adapter)}  ${c("bold", r.submission_id)}  @${r.instagram_username || "?"}  ${[r.color, r.car_model].filter(Boolean).join(" ")}`));
      if (created.length) hint("Generate captions:  node cli.js generate all-pending");
      break;
    }

    case "vision": {
      const target = pos[0];
      if (!target || target === "all") {
        const rows = (await listSubmissions(undefined, { order: "asc" })).filter((r) => r.local_image_path);
        let n = 0;
        for (const r of rows) {
          if (r.vision_json && !flags.force) continue;
          const updated = await ensureVision(r.submission_id, { force: Boolean(flags.force) });
          console.log(`  ${c("bold", updated.submission_id)}  ${c("dim", updated.vision_summary)}`);
          n++;
        }
        console.log(c("green", `✓ vision analyzed ${n} record(s).`));
      } else {
        const updated = await ensureVision(target, { force: true });
        console.log(c("green", `✓ ${target}:`));
        console.log("  " + updated.vision_summary);
      }
      break;
    }

    case "generate": {
      const target = pos[0];
      if (target === "all-pending" || !target) {
        const results = await generatePending({ force: Boolean(flags.force) });
        console.log(c("green", `✓ generated for ${results.length} submission(s).`));
        for (const { rec } of results) previewCaptions(rec);
      } else {
        const { rec, skipped } = await generateFor(target, { force: Boolean(flags.force) });
        if (skipped) console.log(c("yellow", "· already generated (use --force to redo)."));
        else console.log(c("green", "✓ generated:"));
        previewCaptions(rec);
      }
      break;
    }

    case "list": {
      const rows = await listSubmissions(flags.status);
      if (!rows.length) return console.log(c("dim", "No submissions yet."));
      console.log(c("dim", `${rows.length} submission(s)${flags.status ? ` · ${flags.status}` : ""}:\n`));
      rows.forEach(printRow);
      break;
    }

    case "show": {
      const rec = await getSubmission(pos[0]);
      if (!rec) return fail(`No submission ${pos[0]}`);
      console.log(JSON.stringify(rec, null, 2));
      break;
    }

    case "approve":
    case "reject":
    case "posted": {
      const id = pos[0];
      if (!id) return fail(`Usage: ${cmd} <submission_id>`);
      const statusMap = { approve: "approved", reject: "rejected", posted: "posted" };
      const rec = await setStatus(id, statusMap[cmd]);
      console.log(c("green", `✓ ${id} → ${rec.approval_status}`));
      if (cmd === "approve") hint(`Content pack written to exports/${id}/`);
      break;
    }

    case "export": {
      const target = pos[0] || "all-approved";
      const format = (flags.format || "md").toLowerCase(); // md | json | csv | all
      // Resolve the record set.
      let records;
      if (target === "all-approved") records = await listSubmissions("approved", { order: "asc" });
      else if (target === "all") records = await listSubmissions(undefined, { order: "asc" });
      else {
        const rec = await getSubmission(target);
        if (!rec) return fail(`No submission ${target}`);
        records = [rec];
      }
      if (!records.length) return console.log(c("dim", "Nothing to export."));

      const wantMd = format === "md" || format === "all";
      const wantJson = format === "json" || format === "all";
      const wantCsv = format === "csv" || format === "all";

      if (wantMd) {
        for (const r of records) await exportPack(r);
        console.log(c("green", `✓ ${records.length} markdown pack(s) → exports/<id>/post.md`));
      }
      if (wantJson) {
        const out = await exportJsonAll(records);
        console.log(c("green", `✓ JSON → ${out}`));
      }
      if (wantCsv) {
        const out = await exportCsv(records);
        console.log(c("green", `✓ CSV → ${out}`));
      }
      break;
    }

    case "schedule": {
      const updated = await autoSchedule({
        startDate: flags.start,
        time: flags.time,
        perDay: flags["per-day"] ? Number(flags["per-day"]) : undefined,
        reschedule: Boolean(flags.reschedule),
      });
      if (!updated.length) return console.log(c("dim", "Nothing to schedule (approve content first, or all approved items are already scheduled)."));
      console.log(c("green", `✓ scheduled ${updated.length} item(s):`));
      for (const r of updated) console.log(`  ${c("cyan", new Date(r.scheduled_date).toLocaleString())}  ${c("bold", r.submission_id)}  @${r.instagram_username || "?"}`);
      hint("View the calendar:  node cli.js calendar   (or the Calendar tab in the web UI)");
      break;
    }

    case "calendar": {
      const days = flags.days ? Number(flags.days) : 7;
      const { window: win, overflow } = await getCalendar({ days });
      const fmt = (r) => `    ${c("cyan", new Date(r.scheduled_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}  @${r.instagram_username || "?"}  ${c("dim", (r.generated_instagram_caption || "").slice(0, 60))}`;
      console.log(c("dim", `Content calendar — next ${days} day(s):\n`));
      for (const day of win) {
        const label = new Date(day.day + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        console.log(`  ${c("bold", label)}  ${day.items.length ? "" : c("dim", "— open —")}`);
        day.items.forEach((r) => console.log(fmt(r)));
      }
      if (overflow.length) {
        console.log(c("dim", `\n  Scheduled beyond the window:`));
        for (const o of overflow) o.items.forEach((r) => console.log(fmt(r)));
      }
      const total = (await scheduledQueue()).filter((r) => r.scheduled_date).length;
      console.log(c("dim", `\n  ${total} item(s) scheduled total.`));
      break;
    }

    case "setup": {
      await runSetup();
      break;
    }

    case "intake-manual": {
      await runIntakeManual();
      break;
    }

    case "setup-status": {
      const s = await collectStatus();
      const yes = c("green", "● connected");
      const no = c("dim", "○ not set");
      const onoff = (b) => (b ? yes : no);
      console.log(`\n${c("bold", "Preset & Profit — setup status")}\n`);
      console.log(`  App running        ${s.appRunning ? c("green", `● yes — http://localhost:${s.port}`) : c("dim", `○ no (start it: node cli.js web)`)}`);
      console.log(`  Active profile     ${c("cyan", s.profile.id)}  ${c("dim", `(${s.profile.name} · ${s.profile.niche})`)}`);
      console.log(`  Mode               ${c("cyan", s.mode)}   ${c("dim", `storage: ${s.storage}`)}`);
      console.log(`  AI key             ${onoff(s.ai.connected)}  ${c("dim", `${s.ai.anthropic ? "anthropic " : ""}${s.ai.openai ? "openai" : ""}`.trim() || "template captions")}`);
      console.log(`  Google Sheets      ${onoff(s.sheets.connected)}  ${c("dim", s.sheets.sheetId ? `id ${s.sheets.sheetId.slice(0, 8)}… · ${s.sheets.tab}` : "")}`);
      console.log(`  Instagram          ${onoff(s.instagram.connected)}  ${c("dim", s.instagram.handle ? `@${s.instagram.handle}` : "")}`);
      console.log(`  Inbox folder       ${c("dim", s.paths.inbox)}`);
      console.log(`  Exports folder     ${c("dim", s.paths.exports)}`);
      if (s.missing.length) {
        console.log(`\n  ${c("yellow", "Missing / optional:")}`);
        s.missing.forEach((m) => console.log(`    ${c("dim", "·")} ${m}`));
      }
      console.log(`\n  ${c("bold", "Next step:")} ${s.nextStep}\n`);
      break;
    }

    case "setup-sheet": {
      const store = await getStore();
      if (store.kind !== "google-sheets") {
        return fail("Google Sheets not configured. Set GSHEET_CONTENT_ID + service-account creds in .env, then re-run.");
      }
      const header = await store.ensureHeader();
      console.log(c("green", `✓ Sheet "${store.tab}" ready with ${header.length} columns.`));
      break;
    }

    case "web": {
      await startWebServer();
      break;
    }

    case "profiles": {
      const active = CONFIG.profileId;
      console.log(c("dim", "Available brand profiles (set with --profile <id> or CONTENT_PROFILE in .env):\n"));
      for (const p of listProfiles()) {
        const mark = p.id === active ? c("green", "● active") : c("dim", "○");
        console.log(`  ${mark}  ${c("bold", p.id.padEnd(11))} ${p.name}  ${c("dim", "· " + p.niche)}`);
      }
      break;
    }

    case "status": {
      const store = await getStore();
      const rows = await store.list();
      const by = (s) => rows.filter((r) => r.approval_status === s).length;
      const profile = getProfile(CONFIG.profileId);
      console.log(`Profile:   ${c("cyan", profile.id)}  (${profile.name} · ${profile.niche})`);
      console.log(`Storage:   ${c("cyan", store.kind)}${store.kind === "google-sheets" ? ` (${store.tab})` : ` (${PATHS.dbFile})`}`);
      console.log(`Total:     ${rows.length}`);
      console.log(`Pending:   ${c("yellow", by("pending"))}   Approved: ${c("green", by("approved"))}   Posted: ${c("cyan", by("posted"))}   Rejected: ${c("dim", by("rejected"))}`);
      break;
    }

    case "help":
    case undefined:
      help();
      break;

    default:
      fail(`Unknown command: ${cmd}`);
      help();
  }
}

function previewCaptions(rec) {
  console.log(`\n  ${c("bold", rec.submission_id)} @${rec.instagram_username || "?"}`);
  console.log(`  ${c("dim", "IG:")} ${rec.generated_instagram_caption}`);
  console.log(`  ${c("dim", "Story:")} ${rec.generated_story_caption}`);
  console.log(`  ${c("dim", "Q:")} ${rec.generated_engagement_question}`);
  console.log(`  ${c("dim", "Tags:")} ${rec.generated_hashtags}\n`);
}

function hint(s) {
  console.log(c("dim", `  → ${s}`));
}
function fail(msg) {
  console.error(c("yellow", `✗ ${msg}`));
  process.exitCode = 1;
}

function help() {
  console.log(`
${c("bold", "Preset & Profit — Content Operating System")} ${c("dim", `· active profile: ${CONFIG.profileId}`)}

  ${c("cyan", "Setup")} ${c("dim", "(connect accounts, or just run locally)")}
    node cli.js setup                          Guided wizard — brand, IG handle, mode, keys → writes .env
    node cli.js setup-status                   What's connected: app, profile, AI, Sheets, Instagram, folders
    node cli.js setup-sheet                    Create/repair the header row in the configured Google Sheet

  ${c("cyan", "Profiles")} ${c("dim", "(add --profile <id> to any command, or set CONTENT_PROFILE in .env)")}
    node cli.js profiles                      List brand profiles (b7squad is the default)

  ${c("cyan", "Intake")} ${c("dim", "(adapters: folder · url · tagged · mentions · dm — all feed one queue)")}
    node cli.js sources                        List intake adapters
    node cli.js intake-pull [--source all|folder|url|tagged|mentions|dm] [--url ..]
    node cli.js intake-url <url> [--user n] [--car ..] [--color ..] [--mods ..]   (or --subject/--descriptor/--details)
    node cli.js intake-manual                  Import one IG post by hand (no API) — asks user, source, caption, image
    node cli.js intake-folder [folder]        Scan inbox/ for dropped photos (+ optional <img>.json sidecars)
    node cli.js batch [folder]                One shot: ingest + vision + generate + queue all (order preserved)

  ${c("cyan", "Vision & captions")}
    node cli.js vision [id|all] [--force]     Run image analysis (color, wheels, stance, lighting, environment…)
    node cli.js generate <id|all-pending>     Vision-aware content set (auto-runs vision if missing)

  ${c("cyan", "Review & approve")}
    node cli.js list [--status pending]       List submissions
    node cli.js show <id>                      Full record as JSON
    node cli.js approve <id>                   → approved (auto-generates + exports a pack)
    node cli.js reject <id>    posted <id>     → rejected / posted
    node cli.js web                            Local approval UI + content calendar

  ${c("cyan", "Content calendar")} ${c("dim", "(Approve → Schedule → Post Queue)")}
    node cli.js schedule [--per-day N] [--time HH:MM] [--start YYYY-MM-DD] [--reschedule]
    node cli.js calendar [--days N]            Daily/weekly view of the post queue

  ${c("cyan", "Export & ops")}
    node cli.js export <id|all-approved|all> [--format md|json|csv|all]
    node cli.js status                         Active profile + storage + counts
`);
}

main().catch((e) => {
  console.error(c("yellow", `✗ ${e.stack || e.message}`));
  process.exitCode = 1;
});
