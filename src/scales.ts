// Scale colore dei layer. Il valore è sempre stampato accanto al colore: il colore da solo non porta informazione.

export type Layer = 'temp' | 'wind' | 'snow';

// Temperatura: scala continua dal blu al rosso.
export const TEMP_STOPS: [number, string][] = [
  [-20, '#24317a'],
  [-10, '#2f6fb8'],
  [0, '#9fcde9'],
  [10, '#f1e39a'],
  [20, '#f0a24f'],
  [30, '#c8322a'],
  [40, '#6e1712'],
];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Interpolazione lineare tra le tappe; fuori scala resta sul colore estremo. */
export function tempColor(t: number): string {
  const s = TEMP_STOPS;
  if (t <= s[0][0]) return s[0][1];
  if (t >= s[s.length - 1][0]) return s[s.length - 1][1];
  const i = s.findIndex(([v]) => v > t);
  const [v0, c0] = s[i - 1];
  const [v1, c1] = s[i];
  const k = (t - v0) / (v1 - v0);
  const a = hex(c0);
  const b = hex(c1);
  return toHex(a.map((x, j) => x + (b[j] - x) * k));
}

// Vento: classi di intensità (km/h), colore per classe.
export const WIND_CLASSES: { max: number; color: string; label: string }[] = [
  { max: 10, color: '#7c9a74', label: '< 10' },
  { max: 20, color: '#2f6fa8', label: '10–20' },
  { max: 40, color: '#d99a1e', label: '20–40' },
  { max: 60, color: '#c8322a', label: '40–60' },
  { max: Infinity, color: '#6b2a7a', label: '> 60' },
];
export const windColor = (kmh: number) => WIND_CLASSES.find((c) => kmh < c.max)!.color;

/** Lunghezza della freccia: una sola scala fissa (la forma dice l'intensità anche senza colore). */
export const windLength = (kmh: number) => Math.round(Math.min(14 + kmh * 0.9, 56));

/** Raggio del cerchio neve: cresce con la radice dell'altezza, così 2 m non coprono una valle. */
export const snowRadius = (cm: number) => Math.round(Math.min(5 + Math.sqrt(Math.max(cm, 0)) * 2.4, 32));

/**
 * Intervallo della scala temperatura adattato ai valori di oggi (multipli di 5, almeno 15 °C di ampiezza).
 * I colori restano assoluti (tempColor): cambia solo il tratto di scala mostrato.
 */
export function tempRange(temps: number[]): [number, number] {
  if (!temps.length) return [-5, 15];
  let lo = Math.floor(Math.min(...temps) / 5) * 5;
  let hi = Math.ceil(Math.max(...temps) / 5) * 5;
  while (hi - lo < 15) {
    lo -= 5;
    if (hi - lo < 15) hi += 5;
  }
  return [lo, hi];
}
