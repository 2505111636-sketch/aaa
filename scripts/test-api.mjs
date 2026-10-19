import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'route-rescue-test-'));
const port = process.env.TEST_PORT || '3018';
const env = {
  ...process.env,
  TEST_INSTANCE: randomUUID(),
  BASE_URL: 'http://127.0.0.1:' + port,
  PORT: port,
  HOST: '127.0.0.1',
  DATABASE_DRIVER: 'sqlite',
  DATABASE_PATH: path.join(directory, 'test.sqlite'),
  ADMIN_PASSWORD: 'local-test-owner-password',
};
const server = spawn(process.execPath, ['dist/server/index.mjs'], {
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
});
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) throw Error('Test server stopped unexpectedly');
    try {
      const r = await fetch(env.BASE_URL + '/health');
      if (r.ok && (await r.json()).testInstance === env.TEST_INSTANCE) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw Error('The isolated test server did not become ready');
  for (const suite of ['api', 'insights-api', 'scene-reset', 'operations-api']) {
    const result = spawnSync(process.execPath, ['tests/' + suite + '.mjs'], {
      env,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status) throw Error(suite + ' failed');
  }
} finally {
  if (server.exitCode === null)
    await new Promise((resolve) => {
      server.once('exit', resolve);
      server.kill();
    });
  console.log('Isolated test database: ' + directory);
}
