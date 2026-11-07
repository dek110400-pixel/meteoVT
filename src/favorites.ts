import { useCallback, useEffect, useState } from 'react';

export type FavKind = 'station' | 'webcam';
export const favKey = (kind: FavKind, id: string) => `${kind}|${id}`;
export const parseFavKey = (k: string) => {
  const i = k.indexOf('|');
  return { kind: k.slice(0, i) as FavKind, id: k.slice(i + 1) };
};

const KEY = 'meteo:favorites';

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.includes('|')) : [];
  } catch {
    return []; // localStorage corrotto: si riparte da vuoto invece di rompere l'app
  }
}

/** Preferiti salvati in localStorage, nell'ordine in cui sono stati aggiunti. */
export function useFavorites() {
  const [list, setList] = useState<string[]>(read);
  const toggle = useCallback((kind: FavKind, id: string) => {
    setList((prev) => {
      const k = favKey(kind, id);
      return prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
    });
  }, []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(list)), [list]);
  const has = useCallback((kind: FavKind, id: string) => list.includes(favKey(kind, id)), [list]);
  return { list, toggle, has };
}
