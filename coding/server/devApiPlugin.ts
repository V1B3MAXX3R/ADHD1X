import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';

const MAX_BODY_BYTES = 6 * 1024 * 1024; // a 4 MB file becomes about 5.4 MB as text
const SERVER_ONLY_KEYS = ['GEMINI_API_KEY', 'ACCESS_CODE', 'GEMINI_MODEL_LITE', 'GEMINI_MODEL_FLASH'];

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

// Serves /api/ai/<preset> while running `npm run dev`, by running the same handler Vercel runs in
// production (api/ai/[preset].ts). Keys are read from .env into this server process only. They are
// never sent to the browser, because none of them start with VITE_ (hard rule 1).
export function devApiPlugin(): Plugin {
  return {
    name: 'adhd1x-dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const key of SERVER_ONLY_KEYS) {
        if (env[key] && !process.env[key]) process.env[key] = env[key];
      }

      server.middlewares.use('/api/ai', async (req, res) => {
        const preset = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!/^[a-zA-Z]+$/.test(preset)) return sendJson(res, 404, { ok: false, reason: 'unavailable' });

        let body: unknown = {};
        if (req.method === 'POST') {
          const text = await readBody(req);
          if (text === null) return sendJson(res, 413, { ok: false, reason: 'too_large' });
          try {
            body = text ? JSON.parse(text) : {};
          } catch {
            return sendJson(res, 400, { ok: false, reason: 'unavailable' });
          }
        }

        const vercelReq = Object.assign(req, { query: { preset }, body });
        const vercelRes = Object.assign(res, {
          status(code: number) {
            res.statusCode = code;
            return vercelRes;
          },
          json(payload: unknown) {
            sendJson(res, res.statusCode || 200, payload);
            return vercelRes;
          },
        });

        try {
          const mod = await server.ssrLoadModule('/api/ai/[preset].ts');
          await mod.default(vercelReq, vercelRes);
        } catch (err) {
          server.config.logger.error(`[adhd1x-dev-api] ${err instanceof Error ? err.message : 'handler failed'}`);
          if (!res.headersSent) sendJson(res, 500, { ok: false, reason: 'unavailable' });
        }
      });
    },
  };
}
