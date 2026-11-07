// Vercel Serverless Function: GET /api/forecast?lat=46.5&lon=11.88&elev=1642
import { getForecast, parsePoint } from '../server/forecast.js';

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams;
  const p = parsePoint(q.get('lat'), q.get('lon'), q.get('elev'));
  if (!p) return Response.json({ error: 'punto non valido o fuori da Veneto/Trentino' }, { status: 400 });
  try {
    return Response.json(await getForecast(p), { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800' } });
  } catch (e) {
    return Response.json({ error: `previsioni non disponibili: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
