import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/,
  /VITE_GEMINI_API_KEY/,
  /VITE_ACCESS_CODE/,
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.vercel'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name !== 'secret-scan.mjs' && entry.name !== 'setup-coding.mjs' && !entry.name.startsWith('.env')) files.push(full);
  }
  return files;
}

let found = 0;
for (const file of walk(process.cwd())) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      console.error(`Secret pattern ${pattern} matched in ${file}`);
      found++;
    }
  }
}

if (found > 0) process.exit(1);
console.log('Secret scan passed: 0 secrets found in repo or build artifacts.');
