// Zero termico previsto su una griglia regolare che copre Veneto e Trentino (Open-Meteo, modello ICON).
// Serve alla mappa per disegnare l'isoipsa dello zero termico sul rilievo. Vedi DATA_SOURCES.md §9.
import { fetchText } from './util.js';

export interface FreezingGrid {
  lat0: number; // latitudine della prima riga (sud)
  lon0: number; // longitudine della prima colonna (ovest)
  step: number; // passo in gradi
  rows: number;
  cols: number;
  times: number[]; // ms UTC, una per ora
  values: (number | null)[][]; // values[ora][riga * cols + colonna], metri s.l.m.
}

export const GRID = { lat0: 44.8, lon0: 10.4, step: 0.25, rows: 10, cols: 12 }; // 120 punti, 44.8–47.05 N, 10.4–13.15 E

/** Coordinate dei punti della griglia, riga per riga da sud a nord. */
export function gridPoints(g = GRID) {
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < g.rows; r++)
    for (let c = 0; c < g.cols; c++) {
      lats.push(Math.round((g.lat0 + r * g.step) * 1000) / 1000);
      lons.push(Math.round((g.lon0 + c * g.step) * 1000) / 1000);
    }
  return { lats, lons };
}

/** Risposta multi-punto di Open-Meteo (array nello stesso ordine dei punti) → griglia per ora. */
export function parseGrid(json: unknown, now = Date.now(), hours = 48, g = GRID): FreezingGrid {
  const arr = Array.isArray(json) ? json : [json];
  if (arr.length !== g.rows * g.cols) throw new Error(`attesi ${g.rows * g.cols} punti, ricevuti ${arr.length}`);
  const t: number[] = (arr[0] as any)?.hourly?.time?.map((s: number) => s * 1000) ?? [];
  const from = Math.floor(now / 3_600_000) * 3_600_000;
  const idx = t.map((tt, i) => [tt, i] as const).filter(([tt]) => tt >= from && tt <= from + hours * 3_600_000);
  return {
    ...g,
    times: idx.map(([tt]) => tt),
    values: idx.map(([, i]) =>
      arr.map((p: any) => {
        const v = p?.hourly?.freezing_level_height?.[i];
        return typeof v === 'number' && Number.isFinite(v) ? v : null;
      }),
    ),
  };
}

export async function fetchGrid(): Promise<FreezingGrid> {
  const { lats, lons } = gridPoints();
  const q = new URLSearchParams({
    latitude: lats.join(','),
    longitude: lons.join(','),
    hourly: 'freezing_level_height',
    models: 'icon_seamless',
    forecast_days: '3',
    timezone: 'GMT',
    timeformat: 'unixtime',
  });
  const json = JSON.parse(await fetchText(`https://api.open-meteo.com/v1/forecast?${q}`, 'utf-8', 20_000));
  if ((json as any)?.error) throw new Error(`Open-Meteo: ${(json as any).reason ?? 'errore'}`);
  return parseGrid(json);
}

// Cache 1 ora: 120 punti × 24 aggiornamenti = ~2.900 punti al giorno, sotto il limite gratuito di 10.000.
let cache: { at: number; data: Promise<FreezingGrid> } | null = null;
export function getGrid(): Promise<FreezingGrid> {
  if (!cache || Date.now() - cache.at > 3_600_000) {
    const data = fetchGrid();
    cache = { at: Date.now(), data };
    data.catch(() => (cache = null));
  }
  return cache.data;
}

/** Zero termico in un punto, interpolato tra i 4 punti di griglia vicini (bilineare). null se manca un vertice o se fuori griglia. */
export function freezingAt(g: Pick<FreezingGrid, 'lat0' | 'lon0' | 'step' | 'rows' | 'cols'>, v: (number | null)[], lat: number, lon: number): number | null {
  const y = (lat - g.lat0) / g.step;
  const x = (lon - g.lon0) / g.step;
  if (y < 0 || x < 0 || y > g.rows - 1 || x > g.cols - 1) return null;
  const r = Math.min(Math.floor(y), g.rows - 2);
  const c = Math.min(Math.floor(x), g.cols - 2);
  const fy = y - r;
  const fx = x - c;
  const a = v[r * g.cols + c], b = v[r * g.cols + c + 1], d = v[(r + 1) * g.cols + c], e = v[(r + 1) * g.cols + c + 1];
  if (a == null || b == null || d == null || e == null) return null;
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + d * (1 - fx) * fy + e * fx * fy;
}
