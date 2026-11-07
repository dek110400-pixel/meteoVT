// Vercel Serverless Function: GET /api/webcams
import { getWebcams } from '../server/webcams.js';

export async function GET(): Promise<Response> {
  return Response.json(await getWebcams(), {
    // 10 min: gli URL immagine Windy (piano free) scadono dopo ~15 min
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' },
  });
}
