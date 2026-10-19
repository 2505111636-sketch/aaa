import type { Task } from '../../../shared/model';
import { demoAccounts, stations, statusNames } from '../../../shared/model';
import { Rail, TaskSummary, TaskTimeline } from '../../components/Journey';
import { Badge, Button, Card } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';

export function StaffTaskDetails({ workspace, task: t }: { workspace: Workspace; task: Task }) {
  const { data, user, busy, checked, setSelected, setChecked, setModal, action } = workspace;
  const own = t.assigned === user?.id;
  const receiving = t.receiver === user?.id;
  return (
    <>
      <button
        className="back"
        onClick={() => {
          setSelected('');
          setChecked([]);
        }}
      >
        ← 返回任务列表
      </button>
      <Card className="staff-summary">
        <div className="section-title">
          <Badge>{statusNames[t.status]}</Badge>
          <small>{t.unassigned ? '暂时无人接单' : '共享任务数据'}</small>
        </div>
        {<TaskSummary task={t} />}
        <Rail target={t.target} />
      </Card>
      {t.status === 'pending' && t.origin === user?.station && (
        <Button disabled={busy} onClick={() => void action(t, 'claim')}>
          接单 · 确认负责此任务
        </Button>
      )}
      {t.status === 'accepted' && own && (
        <>
          <Card>
            <h2>接应准备</h2>
            <p>确认准备后前往会合点。</p>
            <div className="checklist">
              {['会合点已明确：3号站台', '辅助设备已准备', '已了解乘客通行需求'].map((c) => (
                <label key={c}>
                  <input
                    type="checkbox"
                    checked={checked.includes(c)}
                    onChange={() =>
                      setChecked((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </Card>
          <Button disabled={busy || checked.length !== 3} onClick={() => void action(t, 'depart')}>
            准备完成，前往会合点
          </Button>
          <Button disabled={busy} secondary onClick={() => void action(t, 'release')}>
            暂时无法接应，退回队列
          </Button>
        </>
      )}
      {t.status === 'en_route' && own && (
        <>
          <Card className="waiting">
            <h2>现场接应</h2>
            <p>请前往 3号站台 · 第一节无障碍车厢</p>
            <div className="notice">到场后请及时确认，让乘客了解接应进展。</div>
          </Card>
          <Button disabled={busy} onClick={() => void action(t, 'arrive')}>
            我已到场，开始现场接应
          </Button>
        </>
      )}
      {t.status === 'on_site' && own && (
        <>
          <Card>
            <h2>下一步 · 跨站服务交接</h2>
            <p>
              目标：{stations[t.target]}（{t.target}站） · 3号站台
            </p>
            <div className="notice">位置、通行需求与服务记录会一并交接，无需乘客重复说明。</div>
          </Card>
          <Button disabled={busy} onClick={() => void action(t, 'handoff')}>
            发送交接至 {t.target}站 <span>→</span>
          </Button>
        </>
      )}
      {t.status === 'handoff_pending' && (
        <Card>
          <h2>等待 {t.target}站接收确认</h2>
          <p>交接已发送，接收站确认后才会进入下一阶段。</p>
          {user?.station === t.target ? (
            <Button disabled={busy} onClick={() => void action(t, 'receive')}>
              接收交接 · 确认负责后续接应
            </Button>
          ) : (
            <Badge>请由 {t.target}站工作人员账号确认</Badge>
          )}
        </Card>
      )}
      {t.status === 'handoff_received' && (
        <Card>
          <h2>跨站交接已确认</h2>
          <p>{demoAccounts.find((a) => a.id === t.receiver)?.name} 正在负责后续接应。</p>
          {receiving && (
            <Button
              disabled={busy}
              onClick={() => {
                setSelected(t.id);
                setModal('finish');
              }}
            >
              确认接应完成
            </Button>
          )}
        </Card>
      )}
      {t.status === 'awaiting_confirmation' && (
        <Card className="waiting">
          <h2>等待乘客完成确认</h2>
          <p>工作人员已确认完成，请由乘客端确认服务结果。</p>
        </Card>
      )}
      {<TaskTimeline task={t} events={data?.events || []} />}
    </>
  );
}
