import type { Facility, ServiceEvent } from '../../shared/insights';
import { demoAccounts, stations, statusNames, type Task } from '../../shared/model';
import { Icon } from './FigmaIcon';
import { Badge, Card } from './ui';
export function time(t: number) {
  return new Date(t).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
}
export function Rail({ target = 'B' }: { target?: string }) {
  return (
    <div className="rail" aria-label={`当前行程：中央车站，经东湖广场，到市民中心`}>
      {Object.entries(stations).map(([id, label], i) => (
        <div className={i === 0 ? 'active' : ''} key={id}>
          <i />
          <span>{label}</span>
          <small>{id === target ? '接应站' : id === 'A' ? '当前站' : id + '站'}</small>
        </div>
      ))}
    </div>
  );
}
export function NeedTags({ task: t }: { task: Task }) {
  let values: string[] = [];
  try {
    values = JSON.parse(t.needs);
  } catch {}
  return (
    <div className="tags">
      {values.map((n) => (
        <span key={n}>{n}</span>
      ))}
    </div>
  );
}
export function TaskSummary({ task: t }: { task: Task }) {
  return (
    <>
      <div className="section-title">
        <span className="icon-disc">
          <Icon node="1:1676" name="imgIcon" />
        </span>
        <div>
          <h2>
            {t.location} · {stations[t.origin]} → {stations[t.target]}
          </h2>
          <p>
            任务 {t.id.slice(0, 8).toUpperCase()} · {time(t.created)}
          </p>
        </div>
      </div>
      {<NeedTags task={t} />}
      {t.note && <p className="note">补充需求：{t.note}</p>}
    </>
  );
}
export function TaskTimeline({ task: t, events: all }: { task: Task; events: ServiceEvent[] }) {
  const events = all.filter((e) => e.task === t.id);
  return (
    <Card>
      <div className="section-title">
        <span className="icon-disc">
          <Icon node="1:23" name="imgIcon" />
        </span>
        <div>
          <h2>服务状态</h2>
          <p>每一步进展，双端同步</p>
        </div>
        <Badge>{statusNames[t.status]}</Badge>
      </div>
      <ol className="timeline">
        {events.map((e) => (
          <li key={e.id}>
            <i>✓</i>
            <div>
              <strong>{e.label}</strong>
              <small>
                {time(e.created)} · {demoAccounts.find((a) => a.id === e.actor)?.name || '系统'}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
export function FacilityCards({ facilities }: { facilities: Facility[] }) {
  return (
    <div className="facility-grid">
      {facilities.map((f, i) => (
        <div key={f.id} className={'facility ' + (f.status === 'fault' ? 'fault' : 'ok')}>
          <Icon node={i === 2 ? '1:1676' : '1:149'} name={i === 2 ? 'imgFrame2' : 'imgIcon8'} />
          <strong>
            {stations[f.station]} · {f.name}
          </strong>
          <Badge tone={f.status === 'fault' ? 'danger' : 'success'}>
            {f.status === 'fault' ? '故障停运' : '可通行'}
          </Badge>
          <small>{time(f.updated)} 更新</small>
        </div>
      ))}
    </div>
  );
}
