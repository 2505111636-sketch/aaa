import type { Task } from '../../../shared/model';
import { demoAccounts, statusNames } from '../../../shared/model';
import { Icon } from '../../components/FigmaIcon';
import { Rail, TaskSummary, TaskTimeline } from '../../components/Journey';
import { Badge, Button, Card } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';

export function PassengerProgress({ workspace, task: t }: { workspace: Workspace; task: Task }) {
  const { data, busy, now, setSelected, setModal, action } = workspace;
  const elapsed = Math.max(0, Math.floor((now - t.created) / 1000));
  const timer = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  return (
    <>
      {t.status === 'pending' ? (
        <Card className="waiting">
          <div className="section-title">
            <span className="icon-disc">
              <Icon node="1:23" name="imgFrame" />
            </span>
            <h2>{t.unassigned ? '暂时无人接单' : '正在等待工作人员确认'}</h2>
          </div>
          <strong className="countdown">{timer}</strong>
          <p>
            {t.unassigned
              ? '已等待超过 2 分钟，可发起人工关注或取消求助。'
              : '请在安全位置等候，接单后进度将自动更新。'}
          </p>
          {!!t.escalated && (
            <div className="notice">已加入系统人工关注队列，可继续等候或取消求助。</div>
          )}
        </Card>
      ) : (
        <Card className="recovery">
          <div className="section-title">
            <Badge tone="success">{statusNames[t.status]}</Badge>
            <small>双端共享服务记录</small>
          </div>
          <Rail target={t.target} />
          <div className="person">
            <img src="/figma/b1e47.png" alt="工作人员头像" />
            <div>
              <h2>
                {demoAccounts.find((a) => a.id === (t.receiver || t.assigned))?.name ||
                  '车站服务人员'}
              </h2>
              <p>
                {t.status === 'handoff_pending'
                  ? '已发送交接，等待下一站确认'
                  : t.status === 'awaiting_confirmation'
                    ? '接应已完成，请确认本次服务'
                    : '当前会合点：3号站台 · 第一节无障碍车厢'}
              </p>
            </div>
          </div>
        </Card>
      )}
      <Card>
        {<TaskSummary task={t} />}
        <div className="meeting">
          <h3>接应路线</h3>
          {['乘坐可用电梯前往站台', '沿无障碍通道前往会合点', '3号站台 · 第一节无障碍车厢'].map(
            (s, i) => (
              <div key={s}>
                <img src={['/figma/ac2c0.png', '/figma/2090f.png', '/figma/cef4e.png'][i]} alt="" />
                <div>
                  <strong>{['电梯', '无障碍通道', '会合点'][i]}</strong>
                  <p>{s}</p>
                </div>
              </div>
            ),
          )}
        </div>
      </Card>
      {t.status === 'awaiting_confirmation' && (
        <Button disabled={busy} onClick={() => void action(t, 'confirm')}>
          确认服务完成，恢复行程 <span>→</span>
        </Button>
      )}
      {t.status === 'pending' && !t.escalated && (
        <Button disabled={busy} secondary onClick={() => void action(t, 'escalate')}>
          请求人工关注 <span>↗</span>
        </Button>
      )}
      {<TaskTimeline task={t} events={data?.events || []} />}
      <div className="two-buttons">
        <Button secondary disabled={busy} onClick={() => setModal('help')}>
          联系人工帮助
        </Button>
        <Button
          secondary
          disabled={busy}
          onClick={() => {
            setSelected(t.id);
            setModal('cancel');
          }}
        >
          取消本次求助
        </Button>
      </div>
      <p className="fine-print">页面每 3 秒自动同步，接应位置由工作人员与你确认。</p>
    </>
  );
}
