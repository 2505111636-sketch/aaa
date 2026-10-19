import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import { serverOptions } from './build-options.mjs';
import './setup.mjs';
let child;
const build = await context({
  ...serverOptions,
  plugins: [
    {
      name: 'restart-development-server',
      setup(builder) {
        builder.onEnd(async (result) => {
          if (result.errors.length) return;
          if (child && child.exitCode === null) {
            await new Promise((resolve) => {
              child.once('exit', resolve);
              child.kill();
            });
          }
          child = spawn(process.execPath, ['dist/server/index.mjs'], {
            stdio: 'inherit',
            env: { ...process.env, NODE_ENV: 'development' },
          });
        });
      },
    },
  ],
});
await build.watch();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    child?.kill();
    await build.dispose();
    process.exit(0);
  });
