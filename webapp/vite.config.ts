import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleTideProxyRequest } from './shared/tideParser';

interface CacheEntry {
  expiresAt: number;
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function tideProxyPlugin(): Plugin {
  const cache = new Map<string, CacheEntry>();

  return {
    name: 'tide-proxy-middleware',
    configureServer(server) {
      server.middlewares.use('/api/tide', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.end();
          return;
        }
        if (req.method !== 'GET') {
          next();
          return;
        }

        const reqUrl = new URL(req.url ?? '', 'http://localhost');
        const targetUrl = reqUrl.searchParams.get('url');

        if (targetUrl) {
          const cached = cache.get(targetUrl);
          if (cached && cached.expiresAt > Date.now()) {
            res.statusCode = cached.status;
            for (const [k, v] of Object.entries(cached.headers)) {
              res.setHeader(k, v);
            }
            res.end(JSON.stringify(cached.body));
            return;
          }
        }

        const result = await handleTideProxyRequest(targetUrl);
        if (targetUrl && result.status === 200) {
          cache.set(targetUrl, {
            ...result,
            expiresAt: Date.now() + 15 * 60 * 1000,
          });
        }

        res.statusCode = result.status;
        for (const [k, v] of Object.entries(result.headers)) {
          res.setHeader(k, v);
        }
        res.end(JSON.stringify(result.body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), tideProxyPlugin()],
});
