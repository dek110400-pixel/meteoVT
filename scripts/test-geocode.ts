// Test ricerca località: parser offline + 2 ricerche reali (distanziate dalla coda). Uso: npm run test:geocode
import assert from 'node:assert/strict';
import { cleanQuery, parseNominatim, searchPlaces } from '../server/geocode.js';

assert.equal(cleanQuery('  passo   giau '), 'passo giau');
const p = parseNominatim([
  { name: 'Passo Giau', lat: '46.48', lon: '12.05', type: 'hamlet', display_name: 'Passo Giau, Colle Santa Lucia, Belluno, Veneto, 32020, Italia' },
  { name: '', lat: 'x', lon: '1', display_name: '' },
  { name: 'Passo Giau', lat: '46.4805', lon: '12.0510', type: 'bus_stop', display_name: 'Passo Giau, SP638, Italia' }, // doppione vicino
]);
assert.equal(p.length, 1);
assert.equal(p[0].label, 'Passo Giau, Colle Santa Lucia, Belluno');
assert.deepEqual(parseNominatim({ error: 1 }), []);
console.log('✓ parser ok');

for (const q of ['Passo Giau', 'Rifugio Lagazuoi']) {
  const r = await searchPlaces(q);
  assert.ok(r.length > 0, `nessun risultato per ${q}`);
  for (const x of r) assert.ok(x.lat > 44.7 && x.lat < 47.2 && x.lon > 10.3 && x.lon < 13.2, `fuori area: ${x.label}`);
  console.log(q, '→', r.slice(0, 3).map((x) => `${x.label} (${x.kind})`).join(' | '));
}
