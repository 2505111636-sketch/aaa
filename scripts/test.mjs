import { spawnSync } from 'node:child_process';
const suites = [
  ['--test', 'tests/cookies.test.mjs'],
  ['tests/model.mjs'],
  ['tests/request-id.mjs'],
  ['tests/insights.mjs'],
  ['tests/operations-archive.mjs'],
];
for (const args of suites) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status) process.exit(r.status);
}
