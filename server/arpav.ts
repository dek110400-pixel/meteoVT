// ARPAV (Veneto): anagrafica in stazioni.xml, dati degli ultimi ~3 giorni in un file XML per stazione.
// Vedi DATA_SOURCES.md §1.
import { XMLParser } from 'fast-xml-parser';
import type { Station } from './types.js';
import { asArray, fetchText, last, mapLimit, msToKmh, num, romeMidnight, sumBetween, type Sample } from './util.js';

const BASE = 'https://meteo.arpa.veneto.it/meteo/dati_meteo/xml/';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false });

/** "YYYYMMDDHHMM" in ora solare fissa (UTC+1, anche d'estate) → epoch ms UTC. */
export function parseArpavTime(s: string): number {
  const [y, mo, d, h, mi] = [s.slice(0, 4), s.slice(4, 6), s.slice(6, 8), s.slice(8, 10), s.slice(10, 12)].map(Number);
  return Date.UTC(y, mo - 1, d, h - 1, mi);
}

interface Sensor { name: string; type: string; samples: Sample[] }

const heightOf = (name: string) => Number(/(\d+)\s*m\b/.exec(name)?.[1] ?? 0);

export function parseArpavStation(xml: string): Sensor[] {
  const st = parser.parse(xml)?.CONTENITORE?.STAZIONE;
  return asArray<any>(st?.SENSORE).map((s) => ({
    name: String(s.PARAMNM ?? ''),
    type: String(s.TYPE ?? ''),
    samples: asArray<any>(s.DATI).flatMap((d) => {
      const v = num(d.VM);
      return v == null ? [] : [{ t: parseArpavTime(String(d.ISTANTE)), v }];
    }),
  }));
}

/** Serie per tipo di dato, scegliendo i sensori come per la mappa. Vento in m/s. */
export function arpavSeries(sensors: Sensor[]) {
  const byType = (t: string) => sensors.filter((s) => s.type === t);
  // Vento: più sensori a quote diverse → preferisco il più alto (10m > 5m > 2m), direzione alla stessa quota.
  const speed = byType('VVENTO').sort((x, y) => heightOf(y.name) - heightOf(x.name))[0];
  const dir = speed && byType('DVENTO').find((d) => heightOf(d.name) === heightOf(speed.name));
  const first = (t: string) => byType(t)[0]?.samples ?? [];
  return {
    temp: first('TEMP'),
    humidity: first('UMID'),
    windSpeed: speed?.samples ?? [],
    windGust: [] as Sample[], // non presente nel feed ARPAV
    windDir: dir?.samples ?? [],
    rain: first('PREC'),
    snow: first('LIVNEVE'),
  };
}

export const arpavFile = (idstaz: string) => `${BASE}${idstaz.padStart(4, '0')}.xml`; // verificato: LINKSTAZ = IDSTAZ a 4 cifre (233/233)

export async function fetchArpav(now = Date.now()): Promise<{ stations: Station[]; failed: number }> {
  // stazioni.xml e stazioni_neve.xml sono elenchi disgiunti: le stazioni nivometeo sono solo nel secondo.
  const lists = await Promise.all(['stazioni.xml', 'stazioni_neve.xml'].map((f) => fetchText(BASE + f, 'latin1')));
  const byId = new Map<string, any>();
  for (const xml of lists) for (const s of asArray<any>(parser.parse(xml)?.METEOGRAMMI?.STAZIONE)) byId.set(String(s.IDSTAZ), s);
  const anag = [...byId.values()];
  if (!anag.length) throw new Error('ARPAV: anagrafica vuota');
  const midnight = romeMidnight(new Date(now));
  let failed = 0;

  const stations = await mapLimit(anag, 6, async (a): Promise<Station> => {
    let sensors: Sensor[] = [];
    try {
      sensors = parseArpavStation(await fetchText(BASE + a.LINKSTAZ, 'latin1'));
    } catch {
      failed++; // la stazione resta sulla mappa con dati null
    }
    const sr = arpavSeries(sensors);
    const v = (s: Sample[]) => last(s)?.v ?? null;
    const allT = sensors.flatMap((s) => s.samples.map((x) => x.t));

    return {
      id: `arpav:${a.IDSTAZ}`,
      source: 'arpav',
      name: String(a.NOME),
      lat: Number(a.Y),
      lon: Number(a.X),
      elevation: Number(a.QUOTA),
      province: String(a.PROVINCIA),
      updatedAt: allT.length ? new Date(Math.max(...allT)).toISOString() : null,
      temp: v(sr.temp),
      humidity: v(sr.humidity),
      windSpeed: msToKmh(v(sr.windSpeed)),
      windGust: null, // non presente nel feed ARPAV
      windDir: v(sr.windDir),
      rain: sumBetween(sr.rain, midnight, now),
      rain1h: sumBetween(sr.rain, now - 3_600_000, now),
      snowDepth: v(sr.snow),
    };
  });
  if (failed === anag.length) throw new Error('ARPAV: nessun file stazione raggiungibile');
  return { stations, failed };
}
