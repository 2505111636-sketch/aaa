import type { Value } from '../storage/types';
import { canView, locations, needOptions, transition, type Task } from '../../shared/model';
import { seed } from '../core/facilities';
import { body, HttpError, json, sameOrigin } from '../core/http';
import { account, db } from '../core/session';
const terminal = ['completed', 'cancelled'];
export async function createTask(req: Request) {
  sameOrigin(req);
  const identity = await account(req);
  if (identity.role !== 'passenger') throw new HttpError(403, '仅乘客可提交求助');
  const payload = await body(req);
  if (
    !locations.includes(payload.location) ||
    !Array.isArray(payload.needs) ||
    !payload.needs.length ||
    payload.needs.length > 4 ||
    payload.needs.some((n: unknown) => typeof n !== 'string' || !needOptions.includes(n)) ||
    !['next', 'continue'].includes(payload.plan) ||
    typeof payload.note !== 'string' ||
    payload.note.length > 200 ||
    typeof payload.id !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(payload.id)
  )
    throw new HttpError(400, '请确认位置、需求和恢复方案');
  await seed();
  const target = payload.plan === 'next' ? 'B' : 'C';
  const facility = await db()
    .prepare('SELECT status FROM facilities WHERE station=?')
    .bind(target)
    .first<{ status: string }>();
  if (facility?.status !== 'healthy')
    throw new HttpError(409, '所选恢复站点设施不可用，请选择其他方案');
  const existing = await db()
    .prepare('SELECT * FROM tasks WHERE passenger=? AND archived=0 AND status NOT IN (?,?)')
    .bind(identity.id, ...terminal)
    .first<Task>();
  if (existing) {
    if (existing.id === payload.id) return json({ id: existing.id });
    throw new HttpError(409, '已有进行中的求助，请查看服务进度');
  }
  const now = Date.now();
  const eventId = crypto.randomUUID();
  try {
    await db().batch([
      db()
        .prepare(
          "INSERT INTO tasks (id,passenger,location,needs,note,plan,origin,target,status,assigned,receiver,escalated,archived,version,last_event,created,updated) VALUES (?,?,?,?,?,?,'A',?,'pending',NULL,NULL,0,0,1,?,?,?)",
        )
        .bind(
          payload.id,
          identity.id,
          payload.location,
          JSON.stringify([...new Set(payload.needs)]),
          payload.note,
          payload.plan,
          target,
          eventId,
          now,
          now,
        ),
      db()
        .prepare('INSERT INTO events VALUES (?,?,?,?,?)')
        .bind(eventId, payload.id, identity.id, '求助已提交，等待 A站工作人员接单', now),
    ]);
  } catch {
    throw new HttpError(409, '求助已更新，请刷新服务进度后重试');
  }
  return json({ id: payload.id }, 201);
}
export async function act(req: Request) {
  sameOrigin(req);
  const identity = await account(req);
  const payload = await body(req);
  if (
    typeof payload.id !== 'string' ||
    typeof payload.action !== 'string' ||
    !Number.isInteger(payload.version)
  )
    throw new HttpError(400, '操作参数无效');
  const task = await db().prepare('SELECT * FROM tasks WHERE id=?').bind(payload.id).first<Task>();
  if (!task) throw new HttpError(404, '任务不存在');
  if (!canView(identity, task)) throw new HttpError(403, '无权访问此任务');
  if (task.version !== payload.version)
    throw new HttpError(409, '任务已被其他设备更新，请查看最新状态');
  let change;
  try {
    change = transition(identity, task, payload.action);
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
  const now = Date.now();
  const eid = crypto.randomUUID();
  const updates: Record<string, Value> = {
    status: change.status ?? task.status,
    assigned: change.assigned === undefined ? task.assigned : change.assigned || null,
    receiver: change.receiver ?? task.receiver,
    escalated: change.escalated ?? task.escalated,
    updated: now,
    version: task.version + 1,
    last_event: eid,
  };
  const result = await db().batch([
    db()
      .prepare(
        'UPDATE tasks SET ' +
          Object.keys(updates)
            .map((k) => k + '=?')
            .join(',') +
          ' WHERE id=? AND version=? AND archived=0',
      )
      .bind(...Object.values(updates), task.id, task.version),
    db()
      .prepare('INSERT INTO events SELECT ?,id,?,?,? FROM tasks WHERE id=? AND last_event=?')
      .bind(eid, identity.id, change.label, now, task.id, eid),
  ]);
  if (!result[0].meta.changes) throw new HttpError(409, '任务已被其他设备更新，请查看最新状态');
  return json({ ok: true });
}
