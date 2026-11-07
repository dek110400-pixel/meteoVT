type Pt = { lat: number; lon: number };

/** Distanza in km (haversine). */
export function km(a: Pt, b: Pt): number {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Il punto più vicino entro maxKm, oppure null. */
export function nearest<T extends Pt>(from: Pt, items: T[], maxKm: number): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    // scarto veloce: 0.1° di latitudine ≈ 11 km
    if (Math.abs(item.lat - from.lat) > maxKm / 100) continue;
    const d = km(from, item);
    if (d <= maxKm && (!best || d < best.km)) best = { item, km: d };
  }
  return best;
}
