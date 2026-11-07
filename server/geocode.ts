// Ricerca località con Nominatim (OpenStreetMap). Policy d'uso: max 1 richiesta/s, User-Agent identificativo,
// niente ricerca "mentre scrivi" → il client cerca solo all'invio. Risultati limitati a Veneto + Trentino.
import { fetchText } from './util.js';

export interface Place {
  name: string;
  label: string; // nome + comune/provincia, per distinguere omonimi
  lat: number;
  lon: number;
  kind: string; // es. hamlet, peak, alpine_hut
}

const URL_BASE = 'https://nominatim.openstreetmap.org/search';
const VIEWBOX = '10.3,47.2,13.2,44.7'; // lon/lat sinistra-alto, destra-basso

export const cleanQuery = (q: string) => q.replace(/\s+/g, ' ').trim().slice(0, 80);

export function parseNominatim(json: unknown): Place[] {
  if (!Array.isArray(json)) return [];
  const all: Place[] = json.flatMap((r: any) => {
    const lat = Number(r?.lat);
    const lon = Number(r?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const parts = String(r.display_name ?? '').split(', ');
    const name = String(r.name || parts[0] || '').trim();
    if (!name) return [];
    // display_name: "Passo Giau, Colle Santa Lucia, Belluno, Veneto, 32020, Italia" → tengo 2 livelli dopo il nome
    const where = parts.slice(1).filter((p) => !/^\d+$/.test(p) && p !== 'Italia' && p !== name).slice(0, 2);
    return [{ name, label: [name, ...where].join(', '), lat, lon, kind: String(r.type ?? '') }];
  });
  // Stesso nome a meno di ~300 m (es. frazione + fermata bus + punto panoramico) → un solo risultato, il primo (più rilevante).
  const near = (a: Place, b: Place) => a.name === b.name && Math.abs(a.lat - b.lat) < 0.003 && Math.abs(a.lon - b.lon) < 0.004;
  return all.filter((p, i) => !all.slice(0, i).some((q) => near(p, q)));
}

// Una richiesta alla volta, distanziate di almeno 1 s (su un'istanza calda); cache 1 giorno per testo cercato.
let queue: Promise<unknown> = Promise.resolve();
let lastAt = 0;
const cache = new Map<string, { at: number; data: Promise<Place[]> }>();

export function searchPlaces(raw: string): Promise<Place[]> {
  const q = cleanQuery(raw);
  if (q.length < 2) return Promise.resolve([]);
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 86_400_000) return hit.data;
  if (cache.size > 500) cache.clear();

  const data = (queue = queue.then(async () => {
    const wait = lastAt + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    const url = `${URL_BASE}?q=${encodeURIComponent(q)}&format=jsonv2&countrycodes=it&viewbox=${VIEWBOX}&bounded=1&limit=6&accept-language=it`;
    return parseNominatim(JSON.parse(await fetchText(url)));
  })) as Promise<Place[]>;
  queue = queue.catch(() => undefined);
  cache.set(key, { at: Date.now(), data });
  data.catch(() => cache.delete(key));
  return data;
}
