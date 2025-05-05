import { build } from 'esbuild';

// Build server without bundling node_modules
build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist',
  format: 'esm',
  // Mark all packages in node_modules as external
  packages: 'external',
  // Improved error handling
  logLevel: 'info',
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});