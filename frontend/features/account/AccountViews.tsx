import {
  Accessibility,
  Activity,
  ArrowUpRight,
  BarChart3,
  Bookmark,
  ChevronRight,
  History,
  LifeBuoy,
  LogOut,
  MapPin,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { needOptions, stations, type Account } from '../../../shared/model';
import { Card as Box, Menu } from '../../components/ui';
import type { Go, PageData } from '../../types';
import { ArchiveProfileStats } from '../admin/ArchiveSummary';
import { codes, roleName } from './account-details';
import { defaultPreferences, type Preferences } from './preferences';
type Data = PageData;

export function Locked({ title, go }: { title: string; go: Go }) {
  return (
    <Box className="locked-card">
      <div className="profile-avatar">
        <UserRound size={34} />
      </div>
      <h2>登录后{title}</h2>
      <p>登录你的账号，让每一段服务都有记录。</p>
      <button className="button primary" onClick={() => go('home')}>
        前往首页登录 <ArrowUpRight size={18} />
      </button>
      <button className="text-button" onClick={() => go('help')}>
        先了解如何使用
      </button>
    </Box>
  );
}
export function Profile({
  account,
  data,
  go,
  onLogout,
}: {
  account: Account;
  data: Data | null;
  go: Go;
  onLogout: () => void;
}) {
  const tasks = data?.tasks || [];
  return (
    <>
      <Box className="profile-hero">
        <div className="profile-avatar">{account.name[0]}</div>
        <div>
          <h2>{account.name.split(' · ')[0]}</h2>
          <p>{roleName(account)}</p>
          <span className="member-code">{codes[account.id]}</span>
        </div>
        <button className="profile-edit" aria-label="查看个人资料" onClick={() => go('profile')}>
          <ChevronRight size={22} />
        </button>
      </Box>
      {account.role === 'admin' ? (
        <ArchiveProfileStats go={go} />
      ) : (
        <Box className="profile-stats">
          <button onClick={() => go('history')}>
            <strong>{tasks.length}</strong>
            <span>近期服务</span>
          </button>
          <button onClick={() => go('history')}>
            <strong>{tasks.filter((t) => t.status === 'completed').length}</strong>
            <span>已完成</span>
          </button>
          <button onClick={() => go(account.role === 'admin' ? 'overview' : 'journey')}>
            <strong>
              {tasks.filter((t) => !['completed', 'cancelled'].includes(t.status)).length}
            </strong>
            <span>进行中</span>
          </button>
        </Box>
      )}
      <Box className="menu-card">
        <Menu
          icon={<UserRound size={21} />}
          label="个人资料"
          detail="查看身份、账号和服务站点"
          onClick={() => go('profile')}
        />
        <Menu
          icon={<History size={21} />}
          label="服务记录"
          detail="回看每一次接应与交接"
          onClick={() => go('history')}
        />
        {account.role === 'passenger' && (
          <Menu
            icon={<Bookmark size={21} />}
            label="常用行程"
            detail="中央车站 → 市民中心"
            onClick={() => go('saved')}
          />
        )}
        <Menu
          icon={<Accessibility size={21} />}
          label="出行与阅读偏好"
          detail="常用需求、大字模式、高对比度"
          onClick={() => go('preferences')}
        />
      </Box>
      <Box className="menu-card">
        {account.role === 'admin' && (
          <>
            <Menu
              icon={<Activity size={21} />}
              label="运营数据概览"
              onClick={() => go('overview')}
            />
            <Menu
              icon={<BarChart3 size={21} />}
              label="服务趋势分析"
              onClick={() => go('analytics')}
            />
          </>
        )}
        <Menu icon={<LifeBuoy size={21} />} label="帮助中心" onClick={() => go('help')} />
        <Menu
          icon={<ShieldCheck size={21} />}
          label="关于 Route Rescue"
          onClick={() => go('about')}
        />
      </Box>
      <button className="logout-button" onClick={onLogout}>
        <LogOut size={17} /> 退出当前账号
      </button>
    </>
  );
}
export function ProfileDetails({ account, go }: { account: Account; go: Go }) {
  return (
    <>
      <button className="back" onClick={() => go('mine')}>
        ← 返回我的
      </button>
      <Box>
        <div className="profile-avatar centered">{account.name[0]}</div>
        <h2 className="centered-text">{account.name.split(' · ')[0]}</h2>
        <dl className="profile-details">
          {[
            ['姓名', account.name.split(' · ')[0]],
            ['身份', roleName(account)],
            ['账号', account.id],
            ['服务编号', codes[account.id]],
            [
              account.role === 'admin' ? '管理范围' : '服务站点',
              account.role === 'admin'
                ? '中央车站 / 东湖广场 / 市民中心'
                : account.station
                  ? stations[account.station] + ' · ' + account.station + '站'
                  : '中央车站 → 市民中心',
            ],
            ['账号状态', '已登录 · 会话受保护'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Box>
      <div className="notice">
        <ShieldCheck size={18} />
        个人资料为竞赛展示角色，不收集真实身份信息。
      </div>
    </>
  );
}
export function PreferencesView({
  value,
  onChange,
  go,
}: {
  value: Preferences;
  onChange: (value: Preferences) => void;
  go: Go;
}) {
  return (
    <>
      <button className="back" onClick={() => go('mine')}>
        ← 返回我的
      </button>
      <Box>
        <div className="section-title">
          <span className="icon-disc">
            <Accessibility size={23} />
          </span>
          <div>
            <h2>常用出行需求</h2>
            <p>下次确认求助时自动为你选中</p>
          </div>
        </div>
        <div className="needs-grid">
          {needOptions.map((n) => (
            <label key={n}>
              <input
                type="checkbox"
                checked={value.needs.includes(n)}
                onChange={() =>
                  onChange({
                    ...value,
                    needs: value.needs.includes(n)
                      ? value.needs.filter((x) => x !== n)
                      : [...value.needs, n],
                  })
                }
              />
              {n}
            </label>
          ))}
        </div>
      </Box>
      <Box>
        <h2>阅读与显示</h2>
        {[
          ['largeText', '大字模式', '放大页面文字，阅读更轻松'],
          ['contrast', '高对比度', '加强文字、按钮与背景的对比'],
        ].map(([key, label, detail]) => (
          <label className="preference-row" key={key}>
            <span>
              <strong>{label}</strong>
              <small>{detail}</small>
            </span>
            <input
              role="switch"
              type="checkbox"
              checked={Boolean(value[key as keyof Preferences])}
              onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            />
          </label>
        ))}
      </Box>
      <button
        className="reset-selection"
        type="button"
        onClick={() => onChange({ ...defaultPreferences, needs: [...defaultPreferences.needs] })}
      >
        ↺ 恢复默认设置
      </button>
      <div className="notice">
        <Settings2 size={18} />
        更改即时生效，并按当前账号保存在这台设备中。
      </div>
    </>
  );
}
export function SavedTrips({
  value,
  onChange,
  go,
}: {
  value: Preferences;
  onChange: (value: Preferences) => void;
  go: Go;
}) {
  return (
    <>
      <button className="back" onClick={() => go('mine')}>
        ← 返回我的
      </button>
      {value.saved ? (
        <Box>
          <div className="section-title">
            <span className="icon-disc">
              <MapPin size={23} />
            </span>
            <div>
              <h2>中央车站 → 市民中心</h2>
              <p>1号线 · 经东湖广场</p>
            </div>
            <span className="badge">常用</span>
          </div>
          <div className="tags">
            {value.needs.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <button className="button primary spaced" onClick={() => go('journey')}>
            查看本次行程 <ArrowUpRight size={18} />
          </button>
          <button className="text-button" onClick={() => onChange({ ...value, saved: false })}>
            移除常用行程
          </button>
        </Box>
      ) : (
        <Box className="empty">
          <Bookmark size={34} />
          <h2>还没有常用行程</h2>
          <p>将当前路线加入常用，下次从这里快速查看。</p>
          <button className="button primary" onClick={() => onChange({ ...value, saved: true })}>
            收藏中央车站 → 市民中心
          </button>
        </Box>
      )}
    </>
  );
}
