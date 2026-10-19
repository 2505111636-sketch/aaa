import { demoAccounts, demoPassword } from '../../shared/model';
import { seed } from '../core/facilities';
import { body, HttpError, json, sameOrigin } from '../core/http';
import { env } from '../core/runtime';
import { db, equal, hash } from '../core/session';
export async function login(req: Request) {
  sameOrigin(req);
  const credentials = await body(req);
  if (
    typeof credentials.username !== 'string' ||
    typeof credentials.password !== 'string' ||
    credentials.username.length > 30 ||
    credentials.password.length > 128
  )
    throw new HttpError(400, '账号或密码格式无效');
  const key = await hash(
    (req.headers.get('cf-connecting-ip') || 'local') + ':' + credentials.username,
  );
  const now = Date.now();
  await db()
    .prepare(
      'INSERT INTO login_limits(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN ? ELSE until END',
    )
    .bind(key, now + 600000, now, now, now + 600000)
    .run();
  const limit = await db()
    .prepare('SELECT count FROM login_limits WHERE key=?')
    .bind(key)
    .first<{ count: number }>();
  if ((limit?.count || 0) > 15) throw new HttpError(429, '尝试次数较多，请在 10 分钟后重试');
  const identity = demoAccounts.find((x) => x.id === credentials.username);
  const configured = env.ADMIN_PASSWORD;
  const configuredHash = env.ADMIN_PASSWORD_HASH;
  // The public experience administrator controls only this application's
  // fictional dataset. The owner's admin secret stays server-side and private.
  const expected = identity?.id === 'admin' ? configured : demoPassword;
  const valid = expected
    ? await equal(credentials.password, expected)
    : identity?.id === 'admin' &&
      /^[a-f0-9]{64}$/.test(configuredHash || '') &&
      (await equal(await hash(credentials.password), configuredHash!));
  if (!identity || !valid) throw new HttpError(401, '账号或密码不正确');
  const token = crypto.randomUUID() + crypto.randomUUID();
  await db().batch([
    db().prepare('DELETE FROM sessions WHERE expires<?').bind(now),
    db()
      .prepare('INSERT INTO sessions VALUES (?,?,?)')
      .bind(await hash(token), identity.id, now + 12 * 3600000),
    db().prepare('DELETE FROM login_limits WHERE until<?').bind(now),
    db().prepare('DELETE FROM login_limits WHERE key=?').bind(key),
  ]);
  await seed();
  return json({ account: identity }, 200, {
    'Set-Cookie': `rr_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}
export async function logout(req: Request) {
  sameOrigin(req);
  const raw = req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('rr_session='))
    ?.slice(11);
  if (raw)
    await db()
      .prepare('DELETE FROM sessions WHERE token=?')
      .bind(await hash(raw))
      .run();
  return json({ ok: true }, 200, {
    'Set-Cookie': 'rr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
  });
}
