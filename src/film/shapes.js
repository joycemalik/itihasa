import * as THREE from 'three';

// 256 x 256 = 65,536 particles, simulated on the GPU.
export const SIM_SIZE = 256;
export const COUNT = SIM_SIZE * SIM_SIZE;
// The last DUST particles float in the same place in every scene: the room's air.
const DUST = 3500;
const BODY = COUNT - DUST;

// Per-particle behaviour, stored in the w channel of each target. Animated in shaders.js.
export const FLAG = {
    STATIC: 0,
    THOUGHT: 1, // rises from its point in a slow helix
    DUST: 2,
    VORTEX: 3, // circles down the funnel of the hole
    HUM: 4, // vibrates
    STREAM: 5, // rushes along x, like scenery past a car
    SPIN: 6, // orbits the y axis
    GHOST: 7, // drawn faintly
    PULSE: 8, // lit by travelling waves, like signals
    PEEL: 9, // drifts outward and fades
    DISSOLVE: 10, // scatters as its scene progresses
    IRIS: 11, // contracts toward the pupil as its scene progresses
    SMOKE: 12, // wide, slow rising smoke
};

const CLOUD_FILES = ['hand_full', 'hand_skeleton', 'brain', 'neurons', 'onion', 'face', 'coins', 'car', 'car_interior', 'yoga_pose_tranquility'];

export async function loadClouds(onProgress) {
    let done = 0;
    const entries = await Promise.all(
        CLOUD_FILES.map(async (name) => {
            const res = await fetch(`/points/${name}.bin`);
            const buf = await res.arrayBuffer();
            // Vite answers missing files with index.html, so check the payload, not just the status.
            if (!res.ok || buf.byteLength % 12 !== 0 || buf.byteLength < 1200) {
                throw new Error(`Missing point cloud /points/${name}.bin. Run "npm run bake".`);
            }
            onProgress(++done / CLOUD_FILES.length);
            return [name, new Int16Array(buf)];
        })
    );
    return Object.fromEntries(entries);
}

// Deterministic randomness so every load draws the same picture.
let seed = 7;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const rr = (a, b) => a + (b - a) * rng();
const gauss = () => {
    let u = 0;
    while (!u) u = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};
const sstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

export function xf(scale, rot = [0, 0, 0], pos = [0, 0, 0], order = 'XYZ') {
    return new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], order)),
        new THREE.Vector3(scale, scale, scale)
    );
}

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

// Collects particle targets. Normals drive the sketch shading; "tangent" entries store a
// stroke direction instead, so lines are drawn along themselves like pen strokes.
class ShapeWriter {
    constructor() {
        this.pos = new Float32Array(COUNT * 4);
        this.nrm = new Float32Array(COUNT * 4);
        this.i = 0;
    }

    get left() {
        return BODY - this.i;
    }

    add(x, y, z, nx = 0, ny = 0, nz = 0, flag = 0, tangent = false) {
        if (this.i >= BODY) return;
        const o = this.i++ * 4;
        this.pos[o] = x;
        this.pos[o + 1] = y;
        this.pos[o + 2] = z;
        this.pos[o + 3] = flag;
        this.nrm[o] = nx;
        this.nrm[o + 1] = ny;
        this.nrm[o + 2] = nz;
        this.nrm[o + 3] = tangent ? 1 : 0;
    }

    cloud(data, count, matrix, flag = 0) {
        const n = data.length / 6;
        const nm = new THREE.Matrix3().getNormalMatrix(matrix);
        const start = Math.floor(rng() * n);
        for (let k = 0; k < count; k++) {
            const j = ((start + k) % n) * 6;
            _v.set(data[j], data[j + 1], data[j + 2]).multiplyScalar(1 / 32767).applyMatrix4(matrix);
            _n.set(data[j + 3], data[j + 4], data[j + 5]).applyMatrix3(nm).normalize();
            this.add(_v.x, _v.y, _v.z, _n.x, _n.y, _n.z, flag);
        }
    }

    // Points along a parametric curve fn(t) for t in [0, 1], drawn as strokes along the curve.
    curve(fn, count, flag = 0, jitter = 0.006) {
        for (let k = 0; k < count; k++) {
            const t = rng();
            const a = fn(Math.max(0, t - 0.002));
            const b = fn(Math.min(1, t + 0.002));
            const p = fn(t);
            const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
            const l = Math.hypot(dx, dy, dz) || 1;
            this.add(p[0] + gauss() * jitter, p[1] + gauss() * jitter, p[2] + gauss() * jitter, dx / l, dy / l, dz / l, flag, true);
        }
    }

