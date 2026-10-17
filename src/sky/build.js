import * as THREE from 'three';

export const SKY_R = 50;
// The plane of the galaxy, as the normal of its great circle.
export const BAND = new THREE.Vector3(0.42, 0.62, 0.66).normalize();
// Particles for all answers together; each answer gets a share (within limits).
const WORD_BUDGET = 160000;
const WORD_SCALE = 0.024; // world units per rasterised pixel
const UP = new THREE.Vector3(0, 1, 0);

// Deterministic per-mark randomness, so a star always sits and spells the same way.
export const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// A mark's (x, y) in 0..1 becomes a place in the sky: x across a wide field ahead of you,
// y from high (0) down to just above the hills (1). Layout then nudges them apart.
export const FIELD = { span: 160, low: 10, high: 74 };
const D2R = Math.PI / 180;

function dirFrom(lon, lat) {
    return new THREE.Vector3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), -Math.cos(lon) * Math.cos(lat));
}

// East and north at a point on the dome: the plane a word is written in.
function tangents(dir) {
    // Seen from inside the dome, so east is to the right when facing the point.
    const east = new THREE.Vector3().crossVectors(dir, UP).normalize();
    const north = new THREE.Vector3().crossVectors(east, dir).normalize();
    return { east, north };
}

const WORD_DROP = 2.4; // how far below its star an answer is written

// Where a mark's words sit: just beneath its star.
function wordCenter(dir) {
    const { north } = tangents(dir);
    return dir.clone().multiplyScalar(SKY_R).addScaledVector(north, -WORD_DROP);
}

function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const w of text.split(/\s+/)) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = w;
        } else line = test;
    }
    if (line) lines.push(line);
    return lines;
}

const textCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const FONT = 'italic 300 76px "Cormorant Garamond", Georgia, serif';
const LINE_H = 84;

function measure(answer) {
    const ctx = textCanvas.getContext('2d', { willReadFrequently: true });
    ctx.font = FONT;
    const lines = wrap(ctx, answer, 900).slice(0, 4);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
    return { w: w * WORD_SCALE, h: (LINE_H * lines.length + 40) * WORD_SCALE };
}

// Places every star so no two answers overlap: start from each mark's own (x, y), then
// push overlapping boxes (star plus its words, on the flattened dome) apart until they rest.
function layout(marks) {
    const lonMax = (FIELD.span / 2) * D2R * SKY_R;
    const [latMin, latMax] = [FIELD.low * D2R * SKY_R, FIELD.high * D2R * SKY_R];
    const items = marks.map((m) => {
        const { w, h } = measure(m.answer);
        const top = 1.2, bottom = WORD_DROP + h / 2;
        return {
            x: (m.x - 0.5) * 2 * lonMax,
            y: latMin + (1 - m.y) * (latMax - latMin),
            hw: Math.max(w, 2.4) / 2 + 0.8,
            hh: (top + bottom) / 2 + 0.5,
            dy: (top - bottom) / 2, // box centre relative to the star
        };
    });
    // Pairwise, so only while it stays cheap; a crowded sky just blends.
    const rounds = items.length > 600 ? 0 : 160;
    for (let it = 0; it < rounds; it++) {
        let moved = false;
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const a = items[i], b = items[j];
                // Width shrinks toward the zenith, as the dome narrows.
                const sa = 1 / Math.cos(a.y / SKY_R), sb = 1 / Math.cos(b.y / SKY_R);
                const dx = b.x - a.x, dy = b.y + b.dy - (a.y + a.dy);
                const ox = a.hw * sa + b.hw * sb - Math.abs(dx);
                const oy = a.hh + b.hh - Math.abs(dy);
                if (ox <= 0 || oy <= 0) continue;
                moved = true;
                if (ox / (a.hw + b.hw) < oy / (a.hh + b.hh)) {
                    const p = (ox / 2 + 0.05) * (dx < 0 ? -1 : 1);
                    a.x -= p;
                    b.x += p;
                } else {
                    const p = (oy / 2 + 0.05) * (dy < 0 ? -1 : 1);
                    a.y -= p;
                    b.y += p;
                }
            }
        }
        for (const a of items) {
            a.x = Math.min(lonMax, Math.max(-lonMax, a.x));
            a.y = Math.min(latMax, Math.max(latMin, a.y));
        }
        if (!moved) break;
    }
    return items.map((a) => dirFrom(a.x / SKY_R, a.y / SKY_R));
}

// The answer as lit pixels, in world units around its centre.
function textPoints(answer, budget, r) {
    const W = 1100, LH = LINE_H;
    const ctx = textCanvas.getContext('2d', { willReadFrequently: true });
    ctx.font = FONT;
    const lines = wrap(ctx, answer, 900).slice(0, 4);
    const H = LH * lines.length + 40;
    textCanvas.width = W;
    textCanvas.height = H;
    ctx.font = FONT;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 20 + LH * (i + 0.5)));
    const data = ctx.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
            if (data[(y * W + x) * 4 + 3] > 110) pts.push([(x - W / 2) * WORD_SCALE, -(y - H / 2) * WORD_SCALE]);
        }
    }
    // Thin out evenly at random down to the budget.
    for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    return pts.slice(0, budget);
}

