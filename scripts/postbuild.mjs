// Hostinger deploys only the build output directory (dist/) and does NOT install
// node_modules there. So bundle the Express server + all its packages into one
// self-contained dist/server.js that needs nothing but Node itself.
import { build } from 'esbuild'; // ships with vite
import { writeFileSync } from 'node:fs';

await build({
  entryPoints: ['server.js'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['vite'],
  // Bundled CommonJS packages (express etc.) call require() for Node built-ins.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

// Mark dist/ as ESM so Node loads server.js correctly.
writeFileSync('dist/package.json', JSON.stringify({
  name: 'dainty-runtime', private: true, type: 'module',
  scripts: { start: 'node server.js' },
}, null, 2));

console.log('[postbuild] Bundled server into dist/server.js');
