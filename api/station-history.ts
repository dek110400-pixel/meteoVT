// Vercel Serverless Function: GET /api/station-history?id=arpav:9 | meteotrentino:T0147
import { getHistory, isStationId } from '../server/history.js';

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!isStationId(id)) return Response.json({ error: 'id stazione non valido' }, { status: 400 });
  try {
    return Response.json(await getHistory(id), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
    });
  } catch (e) {
    return Response.json({ error: `fonte non raggiungibile: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
