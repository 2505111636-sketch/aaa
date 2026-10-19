import { locations, needOptions, statusNames } from '../../../shared/model';
import { Icon } from '../../components/FigmaIcon';
import { FacilityCards, Rail, TaskSummary, TaskTimeline, time } from '../../components/Journey';
import { Badge, Button, Card, Empty } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';
import { PassengerProgress } from './PassengerProgress';

export function PassengerView({ workspace }: { workspace: Workspace }) {
  const {
    data,
    busy,
    screen,
    plan,
    location,
    needs,
    note,
    selected,
    tasks,
    active,
    current,
    fault,
    setScreen,
    setModal,
    setPlan,
    setLocation,
    setNeeds,
    setNote,
    refresh,
    submit,
    resetSelections,
  } = workspace;
  if (screen === 'record' && !tasks.some((t) => t.id === selected))
    return (
      <>
        <button className="back" onClick={() => setScreen('history')}>
          ← 返回服务记录
        </button>
        <Empty
          onRefresh={() => void refresh()}
          title="记录暂不可访问"
          text="该记录可能已归档，请返回服务记录列表。"
        />
      </>
    );
  if (screen === 'record' && current)
    return (
      <>
        <button className="back" onClick={() => setScreen('history')}>
          ← 返回服务记录
        </button>
        <Card>
          {<TaskSummary task={current} />}
          <Badge>{statusNames[current.status]}</Badge>
        </Card>
        {<TaskTimeline task={current} events={data?.events || []} />}
      </>
    );
  if (active) return <PassengerProgress task={active} workspace={workspace} />;
  if (screen === 'plans')
    return (
      <>
        <button className="reset-selection" type="button" disabled={busy} onClick={resetSelections}>
          ↺ 重置选择
        </button>
        <p className="subintro">我们为你整理了两条恢复路线，请结合自身需求选择。</p>
        {['next', 'continue'].map((p, i) => {
          const target = i ? 'C' : 'B';
          const available =
            data?.facilities.find((f) => f.station === target)?.status === 'healthy';
          return (
            <button
              key={p}
              className={'plan card ' + (plan === p ? 'selected' : '')}
              onClick={() => setPlan(p)}
              aria-pressed={plan === p}
              disabled={!available}
            >
              <div className="section-title">
                <strong>方案 {i ? 'B' : 'A'}</strong>
                <Badge>{available ? (i ? '备选方案' : '推荐方案') : '设施不可用'}</Badge>
              </div>
              <h2>{i ? '继续乘坐 2 站' : '下一站下车'}</h2>
              <div className="plan-metrics">
                <span>◷ +{i ? 16 : 8} min</span>
                <span>步行约 {i ? 520 : 230} m</span>
                <span>换乘 {i ? 2 : 1} 次</span>
              </div>
              <div className="tags">
                <span>无障碍路线</span>
                <span>工作人员接应</span>
              </div>
              <Rail target={target} />
            </button>
          );
        })}
        <Button
          disabled={
            busy ||
            data?.facilities.find((f) => f.station === (plan === 'next' ? 'B' : 'C'))?.status !==
              'healthy'
          }
          onClick={() => setScreen('location')}
        >
          选择当前方案 <span>→</span>
        </Button>
        <button className="back" onClick={() => setScreen('journey')}>
          ← 返回当前旅程
        </button>
        <p className="fine-print">路线、距离与时间为预设参考，出行时请向现场人员确认。</p>
      </>
    );
  if (screen === 'location')
    return (
      <>
        <button className="reset-selection" type="button" disabled={busy} onClick={resetSelections}>
          ↺ 重置选择
        </button>
        <Card>
          <div className="location-grid">
            {locations.map((l, i) => (
              <button
                key={l}
                onClick={() => setLocation(l)}
                className={location === l ? 'selected' : ''}
                aria-pressed={location === l}
              >
                <span className="location-symbol">
                  {i === 1 ? (
                    <img className="platform-icon" src="/figma/97e5a.png" alt="" />
                  ) : (
                    <Icon
                      node="1:1676"
                      name={i === 0 ? 'imgIcon' : i === 2 ? 'imgIcon1' : 'imgIcon2'}
                      size={28}
                    />
                  )}
                </span>
                <strong>{l}</strong>
                {location === l && <i aria-hidden="true">✓</i>}
              </button>
            ))}
          </div>
          <div className="notice">
            <Icon node="1:1676" name="imgIcon3" size={18} />
            <span>请手动确认当前位置，方便工作人员找到你。</span>
          </div>
        </Card>
        <Card>
          <h2>
            本次通行条件 <small>可多选</small>
          </h2>
          <div className="needs-grid">
            {needOptions.map((n) => (
              <label key={n}>
                <input
                  type="checkbox"
                  checked={needs.includes(n)}
                  onChange={() =>
                    setNeeds((v) => (v.includes(n) ? v.filter((x) => x !== n) : [...v, n]))
                  }
                />
                {n}
              </label>
            ))}
          </div>
          <label className="field">
            补充需求 <small>选填，请勿输入真实个人信息</small>
            <textarea
              maxLength={200}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：希望工作人员在车门处接应"
            />
          </label>
        </Card>
        <Button disabled={busy || !needs.length} onClick={() => void submit()}>
          {busy ? '正在提交…' : '确认并发送求助'} <span>→</span>
        </Button>
        <button className="back" onClick={() => setScreen('plans')}>
          ← 返回选择方案
        </button>
      </>
    );
  const last = tasks[0]?.status === 'completed' ? tasks[0] : undefined;
  if (last && screen !== 'newJourney')
    return (
      <>
        <Card className="success-card">
          <span className="completion-mark" aria-label="服务已完成">
            <Icon node="1:1449" name="imgIcon5" size={42} />
          </span>
          <div>
            <h2>本次恢复任务已完成</h2>
            <p>乘客与工作人员已共同确认。</p>
            <p>谢谢你的信任，愿每一程都顺畅。</p>
          </div>
        </Card>
        <Card>
          <div className="section-title">
            <img className="end-facility-icon" src="/figma/4247d.png" alt="" />
            <div>
              <h2>{fault ? 'A站2号电梯仍停运' : '本次接应已完成'}</h2>
              <p>{fault ? '原设施故障仍在，但本次替代路线接应已完成。' : '当前设施状态正常。'}</p>
            </div>
          </div>
          <div className="notice">本次服务记录已保存，可在“我的”中随时查看。</div>
        </Card>
        <Button onClick={() => setScreen('newJourney')}>
          开始新的行程 <span>→</span>
        </Button>
        <Button secondary onClick={() => setScreen('history')}>
          查看服务记录
        </Button>
        <p className="fine-print">
          任务 {last.id.slice(0, 8).toUpperCase()} · {time(last.updated)} 完成
        </p>
      </>
    );
  return (
    <>
      {fault && (
        <Card className="fault-card">
          <img src="/figma/75492.png" alt="电梯停运提示" />
          <div>
            <h2>你的原路线无法继续</h2>
            <h3>A站 · 2号电梯已停运</h3>
            <p>影响：B2 站台 → 出口电梯无法使用</p>
            <small>设施状态由服务管理中心维护</small>
          </div>
        </Card>
      )}
      <Card className="journey-card">
        <div className="section-title">
          <span className="icon-disc">
            <Icon node="1:149" name="imgIcon5" />
          </span>
          <div>
            <h2>当前行程</h2>
            <p>城市轨道交通 · 1号线</p>
          </div>
          <Badge tone={fault ? 'danger' : 'success'}>{fault ? '需要恢复行程' : '行程正常'}</Badge>
        </div>
        <h2 className="route-title">
          中央车站 <span>→</span> 市民中心
        </h2>
        <p>
          14:20 – 14:58 <span className="muted">预计 38 分钟</span>
        </p>
        <Rail />
        <div className="notice">
          <Icon node="1:149" name="imgIcon6" />
          <span>
            <strong>正在前往目的地</strong>
            <br />
            关注沿途设施，有需要随时发起求助
          </span>
        </div>
      </Card>
      <div className="section-heading">
        <h2>关键设施状态</h2>
        <small>沿线重点设施</small>
      </div>
      {<FacilityCards facilities={data?.facilities || []} />}
      <Card className="compact">
        <div className="section-title">
          <span className="icon-disc">
            <Icon node="1:149" name="imgIcon10" />
          </span>
          <div>
            <h2>{fault ? '路线待恢复' : '通行状态良好'}</h2>
            <p>
              {fault ? '设施故障影响通行，可选择替代方案。' : '需要协助时，也可以主动发起求助。'}
            </p>
          </div>
        </div>
      </Card>
      <Button disabled={busy} onClick={() => setScreen('plans')}>
        {fault ? '查看恢复方案' : '查看接应方案'} <span>→</span>
      </Button>
      <Button secondary onClick={() => setModal('help')}>
        联系人工帮助
      </Button>
      <p className="fine-print">留意设施状态变化，有需要时可随时发起接应请求。</p>
    </>
  );
}
