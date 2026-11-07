// Test previsioni: validazione del punto, parser offline, una chiamata reale. Uso: npm run test:forecast
import assert from 'node:assert/strict';
import { fetchForecast, parseOpenMeteo, parsePoint } from '../server/forecast.js';

assert.deepEqual(parsePoint('46.49999', '11.87607', '1642'), { lat: 46.5, lon: 11.876, elevation: 1642 });
assert.equal(parsePoint('48.2', '16.3', ''), null); // Vienna: fuori area
assert.equal(parsePoint('46.5', '11.8', '1642.5'), null); // quota non intera
assert.equal(parsePoint('x', '11.8', null), null);
assert.equal(parsePoint('46.5', '11.8', null)?.elevation, null);

const now = Date.UTC(2026, 10, 7, 10, 30);
const base = Date.UTC(2026, 10, 7, 9) / 1000;
const f = parseOpenMeteo({ hourly: { time: [base, base + 3600, base + 7200], temperature_2m: [1, 2, null], freezing_level_height: [1700, 1800, 1900] } }, now);
assert.equal(f.from, Date.UTC(2026, 10, 7, 10)); // inizio dell'ora corrente
assert.deepEqual(f.temp, [[Date.UTC(2026, 10, 7, 10), 2]]); // l'ora passata e il null sono scartati
assert.equal(f.freezing.length, 2);
assert.throws(() => parseOpenMeteo({}));
console.log('✓ controlli offline ok');

const r = await fetchForecast(parsePoint(46.5, 11.876, 1642)!);
for (const k of ['temp', 'windSpeed', 'windGust', 'precip', 'freezing'] as const) {
  assert.ok(r[k].length >= 40, `${k}: solo ${r[k].length} ore`);
  for (const [t] of r[k]) assert.ok(t >= r.from && t <= r.to);
}
console.log(`Arabba ${r.model}: ${r.temp.length} ore · ora ${r.temp[0][1]} °C · zero termico ${r.freezing[0][1]} m · raffica max ${Math.max(...r.windGust.map((p) => p[1]))} km/h`);
