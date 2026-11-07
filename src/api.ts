import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_REFRESH_MS = 10 * 60_000;

/** Carica un endpoint JSON all'avvio, ogni 10 minuti e su richiesta. In caso di errore tiene i dati precedenti. */
export function useFeed<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
    const t = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return { data, loading, error, reload: load };
}
