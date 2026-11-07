import L from 'leaflet';
import type { Station, Webcam } from '../server/types';
import { fmt, isOld, isStale, round0 } from './format';
import { type Layer, markerLayer, snowRadius, tempColor, windColor, windLength } from './scales';

const cls = (...c: (string | false)[]) => c.filter(Boolean).join(' ');
const label = (text: string, left: number) => `<span class="st-lbl" style="left:${left}px">${text}</span>`;

/** Stazione senza il dato del layer attivo: un puntino, ancora toccabile per aprire la scheda. */
const dot = (s: Station, selected: boolean) =>
  L.divIcon({ className: cls('st st--nodata', selected && 'st--sel'), html: '<span class="st-dot"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

// Firma della direzione: ogni stazione è un simbolo cartografico con il valore "letterato" accanto, come una quota.
export function stationIcon(s: Station, selected: boolean, layer: Layer): L.DivIcon {
  layer = markerLayer(layer);
  const stale = isStale(s);
  const base = cls('st', `st--${layer}`, stale && 'st--stale', selected && 'st--sel');

  if (layer === 'temp') {
    if (s.temp == null) return dot(s, selected);
    const fill = stale ? 'var(--paper)' : tempColor(s.temp);
    return L.divIcon({
      className: base,
      html: `<span class="st-sym" style="background:${fill}"></span>${label(fmt(s.temp, '°'), 20)}`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  if (layer === 'wind') {
    if (s.windSpeed == null) return dot(s, selected);
    const v = s.windSpeed;
    const text = s.windGust != null ? `${fmt(v)} <small>(${fmt(s.windGust)})</small>` : fmt(v);
    const color = stale ? 'var(--stale)' : windColor(v);
    const len = windLength(v);
    const box = 60;
    // Freccia centrata sulla stazione, punta verso dove va il vento (la direzione indica da dove viene).
    const arrow =
      s.windDir == null || v < 1
        ? `<circle cx="30" cy="30" r="6" fill="var(--paper)" stroke="${color}" stroke-width="3"/>`
        : `<g transform="rotate(${s.windDir + 180} 30 30)">
             <path d="M30 ${30 - len / 2} V${30 + len / 2 - 8}" stroke="var(--paper)" stroke-width="7" stroke-linecap="round"/>
             <path d="M22 ${30 + len / 2 - 10} L30 ${30 + len / 2 + 2} L38 ${30 + len / 2 - 10} Z" fill="${color}" stroke="var(--paper)" stroke-width="2" stroke-linejoin="round"/>
             <path d="M30 ${30 - len / 2} V${30 + len / 2 - 8}" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>
           </g>`;
    return L.divIcon({
      className: base,
      html: `<svg class="st-wind" width="${box}" height="${box}" viewBox="0 0 60 60" aria-hidden="true">${arrow}</svg>${label(text, 44)}`,
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2],
    });
  }

  // neve: cerchio dimensionato sull'altezza (il layer mostra solo le stazioni con il dato)
  const r = snowRadius(s.snowDepth ?? 0);
  const size = r * 2;
  return L.divIcon({
    className: base,
    html: `<span class="st-snow" style="width:${size}px;height:${size}px"></span>${label(fmt(s.snowDepth, ' cm'), size + 4)}`,
    iconSize: [size, size],
    iconAnchor: [r, r],
  });
}

// Webcam: piccolo simbolo "fotocamera" in inchiostro, distinto dai simboli delle stazioni.
export function webcamIcon(c: Webcam, selected: boolean) {
  return L.divIcon({
    className: cls('wc', isOld(c.updatedAt) && 'wc--stale', selected && 'wc--sel'),
    html: '<span class="wc-sym"></span>',
    iconSize: [22, 18],
    iconAnchor: [11, 9],
  });
}

/** Etichetta del cluster per il layer attivo: intervallo dei valori misurati (solo dati freschi e presenti). */
export function clusterLabel(items: Station[], layer: Layer): string {
  layer = markerLayer(layer);
  const pick = (s: Station) => (layer === 'temp' ? s.temp : layer === 'wind' ? s.windSpeed : s.snowDepth);
  const v = items.filter((s) => !isStale(s)).map(pick).filter((x): x is number => x != null);
  if (!v.length) return '';
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  if (layer === 'temp') {
    const [a, b] = [round0(lo), round0(hi)];
    return a === b ? fmt(a, '°') : `${fmt(a)}…${fmt(b, '°')}`;
  }
  if (layer === 'wind') return `max ${fmt(Math.round(hi))}`;
  return hi === 0 ? '' : `max ${fmt(hi, ' cm')}`;
}

/** Segnaposto della località cercata: goccia rossa con centro carta (come lo spillo su una carta). */
export const placeIcon = L.divIcon({ className: 'pin', html: '<span class="pin-sym"></span>', iconSize: [28, 36], iconAnchor: [14, 34] });
