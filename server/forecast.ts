// Previsioni orarie Open-Meteo (modello ICON, DWD) per un punto: prossime 48 ore. Vedi DATA_SOURCES.md §7.
import type { Point } from './history.js';
import { fetchText } from './util.js';

export interface Forecast {
  lat: number;
  lon: number;
  elevation: number | null;
  model: string;
  from: number; // inizio dell'ora corrente (ms UTC)
  to: number;
  temp: Point[]; // °C alla quota richiesta
  precip: Point[]; // mm nell'ora (pioggia + neve come acqua)
  snowfall: Point[]; // cm di neve fresca nell'ora
  windSpeed: Point[]; // km/h a 10 m
  windGust: Point[]; // km/h
  windDir: Point[]; // gradi da cui viene
  freezing: Point[]; // zero termico, m s.l.m.
}

const MODEL = 'icon_seamless';
const VARS = ['temperature_2m', 'precipitation', 'snowfall', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'freezing_level_height'] as const;
const HOURS = 48;

/** Area di Veneto + Trentino con margine: il proxy non fa da tramite per previsioni di qualsiasi punto del mondo. */
export function parsePoint(lat: unknown, lon: unknown, elev: unknown) {
  const la = Number(lat);
  const lo = Number(lon);
  const el = elev === null || elev === undefined || elev === '' ? null : Number(elev);
  if (!(la > 44.5 && la < 47.4 && lo > 10 && lo < 13.5)) return null;
  if (el !== null && !(Number.isInteger(el) && el > -10 && el < 4000)) return null;
  // ~100 m: abbastanza preciso per un modello a 2 km, e la cache si riusa tra stazione e località vicine
  return { lat: Math.round(la * 1000) / 1000, lon: Math.round(lo * 1000) / 1000, elevation: el };
}

export function parseOpenMeteo(json: any, now = Date.now()): Omit<Forecast, 'lat' | 'lon' | 'elevation' | 'model'> {
  const h = json?.hourly;
  if (!h || !Array.isArray(h.time)) throw new Error('risposta Open-Meteo senza dati orari');
  const t: number[] = h.time.map((s: number) => s * 1000);
  const from = Math.floor(now / 3_600_000) * 3_600_000;
  const to = from + HOURS * 3_600_000;
  const series = (k: (typeof VARS)[number]): Point[] =>
    t.flatMap((tt, i) => {
      const v = h[k]?.[i];
      return tt >= from && tt <= to && typeof v === 'number' && Number.isFinite(v) ? [[tt, v] as Point] : [];
    });
  return {
    from,
    to,
    temp: series('temperature_2m'),
    precip: series('precipitation'),
    snowfall: series('snowfall'),
    windSpeed: series('wind_speed_10m'),
    windGust: series('wind_gusts_10m'),
    windDir: series('wind_direction_10m'),
    freezing: series('freezing_level_height'),
  };
}

export async function fetchForecast(p: NonNullable<ReturnType<typeof parsePoint>>): Promise<Forecast> {
  const q = new URLSearchParams({
    latitude: String(p.lat),
    longitude: String(p.lon),
    hourly: VARS.join(','),
    models: MODEL,
    forecast_days: '3',
    timezone: 'GMT',
    wind_speed_unit: 'kmh',
    timeformat: 'unixtime',
  });
  if (p.elevation !== null) q.set('elevation', String(p.elevation));
  const json = JSON.parse(await fetchText(`https://api.open-meteo.com/v1/forecast?${q}`));
  if (json?.error) throw new Error(`Open-Meteo: ${json.reason ?? 'errore'}`);
  return { ...p, model: MODEL, ...parseOpenMeteo(json) };
}

// Cache 1 ora per punto (il modello si aggiorna ogni 3 h): tiene le chiamate molto sotto il limite gratuito.
const cache = new Map<string, { at: number; data: Promise<Forecast> }>();
export function getForecast(p: NonNullable<ReturnType<typeof parsePoint>>): Promise<Forecast> {
  const key = `${p.lat},${p.lon},${p.elevation}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.data;
  if (cache.size > 300) cache.clear();
  const data = fetchForecast(p);
  cache.set(key, { at: Date.now(), data });
  data.catch(() => cache.delete(key));
  return data;
}
