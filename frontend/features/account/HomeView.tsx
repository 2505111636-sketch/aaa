import { Activity, ArrowUpRight, BarChart3, Heart, LifeBuoy, Route, UserRound } from 'lucide-react';
import { type Account } from '../../../shared/model';
import { Card as Box, Menu } from '../../components/ui';
import type { Go, PageData } from '../../types';
import { ArchiveProfileStats } from '../admin/ArchiveSummary';
import { roleName } from './account-details';
type Data = PageData;

export function Home({ account, data, go }: { account: Account; data: Data | null; go: Go }) {
  const work = account.role === 'admin' ? 'manage' : 'journey';
  const tasks = data?.tasks || [];
  const active = tasks.filter((t) => !['completed', 'cancelled'].includes(t.status));
  return (
    <>
      <Box className="welcome-card">
        <div className="eyebrow">YOUR NEXT JOURNEY</div>
        <h2>{account.name.split(' · ')[0]}，欢迎回来</h2>
        <p>
          {account.role === 'passenger'
            ? '有人接应的旅程，更安心。'
            : account.role === 'staff'
              ? '每一次及时接应，都让出行多一分安心。'
              : '把每一次服务的进展，汇聚在这里。'}
        </p>
        <div className="welcome-account">
          <span className="avatar-small">{account.name[0]}</span>
          <span>{roleName(account)}</span>
          <span className="connected-dot">已登录</span>
        </div>
      </Box>
      <div className="home-shortcuts">
        <button onClick={() => go(work)}>
          <span className="shortcut-icon">
            <Route size={26} />
          </span>
          <strong>
            {account.role === 'admin'
              ? '设施管理'
              : account.role === 'staff'
                ? '接应任务'
                : '我的旅程'}
          </strong>
          <small>查看当前进展</small>
        </button>
        <button onClick={() => go(account.role === 'admin' ? 'overview' : 'history')}>
          <span className="shortcut-icon gold">
            <BarChart3 size={26} />
          </span>
          <strong>{account.role === 'admin' ? '数据概览' : '服务记录'}</strong>
          <small>{account.role === 'admin' ? '掌握服务全貌' : '每一步都有记录'}</small>
        </button>
        <button onClick={() => go('help')}>
          <span className="shortcut-icon green">
            <LifeBuoy size={26} />
          </span>
          <strong>出行帮助</strong>
          <small>找到使用指引</small>
        </button>
      </div>
      {account.role === 'admin' && <ArchiveProfileStats go={go} />}
      <Box>
        <div className="section-title">
          <span className="icon-disc">
            <Activity size={23} />
          </span>
          <div>
            <h2>{account.role === 'passenger' ? '此刻的旅程' : '服务工作台'}</h2>
            <p>与工作人员和乘客保持同步</p>
          </div>
        </div>
        <div className="home-counts">
          <div>
            <strong>{active.length}</strong>
            <span>当前进行中</span>
          </div>
          <div>
            <strong>{tasks.filter((t) => t.status === 'completed').length}</strong>
            <span>近期已完成</span>
          </div>
          <div>
            <strong>
              {data?.facilities.filter((f) => f.status === 'healthy').length || 0}/
              {data?.facilities.length || 0}
            </strong>
            <span>设施可通行</span>
          </div>
        </div>
        <button className="button primary" onClick={() => go(work)}>
          {active.length
            ? '继续查看服务进度'
            : account.role === 'admin'
              ? '进入管理工作台'
              : account.role === 'staff'
                ? '查看本站接应任务'
                : '查看当前行程'}{' '}
          <ArrowUpRight size={18} />
        </button>
      </Box>
      <Box className="care-card">
        <Heart size={23} />
        <div>
          <h2>不必独自应对行程变化</h2>
          <p>确认位置、表达需求，接应服务会陪你走完下一程。</p>
        </div>
      </Box>
      <Menu
        icon={<UserRound size={21} />}
        label="完善你的出行偏好"
        detail="在“我的”中管理常用需求与阅读设置"
        onClick={() => go('preferences')}
      />
    </>
  );
}
