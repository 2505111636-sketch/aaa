import { demoAccounts, type Account } from '../../shared/model';
import { HttpError } from './http';
import { env } from './runtime';
export function db() {
  if (!env.DB) throw new HttpError(503, '数据库暂不可用，请稍后重试');
  return env.DB;
}
export async function hash(value: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(b))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
export async function equal(a: string, b: string) {
  const x = await hash(a);
  const y = await hash(b);
  let n = 0;
  for (let i = 0; i < x.length; i++) n |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return n === 0;
}
export async function account(req: Request): Promise<Account> {
  const raw = req.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('rr_session='))
    ?.slice(11);
  if (!raw || raw.length > 100) throw new HttpError(401, '请先登录账号');
  const s = await db()
    .prepare('SELECT account FROM sessions WHERE token=? AND expires>?')
    .bind(await hash(raw), Date.now())
    .first<{ account: string }>();
  const a = demoAccounts.find((x) => x.id === s?.account);
  if (!a) throw new HttpError(401, '登录已过期，请重新登录');
  return a;
}
