import fs from 'node:fs';
import path from 'node:path';
import { createIO, collectTriangles, bounds } from './gltf-util.mjs';

const dir = process.argv[2] || 'models_src';
const io = await createIO();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb'))) {
  try {
    const doc = await io.read(path.join(dir, f));
    const tris = collectTriangles(doc);
    const { min, max } = bounds(tris);
    const size = max.map((v, i) => (v - min[i]).toFixed(3));
    const center = max.map((v, i) => ((v + min[i]) / 2).toFixed(3));
    console.log(`${f.padEnd(42)} meshes=${doc.getRoot().listMeshes().length} tris=${tris.length} size=[${size}] center=[${center}]`);
  } catch (e) {
    console.log(`${f}: ERROR ${e.message}`);
  }
}
