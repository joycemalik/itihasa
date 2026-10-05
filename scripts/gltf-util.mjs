// Shared helpers for reading GLB files in Node and walking their triangles in world space.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

export async function createIO() {
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
}

// Column-major 4x4 multiply helpers (glTF matrices are column-major).
const mul = (a, b) => {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
const xfPoint = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];
const xfDir = (m, x, y, z) => {
  const v = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// Returns a flat list of world-space triangles: { a, b, c, n } with face normal n.
export function collectTriangles(doc) {
  const tris = [];
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  const visit = (node, parent) => {
    const world = mul(parent, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getMode() !== 4) continue; // triangles only
        const pos = prim.getAttribute('POSITION');
        if (!pos) continue;
        const idx = prim.getIndices();
        const count = idx ? idx.getCount() : pos.getCount();
        const p = [], el = [0, 0, 0];
        const get = (i) => { pos.getElement(i, el); return xfPoint(world, el[0], el[1], el[2]); };
        for (let i = 0; i + 2 < count; i += 3) {
          const ia = idx ? idx.getScalar(i) : i, ib = idx ? idx.getScalar(i + 1) : i + 1, ic = idx ? idx.getScalar(i + 2) : i + 2;
          const a = get(ia), b = get(ib), c = get(ic);
          const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
          const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
          const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          const area2 = Math.hypot(nx, ny, nz);
          if (area2 < 1e-12) continue;
          tris.push({ a, b, c, n: [nx / area2, ny / area2, nz / area2], area: area2 / 2 });
        }
      }
    }
    for (const child of node.listChildren()) visit(child, world);
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const n of scene.listChildren()) visit(n, I);
  return tris;
}

export function bounds(tris) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const v of [t.a, t.b, t.c]) for (let k = 0; k < 3; k++) {
    if (v[k] < min[k]) min[k] = v[k];
    if (v[k] > max[k]) max[k] = v[k];
  }
  return { min, max };
}