    line(a, b, count, flag = 0, jitter = 0.006) {
        this.curve((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], count, flag, jitter);
    }

    // A closed or open polyline, with points shared out by segment length.
    polyline(pts, count, closed = false, flag = 0, jitter = 0.006) {
        const segs = [];
        for (let k = 0; k < pts.length - (closed ? 0 : 1); k++) segs.push([pts[k], pts[(k + 1) % pts.length]]);
        const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
        const total = lens.reduce((s, l) => s + l, 0);
        segs.forEach(([a, b], k) => this.line(a, b, Math.round((count * lens[k]) / total), flag, jitter));
    }

    boxEdges(min, max, count, flag = 0, jitter = 0.006) {
        const [x0, y0, z0] = min;
        const [x1, y1, z1] = max;
        const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        const lens = edges.map(([a, b]) => Math.hypot(...c[a].map((v, i) => c[b][i] - v)));
        const total = lens.reduce((s, l) => s + l, 0);
        edges.forEach(([a, b], k) => this.line(c[a], c[b], Math.round((count * lens[k]) / total), flag, jitter));
    }

    // Points on chosen faces of a box ('px','nx','py','ny','pz','nz'), shaded as surfaces.
    boxFaces(min, max, count, faces, flag = 0) {
        const size = max.map((v, i) => v - min[i]);
        const area = { px: size[1] * size[2], nx: size[1] * size[2], py: size[0] * size[2], ny: size[0] * size[2], pz: size[0] * size[1], nz: size[0] * size[1] };
        const total = faces.reduce((s, f) => s + area[f], 0);
        for (const f of faces) {
            const n = Math.round((count * area[f]) / total);
            const axis = { x: 0, y: 1, z: 2 }[f[1]];
            const sign = f[0] === 'p' ? 1 : -1;
            for (let k = 0; k < n; k++) {
                const p = [rr(min[0], max[0]), rr(min[1], max[1]), rr(min[2], max[2])];
                p[axis] = sign > 0 ? max[axis] : min[axis];
                const nn = [0, 0, 0];
                nn[axis] = sign;
                this.add(p[0], p[1], p[2], nn[0], nn[1], nn[2], flag);
            }
        }
    }

    ellipsoid(center, radii, count, flag = 0) {
        for (let k = 0; k < count; k++) {
            _n.set(gauss(), gauss(), gauss()).normalize();
            const nx = _n.x / radii[0], ny = _n.y / radii[1], nz = _n.z / radii[2];
            const l = Math.hypot(nx, ny, nz);
            this.add(center[0] + _n.x * radii[0], center[1] + _n.y * radii[1], center[2] + _n.z * radii[2], nx / l, ny / l, nz / l, flag);
        }
    }

    // Fill any remaining slots, sort by height so morphs flow coherently, then add the dust.
    finish(dust) {
        const filled = this.i;
        while (this.i < BODY) {
            const o = Math.floor(rng() * filled) * 4;
            const flag = this.pos[o + 3];
            this.add(
                this.pos[o] + gauss() * 0.004, this.pos[o + 1] + gauss() * 0.004, this.pos[o + 2] + gauss() * 0.004,
                this.nrm[o], this.nrm[o + 1], this.nrm[o + 2], flag, this.nrm[o + 3] > 0.5
            );
        }
        const idx = Array.from({ length: BODY }, (_, k) => k);
        idx.sort((a, b) => this.pos[a * 4 + 1] - this.pos[b * 4 + 1]);
        const pos = new Float32Array(COUNT * 4);
        const nrm = new Float32Array(COUNT * 4);
        idx.forEach((src, dst) => {
            pos.set(this.pos.subarray(src * 4, src * 4 + 4), dst * 4);
            nrm.set(this.nrm.subarray(src * 4, src * 4 + 4), dst * 4);
        });
        pos.set(dust, BODY * 4);
        return { pos, nrm };
    }
}

