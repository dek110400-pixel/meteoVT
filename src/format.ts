import type { Station } from '../server/types';

export const STALE_MS = 60 * 60_000; // dato più vecchio di 1 ora → grigio

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
/** Arrotonda all'intero senza "-0" (Math.round(-0.4) dà -0). */
export const round0 = (x: number) => Math.round(x) + 0;

export const fmt = (v: number | null, unit = '') => (v == null ? 'n.d.' : `${nf.format(v)}${unit}`);

export const isOld = (iso: string | null, now = Date.now()) => !iso || now - Date.parse(iso) > STALE_MS;
export const isStale = (s: Station, now = Date.now()) => isOld(s.updatedAt, now);

export const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }) : 'n.d.';

/** "10:30" se oggi, altrimenti "5 nov 19:30". */
export function when(iso: string | null, now = Date.now()) {
  if (!iso) return 'nessun dato';
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
  return day(d) === day(new Date(now))
    ? clock(iso)
    : `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })} ${clock(iso)}`;
}

export function age(iso: string | null, now = Date.now()) {
  if (!iso) return '';
  const min = Math.round((now - Date.parse(iso)) / 60_000);
  if (min < 1) return 'adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h} h fa` : `${Math.floor(h / 24)} giorni fa`;
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const cardinal = (deg: number | null) => (deg == null ? '' : DIRS[Math.round(deg / 45) % 8]);
const WORDS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'];
/** Direzione a parole: nelle intestazioni in maiuscolo condensato una "O" sola sembra uno zero. */
export const cardinalWord = (deg: number | null) => (deg == null ? '' : WORDS[Math.round(deg / 45) % 8]);

export const SOURCE_LABEL: Record<Station['source'], string> = { arpav: 'ARPAV', meteotrentino: 'Meteotrentino' };
