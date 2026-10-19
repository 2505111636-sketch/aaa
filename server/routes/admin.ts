import { body, HttpError, json, sameOrigin } from '../core/http';
import { account, db } from '../core/session';
export async function admin(req: Request) {
  sameOrigin(req);
  const identity = await account(req);
  if (identity.role !== 'admin') throw new HttpError(403, '仅管理员可操作演示场景');
  const payload = await body(req);
  const now = Date.now();
  if (payload.action === 'facility') {
    if (
      !['A-E2', 'B-E1', 'C-R1'].includes(payload.id) ||
      !['healthy', 'fault'].includes(payload.status)
    )
      throw new HttpError(400, '设施参数无效');
    await db().batch([
      db()
        .prepare('UPDATE facilities SET status=?,updated=? WHERE id=?')
        .bind(payload.status, now, payload.id),
      db()
        .prepare('INSERT INTO audit VALUES (?,?,?,?)')
        .bind(crypto.randomUUID(), identity.id, `设施 ${payload.id} 设为 ${payload.status}`, now),
    ]);
  } else if (payload.action === 'reset') {
    if (payload.confirm !== 'RESET') throw new HttpError(400, '请确认重置场景');
    await db().batch([
      db()
        .prepare(
          'INSERT INTO events SELECT lower(hex(randomblob(16))),id,?,?,? FROM tasks WHERE archived=0',
        )
        .bind(identity.id, '管理员重置演示场景，记录已归档', now),
      db()
        .prepare(
          "UPDATE tasks SET archived=1,status=CASE WHEN status IN ('completed','cancelled') THEN status ELSE 'cancelled' END,version=version+1,updated=? WHERE archived=0",
        )
        .bind(now),
      db().prepare("UPDATE facilities SET status='healthy',updated=?").bind(now),
      db()
        .prepare('INSERT INTO audit VALUES (?,?,?,?)')
        .bind(crypto.randomUUID(), identity.id, '重置演示场景并归档任务', now),
    ]);
  } else throw new HttpError(400, '未知管理操作');
  return json({ ok: true });
}
