// Vercel Serverless Function: GET /api/webcam-image?id=N
// Proxy per le immagini dell'elenco ARPAV (molte solo http → bloccate su una pagina https).
// Accetta SOLO id presenti nell'elenco: non è un proxy aperto verso URL arbitrari.
import { getArpavList } from '../server/webcams.js';

const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^\d+$/.test(id)) return new Response('id non valido', { status: 400 });
  const cam = (await getArpavList()).find((c) => c.n === id);
  if (!cam) return new Response('webcam sconosciuta', { status: 404 });

  try {
    const res = await fetch(cam.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8_000) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return new Response('immagine non disponibile', { status: 502 });
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return new Response('immagine troppo grande', { status: 502 });
    return new Response(body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=120, s-maxage=300', // 5 min: non martelliamo i siti dei proprietari
        ...(res.headers.get('last-modified') ? { 'Last-Modified': res.headers.get('last-modified')! } : {}),
      },
    });
  } catch {
    return new Response('webcam non raggiungibile', { status: 504 });
  }
}
