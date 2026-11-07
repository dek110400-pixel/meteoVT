// Test storico 24h: id non validi rifiutati + una stazione per fonte. Uso: npm run test:history
import assert from 'node:assert/strict';
import { fetchHistory, isStationId } from '../server/history.js';

assert.ok(isStationId('arpav:9') && isStationId('meteotrentino:T0147'));
for (const bad of ['arpav:', 'arpav:9;rm', 'meteotrentino:../x', 'windy:1', '']) assert.ok(!isStationId(bad), bad);

for (const id of ['arpav:3', 'meteotrentino:T0403']) {
  const h = await fetchHistory(id);
  const span = (p: [number, number][]) => (p.length ? `${p.length} punti, ${new Date(p[0][0]).toISOString().slice(11, 16)}–${new Date(p.at(-1)![0]).toISOString().slice(11, 16)} UTC` : 'nessun dato');
  for (const k of ['temp', 'windSpeed', 'windGust', 'rain', 'snow'] as const) {
    for (const [t] of h[k]) assert.ok(t > h.from && t <= h.to, `${id} ${k} fuori finestra`);
    console.log(id.padEnd(20), k.padEnd(10), span(h[k]));
  }
}
console.log('✓ storico ok');
