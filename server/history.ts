// Storico delle ultime 24 ore di una stazione: un solo file per stazione, già scaricato dalla fonte.
import { arpavFile, arpavSeries, parseArpavStation } from './arpav.js';
import { parseMtLastData } from './meteotrentino.js';
import { fetchText, msToKmh, type Sample } from './util.js';

export type Point = [t: number, v: number]; // [epoch ms UTC, valore]

export interface History {
  id: string;
  from: number;
  to: number;
  temp: Point[]; // °C
  humidity: Point[]; // %
  windSpeed: Point[]; // km/h
  windGust: Point[]; // km/h
  windDir: Point[]; // gradi da cui viene
  rain: Point[]; // mm nell'intervallo di misura (15' o 30')
  snow: Point[]; // cm
}

export const isStationId = (id: string) => /^(arpav:\d{1,5}|meteotrentino:T\d{4})$/.test(id);

const DAY = 24 * 3_600_000;

export async function fetchHistory(id: string, now = Date.now()): Promise<History> {
  if (!isStationId(id)) throw new Error('id stazione non valido');
  const [source, code] = id.split(':');
  const s =
    source === 'arpav'
      ? arpavSeries(parseArpavStation(await fetchText(arpavFile(code), 'latin1')))
      : parseMtLastData(await fetchText(`https://dati.meteotrentino.it/service.asmx/getLastDataOfMeteoStation?codice=${code}`));

  const from = now - DAY;
  const pts = (x: Sample[], f: (v: number) => number = (v) => v): Point[] =>
    x.filter((p) => p.t > from && p.t <= now).sort((a, b) => a.t - b.t).map((p) => [p.t, f(p.v)]);
  const kmh = (v: number) => msToKmh(v)!;
  const snow = 'snow' in s ? s.snow : [];

  return {
    id,
    from,
    to: now,
    temp: pts(s.temp),
    humidity: pts(s.humidity),
    windSpeed: pts(s.windSpeed, kmh),
    windGust: pts(s.windGust, kmh),
    windDir: pts(s.windDir),
    rain: pts(s.rain),
    snow: pts(snow),
  };
}

// Cache per stazione (10 min, come i dati live), limitata per non crescere senza fine su un'istanza calda.
const cache = new Map<string, { at: number; data: Promise<History> }>();
export function getHistory(id: string): Promise<History> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.data;
  if (cache.size > 200) cache.clear();
  const data = fetchHistory(id);
  cache.set(id, { at: Date.now(), data });
  data.catch(() => cache.delete(id));
  return data;
}