function makeDust() {
    const d = new Float32Array(DUST * 4);
    for (let k = 0; k < DUST; k++) {
        _v.set(gauss(), gauss() * 0.6, gauss()).normalize().multiplyScalar(rr(3.5, 16));
        d.set([_v.x, _v.y, _v.z, FLAG.DUST], k * 4);
    }
    return d;
}

// ---------------------------------------------------------------------------
// Scenes. Shapes live around the origin; camera shots in timeline.js frame them.
// ---------------------------------------------------------------------------

const HAND = xf(2.0, [0, 0, Math.PI], [0, 0.15, 0]);
// The skeleton model is 0.863x the hand's size in the source files; keep that ratio.
const SKELETON = xf(2.0 * 0.863, [0, 0, Math.PI], [0, 0.15, 0]);

const builders = {
    sleeper(w, c) {
        // A bed seen as a pencil sketch: outlined frame, shaded blanket over a body, head on the pillow.
        w.boxFaces([-2, -0.32, -1.1], [2, 0.02, 1.1], 3000, ['px', 'nx', 'pz', 'nz']);
        w.boxEdges([-2, -0.32, -1.1], [2, 0.02, 1.1], 2600);
        w.boxEdges([-2.06, -0.62, -1.14], [2.06, -0.32, 1.14], 2400);
        for (const [x, z] of [[-2, -1.1], [2, -1.1], [-2, 1.1], [2, 1.1]]) w.line([x, -0.62, z], [x, -0.95, z], 160);
        w.boxEdges([-2.18, -0.95, -1.16], [-2.06, 1.35, 1.16], 2300);
        w.boxFaces([-2.18, -0.95, -1.16], [-2.06, 1.35, 1.16], 1800, ['px']);
        for (let k = 1; k < 6; k++) {
            const z = -1.16 + (k * 2.32) / 6;
            w.line([-2.05, 0.05, z], [-2.05, 1.3, z], 170);
        }
        w.ellipsoid([-1.55, 0.13, 0], [0.36, 0.13, 0.68], 4200);

        const body = (x, z) => {
            const g = (v, s) => Math.exp(-((v / s) ** 2));
            const torso = 0.3 * g(z, 0.42) * sstep(-1.3, -1.0, x) * (1 - sstep(0.35, 0.65, x));
            const legs = (0.2 - 0.07 * sstep(0.4, 1.8, x)) * (g(z - 0.18, 0.15) + g(z + 0.18, 0.15)) * sstep(0.3, 0.6, x) * (1 - sstep(1.85, 2.0, x));
            const feet = 0.12 * sstep(1.62, 1.82, x) * (1 - sstep(1.88, 2.0, x)) * (g(z - 0.18, 0.12) + g(z + 0.18, 0.12));
            return Math.max(torso, legs) + feet;
        };
        const blanket = (x, z) => 0.06 + body(x, z) + 0.018 * Math.sin(x * 6.5 + z * 2.5) * Math.cos(z * 4.0);
        for (let k = 0; k < 17000; k++) {
            const x = rr(-1.2, 2.02), z = rr(-1.12, 1.12), e = 0.01;
            const y = blanket(x, z);
            const dx = (blanket(x + e, z) - blanket(x - e, z)) / (2 * e);
            const dz = (blanket(x, z + e) - blanket(x, z - e)) / (2 * e);
            const l = Math.hypot(dx, 1, dz);
            w.add(x, y, z, -dx / l, 1 / l, -dz / l);
        }
        w.curve((t) => { const z = -1.12 + t * 2.24; return [-1.2, blanket(-1.2, z) + 0.02, z]; }, 900);
        for (const s of [-1, 1]) {
            for (let k = 0; k < 2300; k++) {
                const x = rr(-1.2, 2.04), top = blanket(x, 1.12 * s);
                w.add(x, rr(-0.28 + 0.03 * Math.sin(x * 5), top), 1.13 * s, 0, 0, s);
            }
            w.curve((t) => { const x = -1.2 + t * 3.24; return [x, -0.28 + 0.03 * Math.sin(x * 5), 1.14 * s]; }, 500);
        }
        for (let k = 0; k < 1100; k++) w.add(2.04, rr(-0.28, 0.06), rr(-1.12, 1.12), 1, 0, 0);

        // Head on the pillow, face up, crown toward the headboard.
        w.cloud(c.face, 6200, xf(0.22, [-Math.PI / 2, Math.PI / 2, 0], [-1.5, 0.4, 0], 'YXZ'));
        // Thoughts leaking out of the head.
        for (let k = 0; k < 3600; k++) w.add(-1.5 + gauss() * 0.06, 0.6 + gauss() * 0.04, gauss() * 0.07, 0, 0, 0, FLAG.THOUGHT);
        // Hatched shadow on the floor under the bed.
        for (let k = 0; k < 4200; k++) {
            const x = gauss() * 1.5 + 0.1, z = gauss() * 0.95;
            w.add(x, -0.95, z, 0.707, 0, 0.707, FLAG.GHOST, true);
        }
    },

    hand(w, c) {
        w.cloud(c.hand_full, w.left, HAND);
    },

    skeleton(w, c) {
        // Bone, with the flesh left behind as a faint x-ray ghost.
        w.cloud(c.hand_skeleton, 50000, SKELETON);
        w.cloud(c.hand_full, w.left, HAND, FLAG.GHOST);
    },

    brain(w, c) {
        const m = xf(1.75, [0, Math.PI / 2, 0]);
        w.cloud(c.brain, 42000, m);
        w.cloud(c.brain, w.left, m, FLAG.PULSE);
    },

    neurons(w, c) {
        w.cloud(c.neurons, w.left, xf(4.2), FLAG.PULSE);
    },

    onion(w, c) {
        const m = xf(1.8, [0, 0.7, 0]);
        w.cloud(c.onion, 54000, m);
        w.cloud(c.onion, w.left, m, FLAG.PEEL);
    },

    crowd(w, c) {
        // A street of identical heads: masks.
        const heads = [[0, -0.05, -0.6, 0.85]];
        for (let k = 0; k < 15; k++) {
            const z = -1.4 - k * 0.5 + rr(-0.2, 0.2);
            let x = rr(1.0, 4.6) * (k % 2 ? 1 : -1);
            if (k > 9) x = rr(-2.5, 2.5);
            heads.push([x, rr(-0.3, 0.25), z, rr(0.62, 0.75)]);
        }
        const per = Math.floor(w.left / heads.length);
        heads.forEach(([x, y, z, s], k) => w.cloud(c.face, per, xf(s, [rr(-0.08, 0.08), (k ? rr(-0.35, 0.35) : 0), 0], [x, y, z])));
    },

    hole(w, c) {
        // A funnel that everything slides down, with coins circling its rim.
        const R = (s) => 2.8 + (0.08 - 2.8) * Math.pow(s, 0.55); // must match funnelR in shaders.js
        for (let k = 0; k < 38000; k++) {
            const s = Math.pow(rng(), 0.8), a = rng() * Math.PI * 2;
            const r = R(s);
            w.add(Math.cos(a) * r, -3 * s, Math.sin(a) * r, -Math.cos(a), 0.5, -Math.sin(a), FLAG.VORTEX);
        }
        w.curve((t) => [Math.cos(t * 6.2832) * 2.85, 0, Math.sin(t * 6.2832) * 2.85], 3000);
        w.curve((t) => [Math.cos(t * 6.2832) * 2.95, 0.02, Math.sin(t * 6.2832) * 2.95], 1500);
        w.cloud(c.coins, w.left, xf(1.0, [0.25, 0, 0.1], [2.0, 0.25, 0]), FLAG.SPIN);
    },

    fading(w, c) {
        // A figure sitting in the silence, dissolving, inside a humming shell.
        w.cloud(c.yoga_pose_tranquility, 46000, xf(1.9, [0, 0.35, 0], [0, -0.1, 0]), FLAG.DISSOLVE);
        const n = w.left, golden = Math.PI * (3 - Math.sqrt(5));
        for (let k = 0; k < n; k++) {
            const y = 1 - (2 * (k + 0.5)) / n, r = Math.sqrt(1 - y * y), a = k * golden;
            const x = Math.cos(a) * r, z = Math.sin(a) * r;
            w.add(x * 3.6, y * 3.6, z * 3.6, x, y, z, FLAG.HUM);
        }
    },

    room(w) {
        // An empty room drawn in line, an empty chair, a dead bulb, smoke.
        const x0 = -4, x1 = 4, y0 = -1.6, y1 = 2.8, z0 = -4.5, z1 = 4.5;
        w.boxEdges([x0, y0, z0], [x1, y1, z1], 7000, 0, 0.01);
        for (let x = x0 + 0.45; x < x1; x += 0.45) w.line([x, y0, z0], [x, y0, z1], 260, FLAG.GHOST, 0.004);
        w.polyline([[1.2, y0, z0], [1.2, 1.0, z0], [2.4, 1.0, z0], [2.4, y0, z0]], 1600);
        w.polyline([[1.35, y0 + 0.15, z0 + 0.01], [1.35, 0.85, z0 + 0.01], [2.25, 0.85, z0 + 0.01], [2.25, y0 + 0.15, z0 + 0.01]], 900, true, FLAG.GHOST);
        w.ellipsoid([2.15, -0.35, z0 + 0.05], [0.05, 0.05, 0.05], 200);
        w.polyline([[x0, 0, -2.2], [x0, 1.7, -2.2], [x0, 1.7, -0.2], [x0, 0, -0.2]], 1600, true);
        w.line([x0, 0.85, -2.2], [x0, 0.85, -0.2], 400);
        w.line([x0, 0, -1.2], [x0, 1.7, -1.2], 400);
        for (let k = 0; k < 3500; k++) {
            const onLeft = rng() < 0.5, h = y0 + Math.abs(gauss()) * 0.7;
            if (onLeft) w.add(x0, h, rr(z0, z1), 0, 1, 0, FLAG.GHOST, true);
            else w.add(rr(x0, x1), h, z0, 0, 1, 0, FLAG.GHOST, true);
        }
        w.line([0, y1, -0.5], [0, 1.55, -0.5], 400);
        w.ellipsoid([0, 1.42, -0.5], [0.11, 0.14, 0.11], 700);
        const cx = 0.3, cz = -1.2, seat = -1.15;
        w.boxEdges([cx - 0.27, seat - 0.05, cz - 0.27], [cx + 0.27, seat, cz + 0.27], 900);
        for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) w.line([cx + dx, seat - 0.05, cz + dz], [cx + dx, y0, cz + dz], 250);
        for (const dx of [-0.25, 0.25]) w.line([cx + dx, seat, cz - 0.26], [cx + dx, seat + 0.8, cz - 0.26], 260);
        for (const h of [0.35, 0.55, 0.75]) w.line([cx - 0.25, seat + h, cz - 0.26], [cx + 0.25, seat + h, cz - 0.26], 180);
        while (w.left > 0) w.add(cx + gauss() * 0.4, -1.3 + gauss() * 0.1, cz + gauss() * 0.4, 0, 0, 0, FLAG.SMOKE);
    },

    carEx(w, c) {
        // Front of the car faces -x; the world streams past toward +x.
        w.cloud(c.car, w.left - 4200, xf(2.4, [0, -Math.PI / 2, 0], [0, -0.2, 0]));
        for (let k = 0; k < 2200; k++) w.add(rr(-12, 12), -0.9, rr(-3.5, 3.5), 1, 0, 0, FLAG.STREAM, true);
        while (w.left > 0) w.add(rr(-12, 12), rr(-0.9, 2.8), rr(-9, -5), 1, 0, 0, FLAG.STREAM, true);
    },

    carIn(w, c) {
        w.cloud(c.car_interior, w.left - 2500, xf(2.4));
        while (w.left > 0) {
            const side = rng() < 0.5 ? -1 : 1;
            w.add(rr(-12, 12), rr(-1.5, 3), side * rr(3, 9), 1, 0, 0, FLAG.STREAM, true);
        }
    },

    eye(w) {
        // One huge eye, drawn like an etching, staring back.
        const W = 2.7, H = 1.3;
        const bulge = (x, y) => 0.6 * Math.sqrt(Math.max(0, 1 - (x / (W + 0.2)) ** 2 - (y / (H + 0.4)) ** 2));
        const upper = (t) => H * Math.pow(Math.max(0, 1 - t * t), 0.85) * (1 + 0.12 * t);
        const lower = (t) => -H * 0.72 * Math.pow(Math.max(0, 1 - t * t), 1.1) * (1 - 0.1 * t);
        const inside = (x, y) => Math.abs(x) < W && y < upper(x / W) && y > lower(x / W);
        const at = (x, y, dz = 0.01) => [x, y, bulge(x, y) + dz];

        for (const off of [0, 0.035]) w.curve((t) => { const s = t * 2 - 1; return at(s * W, upper(s) + off); }, 3000);
        w.curve((t) => { const s = t * 2 - 1; return at(s * W * 0.95, upper(s) * 1.0 + 0.38); }, 1800, 0, 0.012);
        for (const off of [0, -0.03]) w.curve((t) => { const s = t * 2 - 1; return at(s * W, lower(s) + off); }, 1800);
        for (let k = 0; k < 80; k++) {
            const s = -0.92 + (k / 79) * 1.84, x = s * W, y = upper(s);
            const len = 0.28 + 0.18 * (1 - Math.abs(s)), ang = Math.PI / 2 + s * 0.9;
            w.curve((t) => at(x + Math.cos(ang) * len * t + 0.08 * t * t * Math.sign(s), y + Math.sin(ang) * len * t), 45, 0, 0.003);
        }
        for (let k = 0; k < 230; k++) {
            const a = (k / 230) * Math.PI * 2 + rr(-0.01, 0.01), wob = rr(-0.08, 0.08);
            for (let j = 0; j < 70; j++) {
                const r = 0.55 + rng() * 0.45, aa = a + wob * (r - 0.55);
                const x = Math.cos(aa) * r, y = Math.sin(aa) * r;
                if (!inside(x, y)) continue;
                const p = at(x, y, 0.02);
                w.add(p[0], p[1], p[2], Math.cos(aa), Math.sin(aa), 0, FLAG.IRIS, true);
            }
        }
        for (const [r, n, flag] of [[1.0, 3200, 0], [1.03, 1400, 0], [0.55, 2600, FLAG.IRIS]]) {
            for (let k = 0; k < n; k++) {
                const a = rng() * Math.PI * 2, x = Math.cos(a) * r, y = Math.sin(a) * r;
                if (!inside(x, y)) continue;
                const p = at(x + gauss() * 0.005, y + gauss() * 0.005, 0.02);
                w.add(p[0], p[1], p[2], -Math.sin(a), Math.cos(a), 0, flag, true);
            }
        }
        w.ellipsoid([0.3, 0.32, 0.64], [0.1, 0.1, 0.01], 1500);
        for (let k = 0; k < 7000; k++) {
            const x = rr(-W, W), y = rr(-H, H);
            if (!inside(x, y) || Math.hypot(x, y) < 1.04) continue;
            const p = at(x, y);
            w.add(p[0], p[1], p[2], 0.6, -0.8, 0, FLAG.GHOST, true);
        }
        w.curve((t) => { const s = t * 2 - 1; return [s * 3.1, 2.1 + 0.35 * (1 - s * s) - 0.15 * s, 0.1]; }, 2800, 0, 0.06);
        for (let k = 0; k < 4000; k++) {
            const s = rr(-1, 1), y = lower(s) - Math.abs(gauss()) * 0.35;
            const p = at(s * W, y, -0.02);
            w.add(p[0], p[1], p[2], 0.8, 0.6, 0, FLAG.GHOST, true);
        }
        // Whatever is left thickens the iris.
        while (w.left > 0) {
            const a = rng() * Math.PI * 2, r = 0.55 + rng() * 0.45;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            if (!inside(x, y)) continue;
            const p = at(x, y, 0.02);
            w.add(p[0], p[1], p[2], Math.cos(a), Math.sin(a), 0, FLAG.IRIS, true);
        }
    },

    void(w) {
        // Everything collapses into one point of light.
        while (w.left > 0) {
            _n.set(gauss(), gauss(), gauss()).normalize();
            const r = 0.03 + Math.abs(gauss()) * 0.03;
            w.add(_n.x * r, _n.y * r, _n.z * r, _n.x, _n.y, _n.z, FLAG.HUM);
        }
    },
};

function toTexture(data) {
    const t = new THREE.DataTexture(data, SIM_SIZE, SIM_SIZE, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
}

// Returns { [sceneId]: { positions: DataTexture, normals: DataTexture } }.
export function buildShapes(clouds) {
    seed = 7;
    const dust = makeDust();
    const out = {};
    for (const [id, build] of Object.entries(builders)) {
        const w = new ShapeWriter();
        build(w, clouds);
        const { pos, nrm } = w.finish(dust);
        out[id] = { positions: toTexture(pos), normals: toTexture(nrm), data: pos };
    }
    return out;
}
