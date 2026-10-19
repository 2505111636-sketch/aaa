import { mergeCookies } from './cookies.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
let adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) throw new Error('Run npm run test:api to use an isolated test database.');
const results = [];
const cookies = {};
async function req(who, path, data, expected = 200, origin = base) {
  const r = await fetch(base + '/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: origin }),
      ...(cookies[who] ? { Cookie: cookies[who] } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const raw = await r.text();
  let b;
  try {
    b = JSON.parse(raw);
  } catch {
    b = { error: raw };
  }
  assert.equal(r.status, expected, `${who} ${path}: ${JSON.stringify(b)}`);
  cookies[who] = mergeCookies(cookies[who], r.headers.getSetCookie());
  return b;
}
async function check(name, fn) {
  await fn();
  results.push({ name, status: 'PASS' });
  console.log('PASS ' + name);
}
async function state(who) {
  return req(who, 'state');
}
async function task(who, id) {
  return (await state(who)).tasks.find((t) => t.id === id);
}
async function act(who, id, action, expected = 200, version) {
  const t = await task(who, id);
  return req(who, 'action', { id, version: version ?? t?.version, action }, expected);
}
let id, id2;
await check('匿名读取受保护数据返回 401', () => req('anon', 'state', undefined, 401));
await check('伪造 Cookie 无法登录', async () => {
  cookies.forged = 'rr_session=admin';
  await req('forged', 'state', undefined, 401);
});
await check('跨站来源请求返回 403', () =>
  req(
    'anon',
    'login',
    { username: 'staffA', password: 'Route2026!' },
    403,
    'https://example.invalid',
  ),
);
await check('错误密码返回 401', () =>
  req('anon', 'login', { username: 'passenger02', password: 'wrong' }, 401),
);
for (const a of ['passenger01', 'passenger02', 'staffA', 'staffB', 'staffC', 'admin'])
  await check(`${a} 可登录且角色来自服务端`, async () => {
    const b = await req(a, 'login', {
      username: a,
      password: a === 'admin' ? adminPassword : 'Route2026!',
    });
    assert.equal(b.account.id, a);
  });
await check('管理员重置成功', () => req('admin', 'admin', { action: 'reset', confirm: 'RESET' }));
await check('乘客不能修改设施', () =>
  req('passenger01', 'admin', { action: 'facility', id: 'A-E2', status: 'fault' }, 403),
);
await check('工作人员不能调用管理员归档接口', () =>
  req('staffA', 'admin', { action: 'reset', confirm: 'RESET' }, 403),
);
await check('重置需要确认文本', () => req('admin', 'admin', { action: 'reset' }, 400));
await check('管理员设置设施故障并在其他设备可见', async () => {
  await req('admin', 'admin', { action: 'facility', id: 'A-E2', status: 'fault' });
  assert.equal(
    (await state('passenger01')).facilities.find((f) => f.id === 'A-E2').status,
    'fault',
  );
});
await check('不合法求助被拒绝', () =>
  req(
    'passenger01',
    'tasks',
    { id: crypto.randomUUID(), location: '真实未知位置', needs: [], plan: 'next', note: '' },
    400,
  ),
);
await check('故障接应站阻止方案提交', async () => {
  await req('admin', 'admin', { action: 'facility', id: 'B-E1', status: 'fault' });
  await req(
    'passenger01',
    'tasks',
    { id: crypto.randomUUID(), location: '列车上', needs: ['轮椅通行'], plan: 'next', note: '' },
    409,
  );
  await req('admin', 'admin', { action: 'facility', id: 'B-E1', status: 'healthy' });
});
const payload = () => ({
  id: crypto.randomUUID(),
  location: '列车上',
  needs: ['轮椅通行', '工作人员引导'],
  plan: 'next',
  note: '虚拟需求：在车门接应',
});
await check('乘客创建求助并持久保存', async () => {
  const p = payload();
  id = p.id;
  await req('passenger01', 'tasks', p, 201);
  assert.equal((await task('passenger01', id)).status, 'pending');
});
await check('同一请求幂等，无重复任务', async () => {
  await req('passenger01', 'tasks', { ...payload(), id });
  assert.equal((await state('passenger01')).tasks.filter((t) => t.id === id).length, 1);
});
await check('阻止重复活动求助', () => req('passenger01', 'tasks', payload(), 409));
await check('另一乘客看不到他人的任务和事件', async () => {
  const s = await state('passenger02');
  assert(!s.tasks.some((t) => t.id === id));
  assert(!s.events.some((e) => e.task === id));
});
await check('另一乘客不能操作他人任务', () =>
  req('passenger02', 'action', { id, version: 1, action: 'cancel' }, 403),
);
await check('交接前 B站不能查看或接单', async () => {
  assert(!(await state('staffB')).tasks.some((t) => t.id === id));
  await req('staffB', 'action', { id, version: 1, action: 'claim' }, 403);
});
await check('乘客发起人工关注演示队列', async () => {
  await act('passenger01', id, 'escalate');
  assert.equal((await task('passenger01', id)).escalated, 1);
});
await check('A站可接单', async () => {
  await act('staffA', id, 'claim');
  assert.equal((await task('passenger01', id)).assigned, 'staffA');
});
await check('并发过期版本被拒绝', () =>
  req('staffA', 'action', { id, version: 1, action: 'depart' }, 409),
);
await check('不允许跳过到场直接交接', () => act('staffA', id, 'handoff', 409));
await check('工作人员准备完成后赶往现场', () => act('staffA', id, 'depart'));
await check('工作人员确认到场', () => act('staffA', id, 'arrive'));
await check('跨站交接后 B站获得任务权限', async () => {
  await act('staffA', id, 'handoff');
  assert.equal((await task('staffB', id)).status, 'handoff_pending');
});
await check('C站仍无权限', () =>
  req('staffC', 'action', { id, version: 6, action: 'receive' }, 403),
);
await check('交接未接收时不能完成', () => act('staffA', id, 'finish', 409));
await check('B站确认接收', () => act('staffB', id, 'receive'));
await check('原站不能代接收站完成', () => act('staffA', id, 'finish', 409));
await check('B站确认完成，等待乘客确认', async () => {
  await act('staffB', id, 'finish');
  assert.equal((await task('passenger01', id)).status, 'awaiting_confirmation');
});
await check('乘客确认后任务才完成', async () => {
  await act('passenger01', id, 'confirm');
  assert.equal((await task('passenger01', id)).status, 'completed');
});
await check('完整时间线包含所有阶段', async () => {
  const s = await state('passenger01');
  assert.equal(s.events.filter((e) => e.task === id).length, 9);
});
await check('新设备登录后可读取服务记录', async () => {
  await req('device2', 'login', { username: 'passenger01', password: 'Route2026!' });
  assert.equal((await task('device2', id)).status, 'completed');
});
await check('完成任务禁止再次取消', () => act('passenger01', id, 'cancel', 409));
await check('两位工作人员同时接单只有一个成功', async () => {
  const p = payload();
  id2 = p.id;
  await req('passenger02', 'tasks', p, 201);
  const t = await task('staffA', id2);
  const responses = await Promise.all(
    [1, 2].map(() =>
      fetch(base + '/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookies.staffA },
        body: JSON.stringify({ id: id2, version: t.version, action: 'claim' }),
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
await check('工作人员可退回待接单', async () => {
  await act('staffA', id2, 'release');
  assert.equal((await task('passenger02', id2)).status, 'pending');
});
await check('乘客可取消并停止接单', async () => {
  await act('passenger02', id2, 'cancel');
  await act('staffA', id2, 'claim', 409);
});
await check('备选 C站方案也可提交', async () => {
  const p = { ...payload(), plan: 'continue' };
  await req('passenger02', 'tasks', p, 201);
  assert.equal((await task('passenger02', p.id)).target, 'C');
  await act('passenger02', p.id, 'cancel');
});
await check('退出后会话失效', async () => {
  const old = cookies.device2;
  await req('device2', 'logout', {});
  cookies.device2 = old;
  await req('device2', 'state', undefined, 401);
});
await check('重置归档场景任务，清空当前视图', async () => {
  await req('admin', 'admin', { action: 'reset', confirm: 'RESET' });
  assert.equal((await state('passenger01')).tasks.length, 0);
});
await check('归档任务不能继续操作', () =>
  req('staffA', 'action', { id, version: 10, action: 'claim' }, 409),
);
await check('演示结束准备 A站故障场景', () =>
  req('admin', 'admin', { action: 'facility', id: 'A-E2', status: 'fault' }),
);
const report = {
  base,
  at: new Date().toISOString(),
  total: results.length,
  passed: results.length,
  results,
};
await fs.mkdir('test-results', { recursive: true });
await fs.writeFile('test-results/api-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total: results.length, passed: results.length }));
