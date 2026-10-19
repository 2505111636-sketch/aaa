import type { Task } from '../../../shared/model';
import { stations, statusNames } from '../../../shared/model';
import { NeedTags, time } from '../../components/Journey';
import { Badge, Card, Empty } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';
import { StaffTaskDetails } from './StaffTaskDetails';

export function StaffView({ workspace }: { workspace: Workspace }) {
  const { user, tab, selected, tasks, setSelected, setChecked, setTab, refresh } = workspace;
  if (selected) {
    const t = tasks.find((t) => t.id === selected);
    if (t) return <StaffTaskDetails task={t} workspace={workspace} />;
    return (
      <>
        <button className="back" onClick={() => setSelected('')}>
          ← 返回任务列表
        </button>
        <Empty
          onRefresh={() => void refresh()}
          title="任务已归档或不可访问"
          text="场景可能已被管理员重置，请返回列表。"
        />
      </>
    );
  }
  const filter = (t: Task, k: string) =>
    k === 'pending'
      ? t.status === 'pending'
      : k === 'handoff'
        ? ['handoff_pending', 'handoff_received'].includes(t.status)
        : k === 'active'
          ? ['accepted', 'en_route', 'on_site', 'awaiting_confirmation'].includes(t.status)
          : ['completed', 'cancelled'].includes(t.status);
  const visible = tasks.filter((t) => filter(t, tab));
  return (
    <>
      <div className="staff-tabs" role="tablist" aria-label="任务状态">
        {[
          ['pending', '待接单'],
          ['active', '执行中'],
          ['handoff', '待交接'],
          ['done', '已结束'],
        ].map(([k, label]) => (
          <button
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? 'selected' : ''}
            onClick={() => setTab(k)}
            key={k}
          >
            {label}
            <small>{tasks.filter((t) => filter(t, k)).length}</small>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <p>
          {user?.station}站 · {stations[user?.station || 'A']}
        </p>
        <small>每 3 秒同步</small>
      </div>
      {visible.length ? (
        visible.map((t) => (
          <Card className="task-card" key={t.id}>
            <div className="section-title">
              <span className="urgency">
                {t.unassigned ? '暂时无人接单' : '◷ ' + time(t.created) + ' 收到'}
              </span>
              <Badge>{statusNames[t.status]}</Badge>
            </div>
            <h2>{t.location} · 3号站台</h2>
            <p>
              {stations[t.origin]} <span className="accent">→</span> {stations[t.target]}
            </p>
            {<NeedTags task={t} />}
            <div className="task-footer">
              <small>
                {t.passenger === 'passenger01' ? '林晓' : '周宁'} · {t.id.slice(0, 8).toUpperCase()}
              </small>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(t.id);
                  setChecked([]);
                }}
              >
                查看任务 →
              </button>
            </div>
          </Card>
        ))
      ) : (
        <Empty
          onRefresh={() => void refresh()}
          title="暂无此类任务"
          text={
            tab === 'pending'
              ? '乘客提交本站求助后，任务将显示在这里。'
              : '新的服务进展将在这里自动更新。'
          }
        />
      )}
      <p className="fine-print">跨站服务由源站发送交接，再由目标站确认接收。</p>
    </>
  );
}
