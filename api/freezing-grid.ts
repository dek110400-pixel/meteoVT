// Vercel Serverless Function: GET /api/freezing-grid — zero termico previsto su griglia, prossime 48 ore
import { getGrid } from '../server/freezing.js';

export async function GET(): Promise<Response> {
  try {
    return Response.json(await getGrid(), { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=1800' } });
  } catch (e) {
    return Response.json({ error: `zero termico non disponibile: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
