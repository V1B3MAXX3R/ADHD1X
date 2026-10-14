import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import handler from './api/ai/[preset].ts';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://github.com/V1B3MAXX3R/ADHD1X.git';
let currentCommit = 'bdae2cd907500665d6095a7f1873a1c8211c06d5';
let lastSyncCheck = new Date().toISOString();
let isSyncing = false;

export async function checkAndSyncFromGitHub(): Promise<{ updated: boolean; commit: string }> {
  if (isSyncing) return { updated: false, commit: currentCommit };
  isSyncing = true;
  lastSyncCheck = new Date().toISOString();

  try {
    await execAsync('git fetch origin main');
    const { stdout } = await execAsync('git rev-parse origin/main');
    const remoteHash = stdout.trim();
    if (!remoteHash) {
      return { updated: false, commit: currentCommit };
    }

    if (remoteHash !== currentCommit) {
      console.log(`[AutoSync] New GitHub commit detected: ${remoteHash} (current: ${currentCommit})`);
      
      // Merge/checkout latest tracked files
      await execAsync('git checkout origin/main -- coding instructions artifacts research 2>/dev/null || true');

      // Sync live app source directories from coding/
      await execAsync('rm -rf ./src && cp -r ./coding/src ./src');
      await execAsync('rm -rf ./server && cp -r ./coding/server ./server');
      await execAsync('rm -rf ./public && cp -r ./coding/public ./public');
      await execAsync('rm -rf ./scripts && cp -r ./coding/scripts ./scripts');
      await execAsync('rm -rf ./tests && cp -r ./coding/tests ./tests');

      currentCommit = remoteHash;
      console.log(`[AutoSync] Live app successfully synced to GitHub commit ${remoteHash}`);
      return { updated: true, commit: currentCommit };
    }

    return { updated: false, commit: currentCommit };
  } catch (err) {
    console.warn('[AutoSync] Error checking GitHub:', (err as Error).message);
    return { updated: false, commit: currentCommit };
  } finally {
    isSyncing = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post('/api/ai/:preset', async (req, res) => {
    (req as any).query = { ...req.query, preset: req.params.preset };
    try {
      await handler(req as any, res as any);
    } catch (err) {
      console.error('Error in AI preset handler:', err);
      if (!res.headersSent) {
        res.status(500).json({ ok: false, reason: 'unavailable' });
      }
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, app: 'ADHD1X', commit: currentCommit });
  });

  // GitHub Auto-Sync status & manual trigger
  app.get('/api/sync', (_req, res) => {
    res.json({
      ok: true,
      repo: REPO_URL,
      branch: 'main',
      currentCommit,
      lastSyncCheck,
      pollingIntervalSeconds: 30,
    });
  });

  app.post('/api/sync', async (_req, res) => {
    const result = await checkAndSyncFromGitHub();
    res.json({
      ok: true,
      ...result,
      repo: REPO_URL,
      lastSyncCheck,
    });
  });

  // Frontend Dev Server (Vite middleware) or Static Files in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ADHD1X dev server listening on http://0.0.0.0:${PORT}`);
    console.log(`[AutoSync] Monitoring ${REPO_URL} on branch 'main' (every 30s)`);

    // Initial sync check on boot
    void checkAndSyncFromGitHub();

    // Regular background polling every 30 seconds
    setInterval(() => {
      void checkAndSyncFromGitHub();
    }, 30_000);
  });
}

void startServer();
