// Test Fase 3: parser ARPAV offline + chiamata reale a Windy e all'elenco ARPAV. Uso: npm run test:webcams
import assert from 'node:assert/strict';
import { cleanTitle, getWebcams, parseArpavWebcamPage } from '../server/webcams';

try { process.loadEnvFile('.env.local'); } catch { /* senza file: Windy segnalerà la chiave mancante */ }

const html = `names[1]='Porta Vescovo';\nimageUrl[1]='https://x.example/a.jpg';\npoints[1]=[46.47,11.86];
names[2]='Rif. Dell\\'Antelao';\nimageUrl[2]='http://y.example/b.jpg';\npoints[2]=[46.4,12.2];
names[3]='Senza coordinate';\nimageUrl[3]='http://z.example/c.jpg';`;
const p = parseArpavWebcamPage(html);
assert.equal(p.length, 2); // la terza non ha coordinate → scartata
assert.equal(p[1].name, "Rif. Dell'Antelao");
assert.deepEqual([p[0].lat, p[0].lon], [46.47, 11.86]);
assert.equal(cleanTitle('Primiero San Martino di Castrozza: Val di Fiemme, Italy'), 'Primiero San Martino di Castrozza: Val di Fiemme');
assert.equal(cleanTitle('Italy View, Cortina'), 'Italy View, Cortina'); // il paese si toglie solo in fondo
console.log('✓ parser ARPAV ok\n');

const t0 = Date.now();
const { webcams, errors } = await getWebcams();
console.log(`Raccolta in ${((Date.now() - t0) / 1000).toFixed(1)} s · errori:`, errors.length ? errors : 'nessuno');
for (const src of ['windy', 'arpav']) {
  const list = webcams.filter((w) => w.source === src);
  const fresh = list.filter((w) => w.updatedAt && Date.now() - Date.parse(w.updatedAt) < 3_600_000).length;
  console.log(`\n=== ${src}: ${list.length} webcam, ${fresh} aggiornate nell'ultima ora`);
  for (const w of list) assert.ok(w.imageUrl && w.pageUrl && Number.isFinite(w.lat) && Number.isFinite(w.lon), w.id);
  console.table(list.slice(0, 5).map((w) => ({ id: w.id, name: w.name.slice(0, 34), lat: w.lat, lon: w.lon, updatedAt: w.updatedAt?.slice(0, 16) ?? null, img: w.imageUrl.slice(0, 48) })));
}
