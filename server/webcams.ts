// Webcam: Windy Webcams API v3 (chiave in WINDY_API_KEY) + elenco pubblico ARPAV. Vedi DATA_SOURCES.md §3.
import type { SourceError, Webcam } from './types.js';
import { fetchText, mapLimit } from './util.js';

// ---------- Windy ----------

/** "Primiero: Val di Fiemme, Italy" → "Primiero: Val di Fiemme" (il paese è ovvio su una mappa di Veneto e Trentino). */
export const cleanTitle = (t: string) => t.replace(/,\s*(Italy|Italia|Austria|Österreich|Switzerland|Schweiz|Slovenia)\s*$/i, '').trim();
const WINDY = 'https://api.windy.com/webcams/api/v3/webcams';
const PAGE = 50; // massimo consentito per pagina; il piano free permette offset fino a 1000

export async function fetchWindy(key = process.env.WINDY_API_KEY): Promise<Webcam[]> {
  if (!key) throw new Error('WINDY_API_KEY non impostata');
  const page = async (offset: number) => {
    const url = `${WINDY}?regions=IT.20,IT.17&limit=${PAGE}&offset=${offset}&include=location,images,urls,player`;
    const res = await fetch(url, { headers: { 'x-windy-api-key': key }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Windy HTTP ${res.status}`);
    return (await res.json()) as { total: number; webcams: any[] };
  };
  const first = await page(0);
  const offsets = [];
  for (let o = PAGE; o < Math.min(first.total, 1000); o += PAGE) offsets.push(o);
  const rest = await mapLimit(offsets, 4, page);
  return [first, ...rest]
    .flatMap((p) => p.webcams)
    .filter((w) => w.status === 'active' && w.images?.current?.preview && w.location)
    .map((w) => ({
      id: `windy:${w.webcamId}`,
      source: 'windy',
      name: cleanTitle(String(w.title)),
      lat: Number(w.location.latitude),
      lon: Number(w.location.longitude),
      elevation: null, // Windy non fornisce la quota
      imageUrl: w.images.current.preview, // 400×224, URL valido ~15 min (piano free)
      pageUrl: w.urls?.detail ?? `https://windy.com/webcams/${w.webcamId}`, // link a windy.com obbligatorio
      updatedAt: w.lastUpdatedOn ?? null,
      timelapseUrl: w.player?.day ?? null, // player incorporabile (piano free: consentito)
    }));
}

// ---------- ARPAV (elenco di webcam di terzi nella pagina meteo ARPAV) ----------
const ARPAV_PAGE = 'https://meteo.arpa.veneto.it/?page=webcam';

interface ArpavCam { n: string; name: string; url: string; lat: number; lon: number }

/** Legge gli array JS names[i] / imageUrl[i] / points[i] della pagina. */
export function parseArpavWebcamPage(html: string): ArpavCam[] {
  const grab = (re: RegExp) => new Map([...html.matchAll(re)].map((m) => [m[1], m[2]]));
  const names = grab(/names\[(\d+)\]\s*=\s*'((?:[^'\\]|\\.)*)'/g);
  const urls = grab(/imageUrl\[(\d+)\]\s*=\s*'((?:[^'\\]|\\.)*)'/g);
  const points = grab(/points\[(\d+)\]\s*=\s*\[([^\]]*)\]/g);
  const out: ArpavCam[] = [];
  for (const [n, name] of names) {
    const url = urls.get(n);
    const [lat, lon] = (points.get(n) ?? '').split(',').map(Number);
    if (!url || !/^https?:\/\//.test(url) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({ n, name: name.replace(/\\'/g, "'"), url, lat, lon });
  }
  return out;
}

let arpavList: { at: number; data: Promise<ArpavCam[]> } | null = null;
/** Elenco ARPAV (solo parsing, nessuna verifica): serve anche al proxy immagini come lista di URL ammessi. Cache 1 h. */
export function getArpavList(): Promise<ArpavCam[]> {
  if (!arpavList || Date.now() - arpavList.at > 3_600_000) {
    const data = fetchText(ARPAV_PAGE, 'latin1').then(parseArpavWebcamPage);
    arpavList = { at: Date.now(), data };
    data.catch(() => (arpavList = null));
  }
  return arpavList.data;
}

/** Tiene solo le webcam che rispondono davvero con un'immagine (le pagine/player non hanno anteprima). */
async function probeImage(url: string): Promise<{ ok: boolean; lastModified: string | null }> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6_000) });
    await res.body?.cancel();
    const ok = res.ok && (res.headers.get('content-type') ?? '').startsWith('image/');
    const lm = res.headers.get('last-modified');
    return { ok, lastModified: lm && !Number.isNaN(Date.parse(lm)) ? new Date(lm).toISOString() : null };
  } catch {
    return { ok: false, lastModified: null };
  }
}

export async function fetchArpavWebcams(): Promise<Webcam[]> {
  const list = await getArpavList();
  if (!list.length) throw new Error('elenco webcam ARPAV vuoto (pagina cambiata?)');
  const probed = await mapLimit(list, 16, async (c) => ({ c, p: await probeImage(c.url) }));
  return probed
    .filter(({ p }) => p.ok)
    .map(({ c, p }) => ({
      id: `arpav:${c.n}`,
      source: 'arpav',
      name: c.name,
      lat: c.lat,
      lon: c.lon,
      elevation: null,
      imageUrl: `/api/webcam-image?id=${c.n}`, // via proxy: molte sono solo http e il browser le bloccherebbe su https
      pageUrl: c.url,
      updatedAt: p.lastModified,
      timelapseUrl: null, // le webcam ARPAV non hanno timelapse
    }));
}

// ---------- unione ----------
export interface WebcamsPayload { generatedAt: string; webcams: Webcam[]; errors: SourceError[] }

const near = (a: Webcam, b: Webcam) => Math.abs(a.lat - b.lat) < 0.002 && Math.abs(a.lon - b.lon) < 0.003; // ~200 m

let cache: { at: number; data: Promise<WebcamsPayload> } | null = null;
const TTL = 10 * 60_000; // sotto i 15 min di validità degli URL Windy

async function load(): Promise<WebcamsPayload> {
  const [w, a] = await Promise.allSettled([fetchWindy(), fetchArpavWebcams()]);
  const errors: SourceError[] = [];
  const windy = w.status === 'fulfilled' ? w.value : (errors.push({ source: 'windy', message: String(w.reason?.message ?? w.reason) }), []);
  const arpav = a.status === 'fulfilled' ? a.value : (errors.push({ source: 'arpav', message: `webcam: ${a.reason?.message ?? a.reason}` }), []);
  // Stessa webcam in entrambe le fonti: tengo quella Windy (immagine https, ora affidabile).
  const unique = arpav.filter((c) => !windy.some((x) => near(x, c)));
  return { generatedAt: new Date().toISOString(), webcams: [...windy, ...unique], errors };
}

export function getWebcams(): Promise<WebcamsPayload> {
  if (!cache || Date.now() - cache.at > TTL) {
    const data = load();
    cache = { at: Date.now(), data };
    data.catch(() => (cache = null));
  }
  return cache.data;
}
