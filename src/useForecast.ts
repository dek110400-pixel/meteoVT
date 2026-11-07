import { useEffect, useState } from 'react';
import type { Forecast } from '../server/forecast';

/** Previsioni per un punto (la cache è sul server: 1 ora). */
export function useForecast(lat: number, lon: number, elevation: number | null) {
  const [data, setData] = useState<Forecast | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const ac = new AbortController();
    setData(null);
    setState('loading');
    const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (elevation != null) q.set('elev', String(Math.round(elevation)));
    fetch(`/api/forecast?${q}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Forecast) => {
        setData(j);
        setState('ok');
      })
      .catch(() => !ac.signal.aborted && setState('error'));
    return () => ac.abort();
  }, [lat, lon, elevation]);
  return { forecast: data, state };
}

/** Valore della prima ora di previsione (l'ora corrente). */
export const nowValue = (p: [number, number][] | undefined) => p?.[0]?.[1] ?? null;
