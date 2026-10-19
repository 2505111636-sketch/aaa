import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';
const { outputFiles } = await build({
  absWorkingDir: process.cwd(),
  entryPoints: [path.resolve('shared/operations-archive.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { archivedInsights, archiveThrough } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);
let previous = 0;
for (const days of [7, 14, 30]) {
  const d = archivedInsights(days, []),
    s = d.summary;
  assert.equal(d.source, 'archive');
  assert.equal(d.through, archiveThrough);
  assert.equal(d.daily.length, days);
  assert.equal(d.daily.at(-1).date, archiveThrough);
  assert.equal(
    s.requests,
    d.daily.reduce((n, x) => n + x.requested, 0),
  );
  assert.equal(
    s.completed,
    d.daily.reduce((n, x) => n + x.completed, 0),
  );
  assert.equal(
    s.requests,
    d.status.reduce((n, x) => n + x.count, 0),
  );
  assert.equal(
    s.requests,
    d.station.reduce((n, x) => n + x.requested, 0),
  );
  assert.equal(
    s.completed,
    d.station.reduce((n, x) => n + x.completed, 0),
  );
  assert.equal(
    s.handoffs,
    d.station.reduce((n, x) => n + x.received, 0),
  );
  assert.equal(s.requests, s.archived);
  assert.equal(s.active, 0);
  assert(s.requests > previous);
  assert(s.completionRate >= 90 && s.completionRate < 100);
  assert(s.avgWaitMinutes > 0 && s.avgWaitMinutes < 3);
  assert(s.avgServiceMinutes >= 9);
  assert(d.daily.every((x) => x.requested > 0 && x.completed <= x.requested));
  assert(d.needs.every((x) => x.count > 0));
  assert(d.station.every((x) => x.requested > 0));
  assert.equal(JSON.stringify(d), JSON.stringify(archivedInsights(days, [])));
  assert(!JSON.stringify(d).includes('archive-guest'));
  previous = s.requests;
  console.log('PASS ' + days + '天档案：聚合、日期、站点、需求、响应时间、稳定性和隐私一致');
}
