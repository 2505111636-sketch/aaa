import { statusNames } from '../../../shared/model';
import { Icon } from '../../components/FigmaIcon';
import { TaskSummary } from '../../components/Journey';
import { Badge, Card, Empty } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';

export function HistoryView({ workspace }: { workspace: Workspace }) {
  const { tasks, openRecord, refresh } = workspace;
  return (
    <>
      <Card className="compact">
        <div className="section-title">
          <span className="icon-disc">
            <Icon node="1:23" name="imgIcon" />
          </span>
          <div>
            <h2>每一次服务，都有迹可循</h2>
            <p>当前场景最近 {tasks.length} 条记录 · 按创建时间排序</p>
          </div>
        </div>
      </Card>
      {tasks.length ? (
        tasks.map((t) => (
          <Card key={t.id}>
            {<TaskSummary task={t} />}
            <div className="section-title">
              <Badge tone={t.status === 'completed' ? 'success' : ''}>
                {statusNames[t.status]}
              </Badge>
              <button
                className="text-button"
                onClick={() => {
                  openRecord(t.id);
                }}
              >
                查看记录 →
              </button>
            </div>
          </Card>
        ))
      ) : (
        <Empty
          onRefresh={() => void refresh()}
          title="还没有服务记录"
          text="接应过程与服务结果，会保存在这里。"
        />
      )}
    </>
  );
}
