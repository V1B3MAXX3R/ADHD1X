import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devApiPlugin } from './server/devApiPlugin';

// The same security headers the live site sends (vercel.json is the one place they are written), so
// `npm run build` then `npm run preview` behaves like the real thing, including the Content Security Policy.
const securityHeaders: Record<string, string> = Object.fromEntries(
  (JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')).headers[0].headers as { key: string; value: string }[]).map(
    (h) => [h.key, h.value],
  ),
);

export default defineConfig({
  plugins: [react(), devApiPlugin()],
  // The dev server only answers this computer. Reaching it from a phone needs an explicit `--host`.
  server: { host: 'localhost' },
  preview: { host: 'localhost', headers: securityHeaders },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
  },
});
