import path from 'node:path';
export const serverOptions = {
  absWorkingDir: process.cwd(),
  entryPoints: [path.resolve('server/index.ts')],
  outfile: 'dist/server/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['vite'],
};
