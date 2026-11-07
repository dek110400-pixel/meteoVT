export type Sample = { t: number; v: number }; // t = epoch ms UTC

const UA = 'meteo-veneto-trentino/0.1 (proxy open data)';

export async function fetchText(url: string, encoding = 'utf-8', timeoutMs = 10_000): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return new TextDecoder(encoding).decode(await res.arrayBuffer());
}

/** Esegue fn su tutti gli item con al massimo `limit` richieste in parallelo (per non sovraccaricare le fonti). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const num = (x: unknown): number | null => {
  if (x === undefined || x === null || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

export const asArray = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

export const last = (s: Sample[]): Sample | null =>
  s.reduce<Sample | null>((a, b) => (!a || b.t > a.t ? b : a), null);

/** Somma dei campioni con timestamp in (from, to]. null se nell'intervallo non c'è nessuna misura. */
export function sumBetween(s: Sample[], from: number, to: number): number | null {
  const inRange = s.filter((x) => x.t > from && x.t <= to);
  if (!inRange.length) return null;
  return Math.round(inRange.reduce((a, b) => a + b.v, 0) * 10) / 10;
}

/** Istante UTC della mezzanotte di oggi in ora italiana (gestisce ora legale/solare). */
export function romeMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', timeZoneName: 'longOffset',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const offset = get('timeZoneName').replace('GMT', '') || '+00:00'; // es. "+01:00"
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T00:00:00${offset}`);
}

export const msToKmh = (v: number | null) => (v == null ? null : Math.round(v * 36) / 10);
