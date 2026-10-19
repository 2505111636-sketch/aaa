import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({
  absWorkingDir: process.cwd(),
  entryPoints: ['shared/insights.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});
const { summarize, periodStart } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64')
);
const now = Date.parse('2026-10-19T01:00:00Z'),
  start = periodStart(now, 7),
  DAY = 86400000;
assert.equal(
  new Date(periodStart(Date.parse('2026-10-18T16:00:00Z'), 7)).toISOString(),
  '2026-10-12T16:00:00.000Z',
);
const task = (id, created, status = 'pending', extra = {}) => ({
  id,
  passenger: 'passenger01',
  origin: 'A',
  target: 'B',
  needs: '["轮椅通行","工作人员引导"]',
  created,
  status,
  archived: 0,
  ...extra,
});
const rows = [
  task('archived', start, 'completed', { archived: 1 }),
  task('pending', now - 120000),
  task('previous', start - 1, 'completed'),
  task('ancient', start - DAY * 20),
  task('future', now + 1),
];
const events = [
  { task: 'archived', actor: 'staffA', label: '陈雨 · A站服务 接单', created: start + 60000 },
  { task: 'archived', actor: 'staffA', label: '陈雨 · A站服务 接单', created: start + 180000 },
  {
    task: 'archived',
    actor: 'staffA',
    label: '已向 东湖广场 发送交接，等待接收确认',
    created: start + 240000,
  },
  {
    task: 'archived',
    actor: 'passenger01',
    label: '乘客确认服务完成，恢复行程',
    created: start + 600000,
  },
];
const report = summarize(rows, events, [], now, 7);
assert.equal(report.daily.length, 7);
assert.equal(report.daily[0].requested, 1);
assert.equal(report.daily.at(-1).requested, 1);
assert.equal(report.summary.requests, 2);
assert.equal(report.summary.previousRequests, 1);
assert.equal(report.summary.archived, 1);
assert.equal(report.summary.completed, 1);
assert.equal(report.summary.completionRate, 50);
assert.equal(report.summary.avgWaitMinutes, 1);
assert.equal(report.summary.avgServiceMinutes, 10);
assert.equal(report.summary.handoffs, 1);
assert.equal(report.station.find((s) => s.id === 'B').received, 1);
assert.equal(report.needs[0].count, 2);
assert.equal(report.summary.active, 3);
assert.equal(report.summary.unassigned, 2);
const empty = summarize([], [], [], now, 30);
assert.equal(empty.daily.length, 30);
assert.equal(empty.summary.avgWaitMinutes, null);
assert.equal(empty.summary.avgServiceMinutes, null);
assert.equal(empty.summary.requests, 0);
assert(!JSON.stringify(report).includes('passenger01'));
assert(!JSON.stringify(report).includes('陈雨'));
console.log(
  'PASS: Shanghai date boundaries, period comparison, archived totals, first claim timing, confirmed completion duration, station handoff, empty data and aggregated privacy',
);
