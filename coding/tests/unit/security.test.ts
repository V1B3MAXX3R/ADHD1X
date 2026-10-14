import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Guards for the protections described in SECURITY.md. They fail if someone removes one by accident.

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('Security headers (vercel.json)', () => {
  const headers = Object.fromEntries(
    (JSON.parse(read('vercel.json')).headers[0].headers as { key: string; value: string }[]).map((h) => [h.key, h.value]),
  );
  const csp = headers['Content-Security-Policy'];

  it('sends a strict Content Security Policy with no inline or eval scripts or styles', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:/);
  });

  it('sends the other protective headers', () => {
    expect(headers['Strict-Transport-Security']).toMatch(/max-age=\d{7,}/);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(headers['Permissions-Policy']).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
  });
});

describe('Keeping secrets and personal data out of git', () => {
  const ignore = read('.gitignore').split(/\r?\n/);

  it('ignores .env files, grade exports, backups and calendar files', () => {
    for (const pattern of ['.env', '.env.*', 'canvas-grades*.json', 'adhd1x-export-*.json', '*.ics']) {
      expect(ignore, pattern).toContain(pattern);
    }
    expect(ignore).toContain('!.env.example');
  });

  it('keeps secrets in .env.example empty and never exposes them to the browser', () => {
    const lines = read('.env.example').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l));
    for (const secret of ['GEMINI_API_KEY', 'ACCESS_CODE']) {
      expect(lines.find((l) => l.startsWith(`${secret}=`)), secret).toBe(`${secret}=`);
    }
    expect(lines.some((l) => l.startsWith('VITE_'))).toBe(false);
  });

  it('never reads a secret through import.meta.env in browser code', () => {
    const offenders = sourceFiles(path.join(ROOT, 'src')).filter((f) => /import\.meta\.env\.VITE_\w*(KEY|SECRET|TOKEN|CODE)/i.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('Dangerous code patterns stay out of the app', () => {
  const files = [...sourceFiles(path.join(ROOT, 'src')), ...sourceFiles(path.join(ROOT, 'server')), ...sourceFiles(path.join(ROOT, 'api'))];
  const banned: [string, RegExp][] = [
    ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
    ['innerHTML / outerHTML', /\.(inner|outer)HTML\s*=/],
    ['eval', /\beval\s*\(/],
    ['new Function', /new Function\s*\(/],
    ['document.write', /document\.write\s*\(/],
    ['insertAdjacentHTML', /insertAdjacentHTML/],
    ['opening links with target=_blank', /target=["']_blank["']/],
  ];

  it.each(banned)('has no %s', (_label, pattern) => {
    expect(files.filter((f) => pattern.test(readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it('only talks to its own server from the browser (the CSP allows nothing else)', () => {
    const offenders = sourceFiles(path.join(ROOT, 'src')).filter((f) => /\bfetch\(\s*['"`]https?:/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('The Python Canvas tool keeps its safety rules', () => {
  const tool = read('tools/canvas_grades/canvas_grades.py');

  it('has no option that takes the token on the command line', () => {
    expect(tool).not.toMatch(/add_argument\(\s*["']--(token|cookie|password|secret)["']/);
  });

  it('only uses the standard library and only makes GET requests', () => {
    expect(tool).not.toMatch(/^\s*(import|from)\s+(requests|httpx|aiohttp|urllib3)\b/m);
    expect(tool).not.toMatch(/method\s*=\s*["'](POST|PUT|PATCH|DELETE)["']/);
    expect(existsSync(path.join(ROOT, 'tools/canvas_grades/test_canvas_grades.py'))).toBe(true);
  });
});
