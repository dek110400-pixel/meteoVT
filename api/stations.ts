// Vercel Serverless Function: GET /api/stations
import { getStations } from '../server/stations.js';

export async function GET(): Promise<Response> {
  const data = await getStations();
  return Response.json(data, {
    headers: {
      // Cache CDN Vercel 10 min; poi serve il dato vecchio mentre rigenera in background.
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=600',
    },
  });
}
