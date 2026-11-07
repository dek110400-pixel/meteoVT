// Vercel Serverless Function: GET /api/geocode?q=Passo%20Giau
import { cleanQuery, searchPlaces } from '../server/geocode.js';

export async function GET(request: Request): Promise<Response> {
  const q = cleanQuery(new URL(request.url).searchParams.get('q') ?? '');
  if (q.length < 2) return Response.json({ places: [] });
  try {
    return Response.json({ places: await searchPlaces(q) }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch {
    return Response.json({ error: 'Ricerca non disponibile in questo momento' }, { status: 502 });
  }
}
