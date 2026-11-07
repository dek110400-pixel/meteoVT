import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo serve le stesse funzioni di /api che su Vercel girano come Serverless Functions,
// così `npm run dev` basta da solo (niente `vercel dev`).
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${url.pathname.slice(5)}.ts`);
          const response: Response = await mod.GET(new Request(url));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), '')); // .env.local → process.env per il codice server
  return { plugins: [react(), devApi()] };
});
