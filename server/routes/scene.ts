import { demoAccounts, isUnassigned, type Task } from '../../shared/model';
import { seed } from '../core/facilities';
import { body, HttpError, json, sameOrigin } from '../core/http';
import { account, db } from '../core/session';
export async function state(req: Request) {
  const identity = await account(req);
  await seed();
  let taskQuery = 'SELECT * FROM tasks WHERE archived=0';
  const binds: string[] = [];
  if (identity.role === 'passenger') {
    taskQuery += ' AND passenger=?';
    binds.push(identity.id);
  } else if (identity.role === 'staff') {
    taskQuery +=
      " AND (origin=? OR (target=? AND status IN ('handoff_pending','handoff_received','awaiting_confirmation','completed')))";
    binds.push(identity.station, identity.station);
  }
  const selected = taskQuery + ' ORDER BY created DESC,id DESC LIMIT 60';
  const eventQuery =
    'SELECT * FROM events WHERE task IN (' +
    selected.replace('SELECT * FROM tasks', 'SELECT id FROM tasks') +
    ') ORDER BY created,id';
  const results = await db().batch([
    db()
      .prepare(selected)
      .bind(...binds),
    db()
      .prepare(eventQuery)
      .bind(...binds),
    db().prepare('SELECT * FROM facilities ORDER BY id'),
    db().prepare("SELECT action AS id FROM audit WHERE id='scene-reset-marker'"),
  ]);
  const rows = results[0].results as unknown as Task[];
  const taskRows = rows.map((task) => ({ ...task, unassigned: isUnassigned(task, Date.now()) }));
  const resetVersion = (results[3].results[0] as { id: string } | undefined)?.id || 'initial';
  return json({
    account: identity,
    facilities: results[2].results,
    tasks: taskRows,
    events: results[1].results,
    resetVersion,
    serverTime: Date.now(),
    simulation: true,
  });
}
export async function resetScene(req: Request) {
  sameOrigin(req);
  const identity = await account(req);
  const payload = await body(req);
  if (payload.confirm !== 'RESET_ALL') throw new HttpError(400, '请确认重新开始场景');
  // All fixed experience identities have this explicitly shared reset ability.
  // General facility management and analytics remain restricted to admins.
  if (!demoAccounts.some((x) => x.id === identity.id))
    throw new HttpError(403, '当前账号不能重置体验数据');
  await seed();
  const version = crypto.randomUUID();
  const now = Date.now();
  await db().batch([
    db().prepare('DELETE FROM events'),
    db().prepare('DELETE FROM tasks'),
    db()
      .prepare(
        "UPDATE facilities SET status=CASE WHEN id='A-E2' THEN 'fault' ELSE 'healthy' END,updated=?",
      )
      .bind(now),
    db()
      .prepare('INSERT INTO audit VALUES (?,?,?,?)')
      .bind(version, identity.id, '重置全部体验数据', now),
    db()
      .prepare(
        'INSERT INTO audit VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET actor=excluded.actor,action=excluded.action,created=excluded.created',
      )
      .bind('scene-reset-marker', identity.id, version, now),
  ]);
  return json({ ok: true, resetVersion: version });
}
