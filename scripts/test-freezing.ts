// Test griglia zero termico: interpolazione offline + chiamata reale. Uso: npm run test:freezing
import assert from 'node:assert/strict';
import { fetchGrid, freezingAt, GRID, gridPoints, parseGrid } from '../server/freezing.js';

const g = { lat0: 0, lon0: 0, step: 1, rows: 2, cols: 2 };
assert.equal(freezingAt(g, [1000, 2000, 3000, 4000], 0, 0), 1000);
assert.equal(freezingAt(g, [1000, 2000, 3000, 4000], 0.5, 0.5), 2500); // centro: media dei 4
assert.equal(freezingAt(g, [1000, 2000, 3000, 4000], 1, 1), 4000); // bordo superiore incluso
assert.equal(freezingAt(g, [1000, 2000, 3000, 4000], 1.5, 0.5), null); // fuori griglia
assert.equal(freezingAt(g, [1000, null, 3000, 4000], 0.5, 0.5), null); // vertice mancante: niente stima
const { lats, lons } = gridPoints();
assert.equal(lats.length, GRID.rows * GRID.cols);
assert.deepEqual([lats[0], lons[0], lats.at(-1), lons.at(-1)], [44.8, 10.4, 47.05, 13.15]);
assert.throws(() => parseGrid([{}, {}]));
console.log('✓ controlli offline ok');

const t0 = Date.now();
const r = await fetchGrid();
const now = r.values[0].filter((v): v is number => v != null);
assert.ok(r.times.length >= 40 && now.length === GRID.rows * GRID.cols);
console.log(`${r.times.length} ore in ${((Date.now() - t0) / 1000).toFixed(1)} s · zero termico ora ${Math.min(...now)}–${Math.max(...now)} m`);