// Everything that depends on the marks, built once per set of marks.
export function buildSky(marks) {
    const n = marks.length;
    const stagger = Math.min(0.18, 5 / Math.max(n, 1));
    const births = marks.map((_, i) => 0.9 + i * stagger);

    // Stars.
    const sPos = new Float32Array(n * 3), sMark = new Float32Array(n), sBirth = new Float32Array(n), sSeed = new Float32Array(n);
    const dirs = layout(marks);
    const centers = dirs.map(wordCenter);
    marks.forEach((m, i) => {
        dirs[i].clone().multiplyScalar(SKY_R).toArray(sPos, i * 3);
        sMark[i] = i;
        sBirth[i] = births[i];
        sSeed[i] = (m.seed % 1000) / 1000;
    });
    const stars = new THREE.BufferGeometry();
    stars.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    stars.setAttribute('aMark', new THREE.BufferAttribute(sMark, 1));
    stars.setAttribute('aBirth', new THREE.BufferAttribute(sBirth, 1));
    stars.setAttribute('aSeed', new THREE.BufferAttribute(sSeed, 1));

    // Words.
    const per = Math.max(180, Math.min(2600, Math.floor(WORD_BUDGET / Math.max(n, 1))));
    const sets = marks.map((m) => textPoints(m.answer, per, rng(m.seed)));
    const total = sets.reduce((a, s) => a + s.length, 0);
    const wPos = new Float32Array(total * 3), wStart = new Float32Array(total * 3);
    const wMark = new Float32Array(total), wDelay = new Float32Array(total), wSeed = new Float32Array(total);
    let k = 0;
    const v = new THREE.Vector3();
    marks.forEach((m, i) => {
        const r = rng(m.seed + 7);
        const center = centers[i];
        const { east, north } = tangents(dirs[i]);
        for (const [x, y] of sets[i]) {
            v.copy(center).addScaledVector(east, x).addScaledVector(north, y);
            v.toArray(wPos, k * 3);
            // Start as a loose cloud of dust around the star.
            const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1), rad = 4 + r() * 16;
            v.set(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)).multiplyScalar(rad).add(center);
            v.toArray(wStart, k * 3);
            wMark[k] = i;
            wDelay[k] = births[i] + 0.2 + r() * 1.4;
            wSeed[k] = r();
            k++;
        }
    });
    const words = new THREE.BufferGeometry();
    words.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
    words.setAttribute('aStart', new THREE.BufferAttribute(wStart, 3));
    words.setAttribute('aMark', new THREE.BufferAttribute(wMark, 1));
    words.setAttribute('aDelay', new THREE.BufferAttribute(wDelay, 1));
    words.setAttribute('aSeed', new THREE.BufferAttribute(wSeed, 1));
    words.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SKY_R * 2);

    // Constellations: each star reaches for its two nearest earlier stars.
    const lPos = [], lBirth = [];
    marks.forEach((_, i) => {
        const near = [];
        for (let j = Math.max(0, i - 60); j < i; j++) near.push({ j, d: -dirs[i].dot(dirs[j]) });
        near.sort((a, b) => a.d - b.d);
        for (const { j } of near.slice(0, 2)) {
            // Stop short of each star so the line doesn't cut through its glow.
            const a = dirs[i].clone().lerp(dirs[j], 0.06).normalize().multiplyScalar(SKY_R + 0.5);
            const b = dirs[j].clone().lerp(dirs[i], 0.06).normalize().multiplyScalar(SKY_R + 0.5);
            lPos.push(...a.toArray(), ...b.toArray());
            lBirth.push(births[i] + 1, births[i] + 1);
        }
    });
    const lines = new THREE.BufferGeometry();
    lines.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
    lines.setAttribute('aBirth', new THREE.Float32BufferAttribute(lBirth, 1));

    return { stars, words, lines, dirs, centers, births };
}

// The anonymous sky behind them: scattered stars, crowded along the band of the galaxy.
export function buildDust(count = 9000) {
    const r = rng(1729);
    const pos = new Float32Array(count * 3), size = new Float32Array(count), seed = new Float32Array(count), tint = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
    for (let i = 0; i < count; i++) {
        v.set(gauss(), gauss(), gauss()).normalize();
        if (i % 2 === 0) {
            // Pull into the band.
            v.addScaledVector(BAND, -v.dot(BAND)).addScaledVector(BAND, gauss() * 0.11).normalize();
        }
        if (v.y < -0.08) v.y = -v.y;
        v.multiplyScalar(85).toArray(pos, i * 3);
        size[i] = 0.8 + Math.pow(r(), 7) * 4.5;
        seed[i] = r();
        const t = r();
        const c = t < 0.12 ? [0.72, 0.8, 1] : t < 0.24 ? [1, 0.82, 0.62] : [0.94, 0.91, 0.86];
        tint.set(c, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    return g;
}

// Low hills all the way round: where you're standing.
export function buildHills() {
    const R = 40, SEG = 360;
    const r = rng(42);
    const waves = Array.from({ length: 6 }, (_, i) => ({ f: 1 + i * 2 + Math.floor(r() * 3), p: r() * 6.28, a: 0.5 / (i + 1) }));
    const pos = [], idx = [];
    for (let s = 0; s <= SEG; s++) {
        const az = (s / SEG) * Math.PI * 2;
        let h = 0;
        for (const w of waves) h += Math.sin(az * w.f + w.p) * w.a;
        const elev = 0.035 + 0.025 * h;
        const x = Math.sin(az) * R, z = -Math.cos(az) * R;
        pos.push(x, Math.tan(elev) * R, z, x, -R, z);
        if (s < SEG) {
            const a = s * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
}
