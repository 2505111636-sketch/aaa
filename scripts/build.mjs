import path from 'node:path';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import { build as bundle } from 'esbuild';
import { serverOptions } from './build-options.mjs';
await viteBuild({
  configFile: false,
  root: path.resolve('frontend'),
  publicDir: path.resolve('public'),
  plugins: [react()],
  build: { outDir: path.resolve('dist/client'), emptyOutDir: true },
});
await bundle(serverOptions);
