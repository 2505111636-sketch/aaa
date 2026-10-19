import { summarize, type Facility, type Insights, type ServiceEvent } from './insights';
import { needOptions, type Task } from './model';

// A fixed fictional competition dataset. It is intentionally separate from the
// live task store: resets clear the current experience without rewriting history.
export const archiveThrough = '2026-10-18';
const DAY = 86400000;
const end = Date.parse(archiveThrough + 'T23:59:59.999+08:00');
const start = end + 1 - 60 * DAY;
const tasks: Task[] = [];
const events: ServiceEvent[] = [];
for (let day = 0; day < 60; day++) {
  const date = start + day * DAY;
  const count = 16 + Math.floor(day / 10) * 2 + [2, 5, 1, 7, 4, 9, 6][day % 7];
  for (let i = 0; i < count; i++) {
    const n = day * 100 + i;
    const id = 'archive-' + n;
    const origin = ['A', 'B', 'C'][n % 3];
    const target = ['A', 'B', 'C'][((n % 3) + 1 + (n % 5 === 0 ? 1 : 0)) % 3];
    const cancelled = n % 23 === 0;
    const created = date + (7 * 60 + ((i * 29) % 840)) * 60000;
    const wait = (45 + ((n * 37) % 130)) * 1000;
    const service = (9 + (n % 19)) * 60000;
    const needs = [needOptions[n % 4], ...(n % 3 === 0 ? [needOptions[(n + 1) % 4]] : [])];
    tasks.push({
      id,
      passenger: 'archive-guest-' + n,
      location: ['站厅', '站台', '列车上'][n % 3],
      needs: JSON.stringify(needs),
      note: '',
      plan: target === 'B' ? 'next' : 'continue',
      origin,
      target,
      status: cancelled ? 'cancelled' : 'completed',
      assigned: 'staff' + origin,
      receiver: cancelled ? null : 'staff' + target,
      escalated: 0,
      archived: 1,
      version: 1,
      last_event: id + '-end',
      created,
      updated: created + service,
    });
    if (!cancelled) {
      events.push({
        task: id,
        actor: 'staff' + origin,
        label: '站点接应专员 接单',
        created: created + wait,
      });
      if (n % 5 !== 0)
        events.push({
          task: id,
          actor: 'staff' + origin,
          label: '发送交接至目标站',
          created: created + wait + 240000,
        });
      events.push({
        task: id,
        actor: 'archive-guest-' + n,
        label: '乘客确认服务完成，恢复行程',
        created: created + service,
      });
    }
  }
}
export function archivedInsights(days: number, facilities: Facility[]): Insights {
  return {
    ...summarize(tasks, events, facilities, end, days),
    source: 'archive',
    through: archiveThrough,
  };
}
