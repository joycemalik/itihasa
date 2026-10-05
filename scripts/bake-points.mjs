// Bakes GLB models into compact point clouds the browser can load instantly.
//
//   node scripts/bake-points.mjs            -> bakes every model in models_src/ into public/points/
//   node scripts/bake-points.mjs --preview  -> also writes density previews to scripts/previews/
//
// Output format (<name>.bin): POINT_COUNT records of 6 x Int16 = [x, y, z, nx, ny, nz].
// Positions are centered on the model's bounding box and scaled so the longest side spans [-1, 1].
// Points are distributed by triangle area, so density matches the visible surface.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createIO, collectTriangles, bounds } from './gltf-util.mjs';

const POINT_COUNT = 65536;
const SRC = 'models_src';
const OUT = 'public/points';
const PREVIEW_DIR = 'scripts/previews';
const preview = process.argv.includes('--preview');

// dropFloor removes large flat ground planes that would otherwise soak up most of the samples.
const MODELS = [
  { name: 'hand_full' }, { name: 'hand_Skeleton' }, { name: 'Brain' }, { name: 'neurons' },
  { name: 'onion' }, { name: 'face' }, { name: 'coins' }, { name: 'car' }, { name: 'car_interior' },
  { name: 'yoga_pose_tranquility', dropFloor: true },
];

function removeFloor(tris) {
  const { min, max } = bounds(tris);
  const limit = min[1] + (max[1] - min[1]) * 0.03;
  return tris.filter((t) => Math.max(t.a[1], t.b[1], t.c[1]) >= limit);
}

// Deterministic RNG so re-baking produces identical files.
let seed = 1337;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function sample(tris, count) {
  const cdf = new Float64Array(tris.length);
  let total = 0;
  for (let i = 0; i < tris.length; i++) cdf[i] = total += tris[i].area;
  const out = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const r = rand() * total;
    let lo = 0, hi = tris.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    const t = tris[lo];
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    for (let k = 0; k < 3; k++) {
      out[i * 6 + k] = t.a[k] + (t.b[k] - t.a[k]) * u + (t.c[k] - t.a[k]) * v;
      out[i * 6 + 3 + k] = t.n[k];
    }
  }
  return out;
}

// Minimal grayscale PNG writer for previews.
function writePNG(file, w, h, gray) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; gray.copy ? gray.copy(raw, y * (w + 1) + 1, y * w, y * w + w) : raw.set(gray.subarray(y * w, y * w + w), y * (w + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]));
}

// Front (x/y), side (z/y) and top (x/z) density views side by side.
function renderPreview(file, pts) {
  const S = 300, W = S * 3, img = new Float32Array(W * S);
  const views = [[0, 1], [2, 1], [0, 2]];
  for (let i = 0; i < pts.length / 6; i++) {
    views.forEach(([a, b], vi) => {
      const px = Math.floor((pts[i * 6 + a] * 0.48 + 0.5) * S) + vi * S;
      const py = Math.floor((-pts[i * 6 + b] * 0.48 + 0.5) * S);
      if (py >= 0 && py < S && px >= vi * S && px < (vi + 1) * S) img[py * W + px] += 1;
    });
  }
  const g = new Uint8Array(W * S);
  for (let i = 0; i < g.length; i++) g[i] = Math.min(255, Math.sqrt(img[i]) * 60);
  writePNG(file, W, S, g);
}

const io = await createIO();
fs.mkdirSync(OUT, { recursive: true });
if (preview) fs.mkdirSync(PREVIEW_DIR, { recursive: true });
const meta = {};

for (const { name, dropFloor } of MODELS) {
  const doc = await io.read(path.join(SRC, `${name}.glb`));
  let tris = collectTriangles(doc);
  if (dropFloor) tris = removeFloor(tris);
  const { min, max } = bounds(tris);
  const center = min.map((v, i) => (v + max[i]) / 2);
  const extent = Math.max(...max.map((v, i) => v - min[i]));
  const pts = sample(tris, POINT_COUNT);
  const packed = new Int16Array(POINT_COUNT * 6);
  for (let i = 0; i < POINT_COUNT; i++) {
    for (let k = 0; k < 3; k++) {
      pts[i * 6 + k] = ((pts[i * 6 + k] - center[k]) / extent) * 2;
      packed[i * 6 + k] = Math.round(pts[i * 6 + k] * 32767);
      packed[i * 6 + 3 + k] = Math.round(pts[i * 6 + 3 + k] * 32767);
    }
  }
  const key = name.toLowerCase();
  fs.writeFileSync(path.join(OUT, `${key}.bin`), Buffer.from(packed.buffer));
  meta[key] = { size: max.map((v, i) => +((v - min[i]) / extent).toFixed(4)), extent: +extent.toFixed(4), center: center.map((v) => +v.toFixed(4)) };
  if (preview) renderPreview(path.join(PREVIEW_DIR, `${key}.png`), pts);
  console.log(`baked ${key.padEnd(24)} from ${tris.length} triangles`);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
