// src/image.js — pull camera/EXIF metadata from a local image.
// Lazy-loads `exifr`; degrades to basic file info if it's not installed.
import fs from "node:fs/promises";
import path from "node:path";

export const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"]);

export function isImage(file) {
  return IMAGE_EXTS.has(path.extname(file).toLowerCase());
}

/** Returns { width, height, camera, lens, takenAt, gps } — fields may be empty. */
export async function extractMetadata(filePath) {
  const out = { width: "", height: "", camera: "", lens: "", takenAt: "", gps: "" };
  try {
    const stat = await fs.stat(filePath);
    out.fileSizeKb = Math.round(stat.size / 1024);
  } catch {
    /* ignore */
  }

  let exifr;
  try {
    exifr = (await import("exifr")).default;
  } catch {
    return out; // exifr not installed — basic info only
  }

  try {
    const data = await exifr.parse(filePath, { gps: true }).catch(() => null);
    if (!data) return out;
    out.width = data.ExifImageWidth || data.ImageWidth || "";
    out.height = data.ExifImageHeight || data.ImageHeight || "";
    out.camera = [data.Make, data.Model].filter(Boolean).join(" ").trim();
    out.lens = data.LensModel || "";
    out.takenAt = data.DateTimeOriginal ? new Date(data.DateTimeOriginal).toISOString() : "";
    if (data.latitude && data.longitude) out.gps = `${data.latitude},${data.longitude}`;
  } catch {
    /* unreadable EXIF — keep basics */
  }
  return out;
}
