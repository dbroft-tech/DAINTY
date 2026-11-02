// Hostinger deploys only the build output directory (dist/) and runs the entry
// file from there. Copy the Express server into dist/ so `server.js` exists.
import { cpSync, readFileSync, writeFileSync } from 'node:fs';

cpSync('server.js', 'dist/server.js');
cpSync('server', 'dist/server', { recursive: true });
cpSync('api', 'dist/api', { recursive: true });

// Runtime-only package.json (ESM + prod deps) so Node and npm work inside dist/.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const runtimeDeps = ['express', 'bcryptjs', 'jsonwebtoken', 'cookie-parser'];
writeFileSync('dist/package.json', JSON.stringify({
  name: pkg.name,
  private: true,
  version: pkg.version,
  type: 'module',
  engines: pkg.engines,
  scripts: { start: 'node server.js' },
  dependencies: Object.fromEntries(runtimeDeps.map(d => [d, pkg.dependencies[d]])),
}, null, 2));

console.log('[postbuild] Copied server into dist/');
