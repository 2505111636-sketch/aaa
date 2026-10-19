import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { mergeCookies } from './cookies.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:3018',
  password = process.env.ADMIN_PASSWORD;
if (!password) throw Error('Set the server administrator test password');
const cookies = {},
  checks = [];
async function req(who, path, data, status = 200) {
  const r = await fetch(base + '/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      ...(cookies[who] ? { Cookie: cookies[who] } : {}),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: base }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });
  const b = await r.json();
  assert.equal(r.status, status, JSON.stringify(b));
  cookies[who] = mergeCookies(cookies[who], r.headers.getSetCookie());
  return b;
}
async function check(label, fn) {
  await fn();
  checks.push(label);
  console.log('PASS ' + label);
}
await check('匿名无权访问总体统计', () => req('anon', 'insights', undefined, 401));
for (const who of ['passenger01', 'staffA', 'admin'])
  await req(who, 'login', { username: who, password: who === 'admin' ? password : 'Route2026!' });
for (const who of ['passenger01', 'staffA'])
  await check(who + ' 无权访问统计接口', () => req(who, 'insights?days=30', undefined, 403));
for (const days of [7, 14, 30])
  await check('管理员可读取 ' + days + ' 天聚合趋势', async () => {
    const d = await req('admin', 'insights?days=' + days);
    assert.equal(d.daily.length, days);
    assert.equal(
      d.summary.requests,
      d.daily.reduce((n, x) => n + x.requested, 0),
    );
    assert.equal(
      d.summary.completed,
      d.daily.reduce((n, x) => n + x.completed, 0),
    );
    assert(!JSON.stringify(d).includes('passenger01'));
  });
await check('无效统计范围被拒绝', () => req('admin', 'insights?days=999', undefined, 400));
await check('统计接口不接受写入方法', () => req('admin', 'insights', {}, 404));
const baseline = await req('admin', 'insights'),
  id = crypto.randomUUID();
try {
  await check('新增请求实时反映在概览', async () => {
    await req(
      'passenger01',
      'tasks',
      { id, location: '列车上', needs: ['轮椅通行'], plan: 'next', note: '页面升级验收' },
      201,
    );
    const next = await req('admin', 'insights');
    assert.equal(next.summary.requests, baseline.summary.requests + 1);
    assert.equal(next.summary.pending, baseline.summary.pending + 1);
  });
  await check('取消操作更新趋势与状态分布', async () => {
    const state = await req('passenger01', 'state'),
      t = state.tasks.find((t) => t.id === id);
    await req('passenger01', 'action', { id, version: t.version, action: 'cancel' });
    const next = await req('admin', 'insights');
    assert.equal(next.summary.pending, baseline.summary.pending);
    assert.equal(
      next.status.find((s) => s.key === 'cancelled').count,
      baseline.status.find((s) => s.key === 'cancelled').count + 1,
    );
  });
} finally {
  const s = await req('passenger01', 'state'),
    t = s.tasks.find((t) => t.id === id);
  if (t && !['completed', 'cancelled'].includes(t.status))
    await req('passenger01', 'action', { id, version: t.version, action: 'cancel' });
}
await fs.writeFile(
  'test-results/insights-api-report.json',
  JSON.stringify({ base, at: new Date().toISOString(), status: 'PASS', checks }, null, 2),
);
