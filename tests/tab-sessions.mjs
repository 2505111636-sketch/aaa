import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { mergeCookies } from './cookies.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3018';
const contexts = {
  passenger: crypto.randomUUID() + '.passenger01',
  staff: crypto.randomUUID() + '.staffA',
  admin: crypto.randomUUID() + '.demoAdmin',
  secondStaff: crypto.randomUUID() + '.staffB',
};
let cookies = '';
const checks = [];
async function request(context, path, data, status = 200) {
  const response = await fetch(base + '/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      Cookie: cookies,
      ...(context === undefined ? {} : { 'X-Route-Session': context }),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json', Origin: base }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  cookies = mergeCookies(cookies, response.headers.getSetCookie());
  return { value, response };
}
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log('PASS ' + name);
}
await check('多个标签页使用不同的HttpOnly会话Cookie', async () => {
  for (const [key, username] of [
    ['passenger', 'passenger01'],
    ['staff', 'staffA'],
    ['admin', 'demoAdmin'],
    ['secondStaff', 'staffB'],
  ]) {
    const { response } = await request(contexts[key], 'login', {
      username,
      password: 'Route2026!',
    });
    const cookie = response.headers.getSetCookie()[0];
    assert(cookie.startsWith('rr_session.' + contexts[key] + '='));
    assert(cookie.includes('HttpOnly'));
    assert(cookie.includes('SameSite=Strict'));
  }
});
await check('同一个浏览器Cookie集合可分别读取四个身份', async () => {
  for (const [key, id] of [
    ['passenger', 'passenger01'],
    ['staff', 'staffA'],
    ['admin', 'demoAdmin'],
    ['secondStaff', 'staffB'],
  ])
    assert.equal((await request(contexts[key], 'state')).value.account.id, id);
});
await check('缺失标签页Cookie时不回退到浏览器共享身份', async () => {
  await request(undefined, 'login', { username: 'demoAdmin', password: 'Route2026!' });
  await request(crypto.randomUUID() + '.anonymous', 'state', undefined, 401);
});
await check('无效标签页标识被拒绝', async () => {
  await request('invalid', 'state', undefined, 400);
  await request('', 'state', undefined, 400);
});
await check('会话上下文不能绕过乘客权限', async () => {
  await request(contexts.passenger, 'insights', undefined, 403);
  await request(
    contexts.passenger,
    'admin',
    { action: 'facility', id: 'A-E2', status: 'healthy' },
    403,
  );
});
await check('乘客创建的同一任务可由工作人员接单', async () => {
  await request(contexts.admin, 'reset', { confirm: 'RESET_ALL' });
  const id = crypto.randomUUID();
  await request(
    contexts.passenger,
    'tasks',
    { id, location: '列车上', needs: ['轮椅通行'], plan: 'next', note: '双端隔离测试' },
    201,
  );
  const task = (await request(contexts.staff, 'state')).value.tasks.find((t) => t.id === id);
  assert(task);
  await request(contexts.staff, 'action', { id, version: task.version, action: 'claim' });
  assert.equal(
    (await request(contexts.passenger, 'state')).value.tasks.find((t) => t.id === id).status,
    'accepted',
  );
});
await check('工作人员退出只撤销本标签页会话', async () => {
  await request(contexts.staff, 'logout', {});
  await request(contexts.staff, 'state', undefined, 401);
  assert.equal((await request(contexts.passenger, 'state')).value.account.id, 'passenger01');
  assert.equal((await request(contexts.secondStaff, 'state')).value.account.id, 'staffB');
  assert.equal((await request(contexts.admin, 'state')).value.account.id, 'demoAdmin');
  assert.equal((await request(undefined, 'state')).value.account.id, 'demoAdmin');
});
await check('重新登录工作人员不改变乘客会话', async () => {
  await request(contexts.staff, 'login', { username: 'staffA', password: 'Route2026!' });
  assert.equal((await request(contexts.passenger, 'state')).value.account.id, 'passenger01');
});
await request(contexts.admin, 'reset', { confirm: 'RESET_ALL' });
await fs.writeFile(
  'test-results/tab-sessions-report.json',
  JSON.stringify({ status: 'PASS', checks }, null, 2),
);
