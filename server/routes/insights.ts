import { periodStart, summarize, type Facility, type ServiceEvent } from '../../shared/insights';
import { type Task } from '../../shared/model';
import { archivedInsights } from '../../shared/operations-archive';
import { seed } from '../core/facilities';
import { HttpError, json } from '../core/http';
import { account, db } from '../core/session';
export async function insights(req: Request) {
  const identity = await account(req);
  if (identity.role !== 'admin') throw new HttpError(403, '仅管理员可查看总体数据');
  const raw = new URL(req.url).searchParams.get('days') || '7';
  if (!['7', '14', '30'].includes(raw)) throw new HttpError(400, '请选择 7、14 或 30 天');
  const source = new URL(req.url).searchParams.get('source') || 'live';
  if (!['archive', 'live'].includes(source)) throw new HttpError(400, '请选择有效的数据范围');
  const days = Number(raw);
  const now = Date.now();
  const start = periodStart(now, days) - days * 86400000;
  await seed();
  if (source === 'archive') {
    const facilities = await db().prepare('SELECT * FROM facilities ORDER BY id').all<Facility>();
    return json(archivedInsights(days, facilities.results));
  }
  const scope = 'SELECT id FROM tasks WHERE created>=? OR archived=0';
  const result = await db().batch([
    db().prepare('SELECT * FROM tasks WHERE created>=? OR archived=0').bind(start),
    db()
      .prepare(
        'SELECT task,actor,label,created FROM events WHERE task IN (' +
          scope +
          ') ORDER BY created',
      )
      .bind(start),
    db().prepare('SELECT * FROM facilities ORDER BY id'),
  ]);
  return json({
    ...summarize(
      result[0].results as unknown as Task[],
      result[1].results as unknown as ServiceEvent[],
      result[2].results as unknown as Facility[],
      now,
      days,
    ),
    source: 'live',
  });
}
