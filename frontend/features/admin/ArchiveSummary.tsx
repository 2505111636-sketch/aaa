import { useEffect, useState } from 'react';
import type { Insights } from '../../../shared/insights';
import { Card as Box } from '../../components/ui';
import type { Go } from '../../types';
export function ArchiveProfileStats({ go }: { go: Go }) {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void fetch('/api/insights?source=archive&days=7', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return (await r.json()) as Insights;
      })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  if (error)
    return (
      <Box>
        <p>运营摘要暂时不可用</p>
        <button className="text-button" onClick={() => setRetry((n) => n + 1)}>
          重新加载
        </button>
      </Box>
    );
  if (!data)
    return (
      <Box>
        <p role="status">正在读取运营摘要…</p>
      </Box>
    );
  return (
    <Box className="profile-stats archive-profile">
      <p className="archive-profile-label">
        近7天运营档案 · 截至 {data.through?.slice(5).replace('-', '/')}
      </p>
      {[
        [data.summary.requests, '服务请求'],
        [data.summary.completed, '已完成服务'],
        [data.summary.handoffs, '跨站接应'],
      ].map(([value, label]) => (
        <button key={label} onClick={() => go('overview')}>
          <strong>{value}</strong>
          <span>{label}</span>
        </button>
      ))}
    </Box>
  );
}
