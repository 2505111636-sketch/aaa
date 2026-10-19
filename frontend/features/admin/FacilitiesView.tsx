import { stations, statusNames } from '../../../shared/model';
import { Badge, Button, Card } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';

export function FacilitiesView({ workspace }: { workspace: Workspace }) {
  const { data, busy, tasks, setModal, setResetText, manage } = workspace;
  return (
    <>
      <Card>
        <h2>设施故障设置</h2>
        <p>修改后同步影响所有设备上的设施状态和方案可用性。</p>
        {data?.facilities.map((f) => (
          <div className="admin-facility" key={f.id}>
            <div>
              <h3>
                {f.station}站 · {f.name}
              </h3>
              <small>
                {stations[f.station]} · {f.id}
              </small>
            </div>
            <button
              disabled={busy}
              className={'toggle ' + (f.status === 'fault' ? 'off' : '')}
              onClick={() =>
                void manage({
                  action: 'facility',
                  id: f.id,
                  status: f.status === 'fault' ? 'healthy' : 'fault',
                })
              }
              aria-label={`${f.station}站${f.name}${f.status === 'fault' ? '恢复正常' : '设置故障'}`}
            >
              {f.status === 'fault' ? '故障中 · 恢复' : '正常 · 设为故障'}
            </button>
          </div>
        ))}
      </Card>
      <Card>
        <h2>重置服务场景</h2>
        <p>
          清空乘客与工作人员的服务记录，恢复 A站电梯故障的初始场景。所有在线使用者会同步重新开始。
        </p>
        <Button
          secondary
          disabled={busy}
          onClick={() => {
            setResetText('');
            setModal('reset');
          }}
        >
          重置场景
        </Button>
      </Card>
      <Card>
        <h2>当前服务任务</h2>
        <p>
          {tasks.length} 条任务 · {tasks.filter((t) => t.status === 'completed').length} 条已完成
        </p>
        {tasks.map((t) => (
          <div className="admin-task" key={t.id}>
            <span>
              {t.id.slice(0, 8)} · {t.passenger}
            </span>
            <Badge>{statusNames[t.status]}</Badge>
          </div>
        ))}
      </Card>
    </>
  );
}
