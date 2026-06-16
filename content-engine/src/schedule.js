// src/schedule.js — Phase 3: content calendar.
//   Approve → Schedule → Post Queue
// Assigns scheduled_date to approved items, supports reordering (drag-and-drop
// in the web UI), and exposes calendar groupings for daily/weekly views.
import { getStore } from "./store.js";
import { CONFIG } from "./env.js";

const dayKey = (iso) => String(iso).slice(0, 10);

// Times of day for `perDay` posts. 1/day uses the configured time; multiple
// posts spread across a 9:00–19:00 window so slots never cross midnight.
function dailyTimes(perDay, baseTime) {
  const [bh, bm] = String(baseTime).split(":").map(Number);
  if (perDay <= 1) return [[bh || 0, bm || 0]];
  const startH = 9, endH = 19;
  return Array.from({ length: perDay }, (_, i) => [Math.round(startH + ((endH - startH) * i) / (perDay - 1)), 0]);
}

/** Generate `count` ISO slot datetimes from a start date at the cadence. */
function buildSlots(count, { startDate, time = CONFIG.scheduleTime, perDay = CONFIG.schedulePerDay } = {}) {
  const times = dailyTimes(perDay, time);
  let start;
  if (startDate) start = new Date(startDate);
  else {
    start = new Date();
    start.setDate(start.getDate() + 1); // default: begin tomorrow
  }
  start.setHours(0, 0, 0, 0);
  const slots = [];
  for (let i = 0; i < count; i++) {
    const di = Math.floor(i / perDay);
    const [h, m] = times[i % perDay];
    const d = new Date(start);
    d.setDate(start.getDate() + di);
    d.setHours(h, m, 0, 0);
    slots.push(d.toISOString());
  }
  return slots;
}

/** Approved items, sorted by their schedule (then FIFO for unscheduled). */
export async function scheduledQueue() {
  const store = await getStore();
  return (await store.list())
    .filter((r) => r.approval_status === "approved" || (r.approval_status === "posted" && r.scheduled_date))
    .sort((a, b) => String(a.scheduled_date || a.created_at).localeCompare(String(b.scheduled_date || b.created_at)));
}

/**
 * Auto-generate the posting schedule. By default only fills items that are
 * approved-but-unscheduled, placing them after any existing scheduled content.
 * Pass { reschedule: true } to re-slot the entire approved queue from scratch.
 */
export async function autoSchedule({ startDate, time, perDay, reschedule = false } = {}) {
  const store = await getStore();
  const approved = (await store.list())
    .filter((r) => r.approval_status === "approved")
    .sort((a, b) => String(a.scheduled_date || a.created_at).localeCompare(String(b.scheduled_date || b.created_at)));

  const targets = reschedule ? approved : approved.filter((r) => !r.scheduled_date);
  if (!targets.length) return [];

  // When only appending, start the day after the last already-scheduled item.
  let start = startDate;
  if (!start && !reschedule) {
    const existing = approved.map((r) => r.scheduled_date).filter(Boolean).sort();
    if (existing.length) {
      const last = new Date(existing[existing.length - 1]);
      last.setDate(last.getDate() + 1);
      start = last.toISOString();
    }
  }

  const slots = buildSlots(targets.length, { startDate: start, time, perDay });
  const updated = [];
  for (let i = 0; i < targets.length; i++) {
    updated.push(await store.update(targets[i].submission_id, { scheduled_date: slots[i] }));
  }
  return updated;
}

/** Reassign schedule slots to match a new order (drag-and-drop reordering). */
export async function reorderSchedule(orderedIds, opts = {}) {
  const store = await getStore();
  const recs = [];
  for (const id of orderedIds) {
    const r = await store.get(id);
    if (r) recs.push(r);
  }
  if (!recs.length) return [];
  // Keep the existing set of slot datetimes; just hand them out in the new order.
  let dates = recs.map((r) => r.scheduled_date).filter(Boolean).sort();
  if (dates.length < recs.length) dates = buildSlots(recs.length, opts);
  const updated = [];
  for (let i = 0; i < recs.length; i++) {
    updated.push(await store.update(recs[i].submission_id, { scheduled_date: dates[i] }));
  }
  return updated;
}

/** Manually set/clear one item's scheduled date. */
export async function setScheduledDate(id, isoDate) {
  const store = await getStore();
  return store.update(id, { scheduled_date: isoDate || "" });
}

/**
 * Calendar grouped by day for the web/CLI views.
 * Returns [{ day: "YYYY-MM-DD", items: [...] }] covering `days` from `from`.
 */
export async function getCalendar({ days = 7, from } = {}) {
  const queue = (await scheduledQueue()).filter((r) => r.scheduled_date);
  const start = from ? new Date(from) : new Date();
  start.setHours(0, 0, 0, 0);

  const byDay = new Map();
  for (const r of queue) byDay.set(dayKey(r.scheduled_date), [...(byDay.get(dayKey(r.scheduled_date)) || []), r]);

  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, items: byDay.get(key) || [] });
  }
  // Include any scheduled items that fall outside the window (so nothing hides).
  const windowKeys = new Set(out.map((o) => o.day));
  const overflow = [...byDay.entries()].filter(([k]) => !windowKeys.has(k)).map(([day, items]) => ({ day, items }));
  return { window: out, overflow: overflow.sort((a, b) => a.day.localeCompare(b.day)) };
}
