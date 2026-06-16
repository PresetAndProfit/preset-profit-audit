// src/imageStats.js — decode an image to raw pixels and compute coarse stats
// (average color, brightness, warmth, greenery, sky). Pure-JS PNG decoder +
// lazy jpeg-js for JPEG. Degrades to null if a format can't be decoded.
import fs from "node:fs/promises";
import zlib from "node:zlib";
import path from "node:path";

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Minimal PNG decoder for 8-bit color types 0/2/4/6 (grayscale/RGB/GA/RGBA).
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  let pos = 8;
  let width = 0, height = 0, colorType = 0, bitDepth = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) return null; // interlaced — skip
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) return null;
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      cur[i] = v & 0xff;
    }
    prev = cur;
  }
  return { width, height, channels, pixels: out, rgba: false };
}

async function decode(filePath) {
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return decodePng(buf);
  if (ext === ".jpg" || ext === ".jpeg") {
    try {
      const jpeg = (await import("jpeg-js")).default;
      const img = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 256 });
      return { width: img.width, height: img.height, channels: 4, pixels: img.data, rgba: true };
    } catch {
      return null; // jpeg-js not installed or decode failed
    }
  }
  return null;
}

/**
 * Returns coarse visual stats, or null if the image can't be decoded:
 * { avg:[r,g,b], brightness 0-255, warmth (r-b), greenRatio 0-1, skyRatio 0-1, colorfulness }
 */
export async function imageStats(filePath) {
  const img = await decode(filePath).catch(() => null);
  if (!img) return null;
  const { width, height, channels, pixels } = img;
  const step = Math.max(1, Math.floor((width * height) / 20000)); // sample ~20k px
  let n = 0, R = 0, G = 0, B = 0, green = 0, sky = 0, skyN = 0;
  let minR = 255, minG = 255, minB = 255, maxR = 0, maxG = 0, maxB = 0;
  const skyCut = height * 0.25;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * channels;
      let r, g, b;
      if (channels >= 3) { r = pixels[idx]; g = pixels[idx + 1]; b = pixels[idx + 2]; }
      else { r = g = b = pixels[idx]; }
      R += r; G += g; B += b; n++;
      if (g > r + 12 && g > b + 12) green++;
      if (y < skyCut) { sky += b - r; skyN++; }
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minG = Math.min(minG, g); maxG = Math.max(maxG, g);
      minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
  }
  if (!n) return null;
  const avg = [Math.round(R / n), Math.round(G / n), Math.round(B / n)];
  return {
    avg,
    brightness: Math.round(0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2]),
    warmth: avg[0] - avg[2],
    greenRatio: green / n,
    skyRatio: skyN ? Math.max(0, sky / skyN) / 64 : 0,
    colorfulness: (maxR - minR + (maxG - minG) + (maxB - minB)) / 3,
    width,
    height,
  };
}
