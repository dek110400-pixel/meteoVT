import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { FreezingGrid } from '../server/freezing';
import { freezingAt } from '../server/freezing';

// Quote del terreno: tile "Terrarium" (AWS Open Data, Mapzen). quota = R*256 + G + B/256 - 32768 (metri).
const DEM = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const DEM_MAX_ZOOM = 14; // oltre si ingrandisce la tile del livello 14 (~10 m/pixel: più che sufficiente)

// Tinta "ghiaccio" del terreno sopra lo zero termico, e colore della linea (isoipsa dello zero termico).
const ICE: [number, number, number, number] = [111, 168, 214, 92]; // RGBA, alpha 0–255
const LINE: [number, number, number, number] = [22, 74, 128, 255];

const demCache = new Map<string, Promise<Float32Array | null>>();

/** Scarica e decodifica una tile di quote (256×256). null se non disponibile (es. mare). */
function loadDem(z: number, x: number, y: number): Promise<Float32Array | null> {
  const key = `${z}/${x}/${y}`;
  let p = demCache.get(key);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, 256, 256).data;
        const out = new Float32Array(256 * 256);
        for (let i = 0; i < out.length; i++) out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
        resolve(out);
      };
      img.onerror = () => resolve(null);
      img.src = DEM(z, x, y);
    });
    if (demCache.size > 400) demCache.clear();
    demCache.set(key, p);
  }
  return p;
}

const tile2lat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};
const tile2lon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;

/**
 * Disegna una tile: terreno sopra lo zero termico in azzurro, e la linea dove il terreno attraversa lo zero termico.
 * Nessuna stima oltre la griglia: fuori griglia o dove manca il dato la tile resta vuota.
 */
/**
 * Quota in un pixel della tile mostrata. Sotto lo zoom massimo del DEM uso le 4 tile del livello successivo
 * (risoluzione doppia: linea più liscia); sopra, ingrandisco la tile DEM del livello massimo.
 */
async function demSampler(c: L.Coords): Promise<{ S: number; h: (px: number, py: number) => number } | null> {
  if (c.z < DEM_MAX_ZOOM) {
    const z = c.z + 1;
    const parts = await Promise.all([0, 1, 2, 3].map((i) => loadDem(z, c.x * 2 + (i % 2), c.y * 2 + (i >> 1))));
    if (parts.every((p) => !p)) return null;
    return {
      S: 512,
      h: (px, py) => {
        const p = parts[(py >= 256 ? 2 : 0) + (px >= 256 ? 1 : 0)];
        return p ? p[(py % 256) * 256 + (px % 256)] : -32768;
      },
    };
  }
  const k = 2 ** (c.z - DEM_MAX_ZOOM);
  const dem = await loadDem(DEM_MAX_ZOOM, Math.floor(c.x / k), Math.floor(c.y / k));
  if (!dem) return null;
  const ox = (c.x % k) * (256 / k);
  const oy = (c.y % k) * (256 / k);
  return { S: 256, h: (px, py) => dem[Math.floor(oy + py / k) * 256 + Math.floor(ox + px / k)] };
}

async function drawTile(canvas: HTMLCanvasElement, c: L.Coords, grid: FreezingGrid, hour: number) {
  const values = grid.values[hour];
  if (!values) return;
  const dem = await demSampler(c);
  if (!dem) return;
  const { S } = dem;
  canvas.width = canvas.height = S;

  const above = new Uint8Array(S * S); // 1 = terreno sopra lo zero termico, 2 = nessun dato (mare, fuori griglia)
  for (let py = 0; py < S; py++) {
    const lat = tile2lat(c.y + (py + 0.5) / S, c.z);
    for (let px = 0; px < S; px++) {
      const fz = freezingAt(grid, values, lat, tile2lon(c.x + (px + 0.5) / S, c.z));
      const h = dem.h(px, py);
      above[py * S + px] = fz == null || h < -100 ? 2 : h >= fz ? 1 : 0;
    }
  }
  // bordo: pixel con un vicino dall'altra parte dello zero termico; poi allargo di 1 pixel per una linea di ~2 px a schermo
  const edge = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const a = above[i];
    if (a === 2) continue;
    const px = i % S;
    const diff = (j: number) => above[j] !== 2 && above[j] !== a;
    if ((px < S - 1 && diff(i + 1)) || (i + S < S * S && diff(i + S))) edge[i] = 1;
  }
  const thick = c.z >= 11; // da vicino ~2 px a schermo, da lontano ~1 px come una curva di livello stampata
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let i = 0; i < S * S; i++) {
    if (above[i] === 2) continue;
    const px = i % S;
    const near = edge[i] || (thick && ((px > 0 && edge[i - 1]) || (i >= S && edge[i - S]) || (px > 0 && i >= S && edge[i - S - 1])));
    const col = near ? LINE : above[i] === 1 ? ICE : null;
    if (col) d.set(col, i * 4);
  }
  ctx.putImageData(img, 0, 0);
}

interface Props {
  grid: FreezingGrid;
  hour: number;
}

/** Strato della mappa con l'isoipsa dello zero termico per l'ora scelta. */
export function FreezingLayer({ grid, hour }: Props) {
  const map = useMap();
  const layer = useRef<L.GridLayer | null>(null);
  const state = useRef({ grid, hour });
  state.current = { grid, hour };

  useEffect(() => {
    if (!map.getPane('freezing')) {
      const p = map.createPane('freezing');
      p.style.zIndex = '350'; // sopra la base topografica, sotto i simboli
      p.style.pointerEvents = 'none';
    }
    const Layer = L.GridLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const canvas = L.DomUtil.create('canvas', 'freezing-tile') as HTMLCanvasElement;
        canvas.width = canvas.height = 256;
        drawTile(canvas, coords, state.current.grid, state.current.hour).then(
          () => done(undefined, canvas),
          (e) => done(e, canvas),
        );
        return canvas;
      },
    });
    const l: L.GridLayer = new (Layer as any)({ pane: 'freezing', tileSize: 256, maxZoom: 17, updateWhenIdle: true, keepBuffer: 1 });
    l.addTo(map);
    layer.current = l;
    return () => {
      l.remove();
      layer.current = null;
    };
  }, [map]);

  useEffect(() => {
    layer.current?.redraw(); // nuova ora o nuova griglia: le tile DEM sono già in cache, si ricolora soltanto
  }, [grid, hour]);

  return null;
}
