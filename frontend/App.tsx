import { statusNames } from '../shared/model';
import { fetchInsights } from './services/client';
import { Icon, assets } from './components/FigmaIcon';
import { TaskSummary, TaskTimeline } from './components/Journey';
import { Badge, Button, Card, Empty } from './components/ui';
import {
  Locked,
  PreferencesView,
  Profile,
  ProfileDetails,
  SavedTrips,
} from './features/account/AccountViews';
import { HistoryView } from './features/account/HistoryView';
import { LoginView } from './features/account/LoginView';
import { FacilitiesView } from './features/admin/FacilitiesView';
import { AdminInsights } from './features/admin/InsightsView';
import { Help } from './features/help/HelpView';
import { PassengerView } from './features/passenger/PassengerView';
import { StaffView } from './features/staff/StaffView';
import { useWorkspace } from './hooks/useWorkspace';
import type { Role } from './types';
export default function App({ initialRole }: { initialRole?: Role }) {
  const workspace = useWorkspace(initialRole);
  const {
    data,
    user,
    loading,
    busy,
    error,
    message,
    role,
    screen,
    preferences,
    modal,
    resetText,
    dialog,
    current,
    pageTitle,
    activeNav,
    setScreen,
    setModal,
    setResetText,
    setError,
    refresh,
    signOut,
    action,
    resetPage,
    updatePreferences,
  } = workspace;
  function helpContent() {
    return (
      <Help
        go={(next) => {
          setModal('');
          setScreen(next);
        }}
      />
    );
  }
  function pageContent() {
    if (screen === 'help' || screen === 'about')
      return <Help go={setScreen} about={screen === 'about'} />;
    if (screen === 'home') return <LoginView workspace={workspace} />;
    if (!user)
      return (
        <Locked
          title={
            screen === 'mine' ||
            ['profile', 'preferences', 'saved', 'history', 'record'].includes(screen)
              ? '查看个人中心'
              : role === 'admin'
                ? '进入管理工作台'
                : role === 'staff'
                  ? '查看接应任务'
                  : '查看你的旅程'
          }
          go={setScreen}
        />
      );
    if (screen === 'mine')
      return <Profile account={user} data={data} go={setScreen} onLogout={() => void signOut()} />;
    if (screen === 'profile') return <ProfileDetails account={user} go={setScreen} />;
    if (screen === 'preferences')
      return <PreferencesView value={preferences} onChange={updatePreferences} go={setScreen} />;
    if (screen === 'saved')
      return <SavedTrips value={preferences} onChange={updatePreferences} go={setScreen} />;
    if (screen === 'history') return <HistoryView workspace={workspace} />;
    if (screen === 'record' && user.role === 'admin' && current)
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
    if (user.role === 'admin')
      return (
        <>
          <div className="admin-tabs" role="tablist" aria-label="管理工作台">
            {[
              ['manage', '设施管理'],
              ['overview', '运营概览'],
              ['analytics', '服务分析'],
            ].map(([key, label]) => (
              <button
                id={'admin-tab-' + key}
                aria-controls="admin-panel"
                role="tab"
                aria-selected={screen === key || (screen === 'journey' && key === 'manage')}
                className={
                  screen === key || (screen === 'journey' && key === 'manage') ? 'selected' : ''
                }
                key={key}
                onClick={() => setScreen(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            id="admin-panel"
            role="tabpanel"
            aria-labelledby={
              'admin-tab-' + (['overview', 'analytics'].includes(screen) ? screen : 'manage')
            }
            className="admin-panel"
          >
            {screen === 'overview' || screen === 'analytics' ? (
              <AdminInsights view={screen} request={fetchInsights} />
            ) : (
              <FacilitiesView workspace={workspace} />
            )}
          </div>
        </>
      );
    if (['manage', 'overview', 'analytics'].includes(screen))
      return (
        <Empty
          onRefresh={() => void refresh()}
          title="此页面仅向管理员开放"
          text="请使用具有管理权限的账号登录。"
        />
      );
    return user.role === 'staff' ? (
      <StaffView workspace={workspace} />
    ) : (
      <PassengerView workspace={workspace} />
    );
  }
  return (
    <div
      className={
        'workspace ' +
        (preferences.largeText ? 'large-text ' : '') +
        (preferences.contrast ? 'high-contrast' : '')
      }
    >
      <aside className="desktop-intro">
        <a
          className="wordmark"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setScreen('home');
          }}
        >
          <img src="/figma/60dd8.png" alt="" /> Route Rescue
        </a>
        <Badge>无障碍行程恢复协同系统</Badge>
        <h1>
          让中断的行程，
          <br />
          重新<span>连接。</span>
        </h1>
        <p>
          当一部电梯暂停服务，
          <br />
          一段安心的接应，可以让旅程继续。
        </p>
        <div className="intro-path">
          <span>发现障碍</span>
          <i />
          <span>协同接应</span>
          <i />
          <span>安心抵达</span>
        </div>
        <div className="entry-links">
          <a href="/passenger#home">
            乘客端 <span>↗</span>
          </a>
          <a href="/staff#home">
            工作人员端 <span>↗</span>
          </a>
          <a href="/admin#home">
            服务管理 <span>↗</span>
          </a>
        </div>
        <small>
          依据你的 Figma 设计实现
          <br />
          用协同，让每一次出行更安心
        </small>
      </aside>
      <div className={'mobile-app ' + (user?.role === 'staff' ? 'staff-app' : '')}>
        <a href="#main-content" className="skip-link">
          跳至主要内容
        </a>
        <header className="app-header">
          <img className="hero-art" src="/figma/b6942.png" alt="" />
          <div className="brand-row">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                setScreen('home');
              }}
              className="brand"
            >
              <img src="/figma/60dd8.png" alt="" />
              <span>
                <strong>
                  {user?.role === 'staff' ? user.station + '站 · 站台服务' : 'Route Rescue'}
                </strong>
                <small>让每一次出行更安心</small>
              </span>
            </a>
            <button
              className="header-icon"
              aria-label="查看服务帮助"
              onClick={() => setScreen('help')}
            >
              <Icon node="1:2060" name="imgIcon" size={24} />
              <i />
            </button>
          </div>
          <h1>{pageTitle}</h1>
          <p>
            {screen === 'mine'
              ? '你的每一程，我们都用心接应'
              : user?.role === 'staff'
                ? '用行动，让每一次出行更顺畅'
                : user?.role === 'admin'
                  ? '看见服务全貌，让协同更高效'
                  : '你的出行需求，值得被好好接住'}
          </p>
          <button
            type="button"
            className="header-reset"
            disabled={busy}
            title="清空两端服务记录与全部选择，恢复初始场景"
            onClick={() => void resetPage()}
          >
            ↺ 一键重置
          </button>
        </header>
        <main id="main-content" className="content" aria-busy={busy || loading}>
          {error && (
            <div role="alert" className="error">
              <strong>操作未完成</strong>
              <p>{error}</p>
              <button onClick={() => void refresh()}>重新加载</button>
              <button aria-label="关闭错误提示" onClick={() => setError('')}>
                ×
              </button>
            </div>
          )}
          {message && (
            <div className="toast" role="status">
              ✓ {message}
            </div>
          )}
          {loading ? (
            <>
              <div className="skeleton" />
              <div className="skeleton short" />
              <p className="loading-text" role="status">
                正在加载共享行程数据…
              </p>
            </>
          ) : (
            pageContent()
          )}
          {user && (
            <div className="session-footer">
              <span>
                <i /> {user.name} · 已连接
              </span>
              <button onClick={() => void signOut()} disabled={busy}>
                退出 / 切换角色
              </button>
            </div>
          )}
        </main>
        <nav className="bottom-nav" aria-label="主导航">
          {[
            ['home', '首页', 'imgIcon'],
            [
              (user?.role || role) === 'admin' ? 'manage' : 'journey',
              (user?.role || role) === 'staff'
                ? '任务'
                : (user?.role || role) === 'admin'
                  ? '管理'
                  : '旅程',
              'imgIcon1',
            ],
            ['help', '帮助', 'imgIcon2'],
            ['mine', '我的', 'imgIcon3'],
          ].map(([key, label, name]) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className={activeNav === key ? 'active' : ''}
              aria-current={activeNav === key ? 'page' : undefined}
            >
              <span
                aria-hidden="true"
                className="nav-symbol"
                style={{
                  maskImage: `url(${assets['1:149'][name]})`,
                  WebkitMaskImage: `url(${assets['1:149'][name]})`,
                }}
              />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <dialog
        ref={dialog}
        onCancel={() => setModal('')}
        onClick={(e) => {
          if (e.target === dialog.current) setModal('');
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">
            {modal === 'cancel'
              ? '取消本次求助'
              : modal === 'reset'
                ? '确认重置服务场景'
                : modal === 'finish'
                  ? '确认接应完成'
                  : '帮助与演示说明'}
          </h2>
          <button className="close-dialog" onClick={() => setModal('')} aria-label="关闭">
            ×
          </button>
        </div>
        {modal === 'cancel' ? (
          <>
            <p>取消后工作人员将停止本次接应，你可以重新选择方案并提交求助。</p>
            <Button disabled={busy} onClick={() => current && void action(current, 'cancel')}>
              确认取消求助
            </Button>
            <Button secondary onClick={() => setModal('')}>
              继续等待
            </Button>
          </>
        ) : modal === 'reset' ? (
          <>
            <p>这会清空两端全部服务记录与选择，并恢复初始场景。请输入 RESET 确认。</p>
            <label className="field">
              确认文本
              <input
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                autoComplete="off"
              />
            </label>
            <Button disabled={busy || resetText !== 'RESET'} onClick={() => void resetPage()}>
              确认重置
            </Button>
          </>
        ) : modal === 'finish' ? (
          <>
            <p>请确认已在接收站完成乘客接应。下一步将由乘客确认服务结果。</p>
            <Button disabled={busy} onClick={() => current && void action(current, 'finish')}>
              已完成接应，通知乘客确认
            </Button>
          </>
        ) : modal === 'help' ? (
          helpContent()
        ) : null}
      </dialog>
    </div>
  );
}
