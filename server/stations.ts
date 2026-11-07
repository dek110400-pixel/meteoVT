// Unisce le fonti. Se una fonte cade, le altre vengono comunque restituite e l'errore va in `errors`.
import { fetchArpav } from './arpav.js';
import { fetchMeteotrentino } from './meteotrentino.js';
import type { SourceError, Station } from './types.js';

export interface StationsPayload {
  generatedAt: string;
  stations: Station[];
  errors: SourceError[];
}

const TTL = 10 * 60_000;
let cache: { at: number; data: Promise<StationsPayload> } | null = null;

async function load(): Promise<StationsPayload> {
  const now = Date.now();
  const sources = [
    ['arpav', fetchArpav(now)],
    ['meteotrentino', fetchMeteotrentino(now)],
  ] as const;
  const results = await Promise.allSettled(sources.map(([, p]) => p));
  const stations: Station[] = [];
  const errors: SourceError[] = [];
  results.forEach((r, i) => {
    const source = sources[i][0];
    if (r.status === 'rejected') errors.push({ source, message: String(r.reason?.message ?? r.reason) });
    else {
      stations.push(...r.value.stations);
      if (r.value.failed) errors.push({ source, message: `${r.value.failed} stazioni senza dati` });
    }
  });
  return { generatedAt: new Date(now).toISOString(), stations, errors };
}

/** Cache in memoria (istanza "calda" della function o dev server): una sola raccolta per TTL anche con richieste concorrenti. */
export function getStations(): Promise<StationsPayload> {
  if (!cache || Date.now() - cache.at > TTL) {
    const data = load();
    cache = { at: Date.now(), data };
    data.catch(() => (cache = null)); // non tenere in cache un fallimento
  }
  return cache.data;
}
