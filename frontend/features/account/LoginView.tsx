import { demoAccounts } from '../../../shared/model';
import { Icon } from '../../components/FigmaIcon';
import { Button, Card } from '../../components/ui';
import type { Workspace } from '../../hooks/useWorkspace';
import type { Role } from '../../types';
import { Home } from './HomeView';

export function LoginView({ workspace }: { workspace: Workspace }) {
  const {
    data,
    user,
    busy,
    role,
    username,
    password,
    setUsername,
    setPassword,
    setScreen,
    signIn,
    signOut,
    chooseRole,
  } = workspace;
  if (user)
    return (
      <>
        <Home account={user} data={data} go={setScreen} />
        <Button secondary onClick={() => void signOut()}>
          切换登录账号
        </Button>
      </>
    );
  return (
    <>
      <Card className="login-card">
        <div className="section-title">
          <span className="icon-disc">
            <Icon node="1:149" name="imgIcon5" size={28} />
          </span>
          <div>
            <h2>开始你的安心旅程</h2>
            <p>选择身份，登录协同服务</p>
          </div>
        </div>
        <div className="role-tabs" role="group" aria-label="登录身份">
          {(['passenger', 'staff', 'admin'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => chooseRole(r)}
              aria-pressed={role === r}
              className={role === r ? 'selected' : ''}
            >
              {r === 'passenger' ? '乘客' : r === 'staff' ? '工作人员' : '管理员'}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void signIn();
          }}
        >
          <fieldset disabled={busy}>
            <label className="field">
              登录账号
              {role === 'admin' ? (
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              ) : (
                <select
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                >
                  {demoAccounts
                    .filter((a) => a.role === role)
                    .map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.id} · {a.name}
                      </option>
                    ))}
                </select>
              )}
            </label>
            <label className="field">
              密码
              <input
                autoComplete="current-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <p className="credential-hint">
              体验账号和密码已预填，直接点击进入。
              <br />
              密码：<code>Route2026!</code>
            </p>
            <Button type="submit" disabled={busy}>
              {busy
                ? '正在登录…'
                : '进入' +
                  (role === 'passenger'
                    ? '乘客端'
                    : role === 'staff'
                      ? '工作人员端'
                      : '服务管理')}{' '}
              <span>→</span>
            </Button>
          </fieldset>
        </form>
      </Card>
      <Card className="care-card">
        <span className="icon-disc">
          <Icon node="1:23" name="imgIcon" />
        </span>
        <div>
          <h2>一个请求，全程接应</h2>
          <p>从行程变化到跨站交接，服务进度与你同步。</p>
        </div>
      </Card>
      <div className="entry-tip">
        <span>尚未登录也可以了解服务</span>
        <button onClick={() => setScreen('help')}>查看使用指引 →</button>
      </div>
    </>
  );
}
