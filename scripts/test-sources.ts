// Test Fase 1: controlli offline sui parser + chiamata reale alle fonti, stampa 5 stazioni per fonte.
// Uso: npm run test:sources
import assert from 'node:assert/strict';
import { parseArpavStation, parseArpavTime } from '../server/arpav';
import { parseMtLastData, parseMtTime } from '../server/meteotrentino';
import { getStations } from '../server/stations';
import { romeMidnight, sumBetween } from '../server/util';

// --- controlli offline ---
assert.equal(new Date(parseArpavTime('202607151200')).toISOString(), '2026-07-15T11:00:00.000Z'); // UTC+1 anche d'estate
assert.equal(new Date(parseMtTime('2026-11-05T00:15:00+01')).toISOString(), '2026-11-04T23:15:00.000Z');
assert.equal(new Date(romeMidnight(new Date('2026-07-15T10:00:00Z'))).toISOString(), '2026-07-14T22:00:00.000Z');
assert.equal(new Date(romeMidnight(new Date('2026-11-06T10:00:00Z'))).toISOString(), '2026-11-05T23:00:00.000Z');
assert.equal(sumBetween([{ t: 1, v: 0.2 }, { t: 2, v: 0.1 }, { t: 3, v: 5 }], 0, 2), 0.3);
assert.equal(sumBetween([{ t: 5, v: 1 }], 0, 2), null); // nessuna misura → null, non 0

const arpavXml = `<CONTENITORE><STAZIONE><SENSORE><PARAMNM>Velocità vento a 10m</PARAMNM><TYPE>VVENTO</TYPE>
<DATI ISTANTE="202611061000"><VM>2.5</VM></DATI><DATI ISTANTE="202611061030"><VM></VM></DATI></SENSORE></STAZIONE></CONTENITORE>`;
const s = parseArpavStation(arpavXml);
assert.equal(s[0].samples.length, 1); // valore vuoto scartato, non trasformato in 0
const mt = parseMtLastData(`<lastData><wind_list><wind10m><date>2026-11-06T10:00:00+01</date><speed_value>1</speed_value>
<windgust>3</windgust><direction_value>90</direction_value></wind10m></wind_list><snow_depth_list /></lastData>`);
assert.equal(mt.windGust[0].v, 3);
assert.equal(mt.snow.length, 0);
console.log('✓ controlli offline superati\n');

// --- chiamata reale ---
const t0 = Date.now();
const { stations, errors, generatedAt } = await getStations();
console.log(`Raccolta in ${((Date.now() - t0) / 1000).toFixed(1)} s — generatedAt ${generatedAt}`);
console.log('Errori:', errors.length ? errors : 'nessuno');

for (const src of ['arpav', 'meteotrentino'] as const) {
  const list = stations.filter((x) => x.source === src);
  const withData = list.filter((x) => x.updatedAt);
  const stale = withData.filter((x) => Date.now() - Date.parse(x.updatedAt!) > 3_600_000);
  const count = (k: keyof (typeof list)[0]) => list.filter((x) => x[k] != null).length;
  console.log(`\n=== ${src}: ${list.length} stazioni, ${withData.length} con dati, ${stale.length} con dati > 1h`);
  console.log(`    campi presenti → temp ${count('temp')}, umid ${count('humidity')}, vento ${count('windSpeed')}, raffica ${count('windGust')}, pioggia ${count('rain')}, neve ${count('snowDepth')}`);
  for (const x of list) {
    // tutte le coordinate devono cadere nel riquadro Veneto+Trentino
    assert.ok(x.lat > 44.7 && x.lat < 47.2 && x.lon > 10.2 && x.lon < 13.2, `coordinate fuori area: ${x.id}`);
  }
  // 5 stazioni, preferendo quelle con più campi valorizzati
  const sample = [...withData].sort((a, b) => Object.values(b).filter((v) => v != null).length - Object.values(a).filter((v) => v != null).length).slice(0, 5);
  console.table(sample.map(({ id, name, elevation, province, updatedAt, temp, humidity, windSpeed, windGust, windDir, rain, rain1h, snowDepth }) => ({
    id, name: name.slice(0, 24), quota: elevation, prov: province,
    ora: updatedAt && new Date(updatedAt).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' }),
    temp, umid: humidity, vento: windSpeed, raff: windGust, dir: windDir, pioggia: rain, p1h: rain1h, neve: snowDepth,
  })));
}
