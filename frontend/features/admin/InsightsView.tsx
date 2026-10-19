import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { Insights } from '../../../shared/insights';
import { stations } from '../../../shared/model';
import { Card as Box } from '../../components/ui';
function Trend({ data }: { data: Insights['daily'] }) {
  const width = 320;
  const height = 155;
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.requested));
  const x = (i: number) => pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1);
  const y = (n: number) => height - pad - ((height - pad * 2) * n) / max;
  const line = (key: 'requested' | 'completed') =>
    data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ');
  return (
    <>
      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`近${data.length}天新增请求和当前已完成数量趋势`}
      >
        <title>请求创建日期趋势</title>
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1={pad}
              y1={y(n * max)}
              x2={width - pad}
              y2={y(n * max)}
              stroke="#ecdfd4"
              strokeDasharray="3 5"
            />
            <text x="4" y={y(n * max) + 3} fontSize="9" fill="#7b7c78">
              {Math.round(n * max)}
            </text>
          </g>
        ))}
        <polyline
          points={line('requested')}
          fill="none"
          stroke="#ff604a"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        <polyline
          points={line('completed')}
          fill="none"
          stroke="#389a80"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {data.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.requested)} r="3" fill="#ff604a">
              <title>
                {d.date}：新增 {d.requested}，已完成 {d.completed}
              </title>
            </circle>
            {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 4) === 0) && (
              <text x={x(i)} y={height - 5} textAnchor="middle" fontSize="8" fill="#7b7c78">
                {d.date.slice(5).replace('-', '/')}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          <i />
          新增请求
        </span>
        <span>
          <i className="green-dot" />
          当前已完成
        </span>
      </div>
    </>
  );
}
function Metric({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function AdminInsights({
  view,
  request,
}: {
  view: 'overview' | 'analytics';
  request: (path: string) => Promise<Insights>;
}) {
  const [source, setSource] = useState<'archive' | 'live'>('archive');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let inflight = false;
    setData(null);
    setError('');
    const load = async () => {
      if (inflight) return;
      inflight = true;
      try {
        const result = await request('insights?days=' + days + '&source=' + source);
        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        inflight = false;
      }
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [days, source, request, refresh]);
  const s = data?.summary;
  const archive = source === 'archive';
  return (
    <>
      <div className="insight-heading">
        <div>
          <span className="eyebrow">
            {view === 'overview' ? 'OPERATIONS OVERVIEW' : 'SERVICE INSIGHTS'}
          </span>
          <h2>{view === 'overview' ? '每一次接应，都看得见' : '看见服务的变化'}</h2>
        </div>
        <button
          className="refresh-icon"
          aria-label="刷新统计数据"
          onClick={() => setRefresh((n) => n + 1)}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="insight-source" role="group" aria-label="数据来源">
        {(
          [
            ['archive', '运营档案'],
            ['live', '本轮服务'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={source === key}
            className={source === key ? 'selected' : ''}
            onClick={() => setSource(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="source-description">
        {archive
          ? '已结案服务的历史运营档案，与本轮任务分别统计。'
          : '查看本轮提交与接应的进展，一键重置后从零开始。'}
      </p>
      <div className="period-picker" role="group" aria-label="统计时间范围">
        {[7, 14, 30].map((n) => (
          <button
            aria-pressed={days === n}
            key={n}
            className={days === n ? 'selected' : ''}
            onClick={() => setDays(n)}
          >
            近 {n} 天
          </button>
        ))}
      </div>
      {error && (
        <div className="error" role="alert">
          <strong>统计数据暂时不可用</strong>
          <p>
            {error}
            {data ? '；下方保留上次成功读取的数据。' : ''}
          </p>
          <button onClick={() => setRefresh((n) => n + 1)}>重新加载统计</button>
        </div>
      )}
      {!data && !error && (
        <>
          <div className="skeleton short" />
          <p className="loading-text" role="status">
            正在汇总服务数据…
          </p>
        </>
      )}
      {data && s && (
        <>
          {view === 'overview' ? (
            <>
              <div className="metric-grid">
                <Metric
                  label="服务请求"
                  value={s.requests}
                  detail={`${s.requests - s.previousRequests >= 0 ? '+' : ''}${s.requests - s.previousRequests} 较上期`}
                />
                <Metric
                  label="已完成服务"
                  value={s.completed}
                  detail={`${s.completed - s.previousCompleted >= 0 ? '+' : ''}${s.completed - s.previousCompleted} 较上期`}
                />
                <Metric
                  label={archive ? '跨站接应' : '当前处理中'}
                  value={archive ? s.handoffs : s.active}
                  detail={archive ? '源站与目标站共同完成接应' : `${s.pending} 个等待接单`}
                />
                <Metric
                  label="完成率"
                  value={s.requests ? s.completionRate + '%' : '—'}
                  detail="本期请求当前完成占比"
                />
              </div>
              <Box>
                <div className="section-title">
                  <div>
                    <h2>服务请求趋势</h2>
                    <p>新增与完成，沿着时间看进展</p>
                  </div>
                  <span className="badge">近{days}天</span>
                </div>
                <Trend data={data.daily} />
                {!s.requests && (
                  <p className="fine-print">这段时间还没有请求，新的服务会显示在这里。</p>
                )}
              </Box>
              <Box>
                <h2>{archive ? '服务响应表现' : '此刻需要关注'}</h2>
                <div className="attention-grid">
                  <div>
                    <b>{archive ? s.avgWaitMinutes : s.unassigned}</b>
                    <span>{archive ? '平均接单 / 分钟' : '超过2分钟未接单'}</span>
                  </div>
                  <div>
                    <b>{archive ? s.avgServiceMinutes : s.handoffWaiting}</b>
                    <span>{archive ? '平均服务 / 分钟' : '等待跨站接收'}</span>
                  </div>
                  <div>
                    <b>{archive ? s.waitSamples : data.facilities.fault}</b>
                    <span>{archive ? '已响应请求' : '设施待恢复'}</span>
                  </div>
                </div>
              </Box>
              <Box>
                <div className="section-title">
                  <div>
                    <h2>当前设施通行状态</h2>
                    <p>
                      {data.facilities.healthy} 项正常 / {data.facilities.total} 项设施
                    </p>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                {data.facilities.items.map((f) => (
                  <div className="facility-status-row" key={f.id}>
                    <span>
                      {stations[f.station]} · {f.name}
                    </span>
                    <span className={'badge ' + (f.status === 'healthy' ? 'success' : 'danger')}>
                      {f.status === 'healthy' ? '可通行' : '故障停运'}
                    </span>
                  </div>
                ))}
              </Box>
            </>
          ) : (
            <>
              <div className="metric-grid">
                <Metric
                  label="平均首次接单"
                  value={s.avgWaitMinutes === null ? '—' : s.avgWaitMinutes + ' 分'}
                  detail={`${s.waitSamples} 个有接单记录的请求`}
                />
                <Metric
                  label="平均服务用时"
                  value={s.avgServiceMinutes === null ? '—' : s.avgServiceMinutes + ' 分'}
                  detail={`${s.serviceSamples} 个乘客确认完成的请求`}
                />
                <Metric label="跨站交接" value={s.handoffs} detail="本期发起请求中的交接数" />
                <Metric label="历史已归档" value={s.archived} detail="保留在本期统计范围内" />
              </div>
              <Box>
                <h2>请求与完成走势</h2>
                <Trend data={data.daily} />
                <details className="data-details">
                  <summary>查看每日数据</summary>
                  <table className="data-table">
                    <caption>按请求创建日期分组</caption>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>请求</th>
                        <th>已完成</th>
                        <th>取消 / 归档关闭</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily.map((d) => (
                        <tr key={d.date}>
                          <td>{d.date.slice(5)}</td>
                          <td>{d.requested}</td>
                          <td>{d.completed}</td>
                          <td>{d.cancelled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </Box>
              <Box>
                <h2>服务阶段分布</h2>
                <div className="distribution">
                  {data.status
                    .filter((x) => x.count)
                    .map((x) => (
                      <div key={x.key}>
                        <span>{x.label}</span>
                        <div>
                          <i style={{ width: `${(x.count / Math.max(1, s.requests)) * 100}%` }} />
                        </div>
                        <b>{x.count}</b>
                      </div>
                    ))}
                  {!s.requests && <p>暂无服务数据。</p>}
                </div>
              </Box>
              <Box>
                <h2>站点协同情况</h2>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>站点</th>
                      <th>发起</th>
                      <th>交接至本站</th>
                      <th>完成</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.station.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name}</td>
                        <td>{row.requested}</td>
                        <td>{row.received}</td>
                        <td>{row.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Box>
                <h2>通行需求分布</h2>
                <div className="distribution">
                  {data.needs.map((n) => (
                    <div key={n.name}>
                      <span>{n.name}</span>
                      <div>
                        <i style={{ width: `${(n.count / Math.max(1, s.requests)) * 100}%` }} />
                      </div>
                      <b>{n.count}</b>
                    </div>
                  ))}
                </div>
                <p className="fine-print">单个请求可包含多项需求，数量不互斥。</p>
              </Box>
            </>
          )}
          <div className="stats-footnote">
            <span className="connected-dot">
              {archive
                ? '运营档案 · 截至 ' + data.through
                : '数据库汇总 · ' +
                  new Date(data.updated).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Shanghai',
                  })}
            </span>
            <p>
              {archive
                ? '按档案截止日期回溯所选天数，服务数、趋势和站点数据使用同一口径。档案保持独立，当前设施状态单独实时读取。'
                : '按北京时间请求创建日期分组，包含归档记录。完成数反映这些请求的当前结果；今天的数据仍在变化。平均时长仅使用有对应事件记录的样本。'}
            </p>
          </div>
        </>
      )}
    </>
  );
}
