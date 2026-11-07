// Meteotrentino (Trentino): anagrafica JSON + getLastDataOfMeteoStation per stazione.
// Vedi DATA_SOURCES.md §2.
import { XMLParser } from 'fast-xml-parser';
import type { Station } from './types.js';
import { asArray, fetchText, last, mapLimit, msToKmh, num, romeMidnight, sumBetween, type Sample } from './util.js';

const BASE = 'https://dati.meteotrentino.it/service.asmx/';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false });

/** "2026-11-05T00:15:00+01" → epoch ms. L'offset senza minuti non è ISO valido: aggiungo ":00". */
export const parseMtTime = (s: string) => Date.parse(String(s).replace(/([+-]\d{2})$/, '$1:00'));

/** Tutti gli elementi figli di una *_list, qualunque sia il loro nome (es. wind10m). */
const items = (list: any): any[] =>
  list && typeof list === 'object' ? Object.values(list).flatMap((x) => asArray<any>(x as any)) : [];

const series = (list: any, field: string): Sample[] =>
  items(list).flatMap((x) => {
    const v = num(x?.[field]);
    const t = parseMtTime(x?.date);
    return v == null || !Number.isFinite(t) ? [] : [{ t, v }];
  });

export function parseMtLastData(xml: string) {
  const d = parser.parse(xml)?.lastData ?? {};
  return {
    temp: series(d.temperature_list, 'value'),
    humidity: series(d.relative_humidity_list, 'value'),
    windSpeed: series(d.wind_list, 'speed_value'),
    windGust: series(d.wind_list, 'windgust'),
    windDir: series(d.wind_list, 'direction_value'),
    rain: series(d.precipitation_list, 'value'),
    snow: series(d.snow_depth_list, 'value'),
  };
}

export async function fetchMeteotrentino(now = Date.now()): Promise<{ stations: Station[]; failed: number }> {
  const anag = (JSON.parse(await fetchText(BASE + 'listaStazioniJson')).sites ?? []).filter((s: any) => !s.fine);
  if (!anag.length) throw new Error('Meteotrentino: anagrafica vuota');
  const midnight = romeMidnight(new Date(now));
  let failed = 0;

  const stations = await mapLimit(anag, 6, async (a: any): Promise<Station> => {
    let d: ReturnType<typeof parseMtLastData> | null = null;
    try {
      d = parseMtLastData(await fetchText(`${BASE}getLastDataOfMeteoStation?codice=${encodeURIComponent(a.codice)}`));
    } catch {
      failed++;
    }
    const v = (s: Sample[] | undefined) => last(s ?? [])?.v ?? null;
    const allT = d ? Object.values(d).flatMap((s) => s.map((x) => x.t)) : [];

    return {
      id: `meteotrentino:${a.codice}`,
      source: 'meteotrentino',
      name: String(a.nome),
      lat: Number(a.latitudine),
      lon: Number(a.longitudine),
      elevation: Number(a.quota),
      province: 'TN', // l'anagrafica non ha la provincia: la rete è tutta in Provincia di Trento
      updatedAt: allT.length ? new Date(Math.max(...allT)).toISOString() : null,
      temp: v(d?.temp),
      humidity: v(d?.humidity),
      windSpeed: msToKmh(v(d?.windSpeed)),
      windGust: msToKmh(v(d?.windGust)),
      windDir: v(d?.windDir),
      rain: d ? sumBetween(d.rain, midnight, now) : null,
      rain1h: d ? sumBetween(d.rain, now - 3_600_000, now) : null,
      snowDepth: v(d?.snow),
    };
  });
  if (failed === anag.length) throw new Error('Meteotrentino: nessuna stazione raggiungibile');
  return { stations, failed };
}
