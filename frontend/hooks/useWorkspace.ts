import { useNavigation } from './useNavigation';
import { usePreferences } from './usePreferences';
import { useEffect, useRef, useState } from 'react';
import { demoPassword, publicAdminAccount, type Account, type Task } from '../../shared/model';
import { requestId as newRequestId } from '../../shared/request-id';
import { api } from '../services/client';
import { defaultPreferences } from '../features/account/preferences';
import type { Role, Snapshot } from '../types';
export function useWorkspace(initialRole?: Role) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<Role>(initialRole || 'passenger');
  const [username, setUsername] = useState(
    initialRole === 'staff'
      ? 'staffA'
      : initialRole === 'admin'
        ? publicAdminAccount
        : 'passenger01',
  );
  const [password, setPassword] = useState(demoPassword);
  const { screen, setScreen, openRecord, selected, setSelected } = useNavigation();
  const [plan, setPlan] = useState('next');
  const [location, setLocation] = useState('列车上');
  const [needs, setNeeds] = useState(['轮椅通行', '工作人员引导']);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState('pending');
  const { preferences, setPreferences, updatePreferences } = usePreferences(
    user,
    setNeeds,
    setMessage,
  );
  const [checked, setChecked] = useState<string[]>([]);
  const [modal, setModal] = useState('');
  const [resetText, setResetText] = useState('');
  const [now, setNow] = useState(Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef('');
  const userRef = useRef<Account | null>(null);
  const operationInFlight = useRef(false);
  const refreshInFlight = useRef(false);
  const resetVersionRef = useRef<string | undefined>(undefined);
  const stateRequest = useRef(0);
  function rememberReset(version: string) {
    resetVersionRef.current = version;
    try {
      localStorage.setItem('rr.scene.version', version);
    } catch {}
  }
  function clearClientScene(a: Account | null) {
    setPlan('next');
    setLocation('列车上');
    setNeeds([...defaultPreferences.needs]);
    setNote('');
    setChecked([]);
    setTab('pending');
    setSelected('');
    setModal('');
    requestId.current = '';
    setPreferences({ ...defaultPreferences, needs: [...defaultPreferences.needs] });
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('rr.preferences.')) localStorage.removeItem(key);
      }
    } catch {}
    setScreen(a?.role === 'admin' ? 'manage' : a ? 'journey' : 'home');
  }
  async function refresh(silent = false) {
    if (silent && refreshInFlight.current) return;
    refreshInFlight.current = true;
    const seq = ++stateRequest.current;
    try {
      const s: Snapshot = await api('state');
      if (seq !== stateRequest.current) return;
      if (initialRole && s.account.role !== initialRole && !userRef.current) {
        setUser(null);
        setData(null);
      } else {
        let previous = resetVersionRef.current;
        try {
          previous ??= localStorage.getItem('rr.scene.version') || undefined;
        } catch {}
        if (previous && previous !== s.resetVersion) {
          clearClientScene(s.account);
          setMessage('场景已重新开始，两端记录和选择已清空');
        }
        rememberReset(s.resetVersion);
        setData(s);
        setUser(s.account);
        userRef.current = s.account;
      }
      if (!silent) setError('');
    } catch (e) {
      if (seq !== stateRequest.current) return;
      if ((e as { status?: number }).status === 401) {
        setUser(null);
        setData(null);
        userRef.current = null;
      } else setError((e as Error).message);
    } finally {
      if (seq === stateRequest.current) {
        refreshInFlight.current = false;
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      setNow(Date.now());
      if (userRef.current && document.visibilityState === 'visible') void refresh(true);
    }, 3000);
    const focus = () => {
      if (userRef.current) void refresh(true);
    };
    window.addEventListener('focus', focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, selected]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(id);
  }, [message]);
  async function run(fn: () => Promise<void>) {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setModal('');
      setError((e as Error).message || '连接失败，请稍后重试');
      await refresh(true);
    } finally {
      operationInFlight.current = false;
      setBusy(false);
    }
  }
  async function signIn() {
    await run(async () => {
      const r = await api('login', { username, password });
      userRef.current = r.account;
      setUser(r.account);
      setRole(r.account.role);
      setScreen(r.account.role === 'admin' ? 'manage' : 'journey');
      setSelected('');
      await refresh();
      setMessage('登录成功，欢迎回来');
    });
  }
  async function signOut() {
    await run(async () => {
      await api('logout', {});
      userRef.current = null;
      setUser(null);
      setData(null);
      setSelected('');
      setScreen('home');
      setPassword(demoPassword);
      setMessage('已安全退出当前账号');
    });
  }
  function chooseRole(r: Role) {
    setRole(r);
    setUsername(r === 'staff' ? 'staffA' : r === 'admin' ? publicAdminAccount : 'passenger01');
    setPassword(demoPassword);
  }
  const tasks = data?.tasks || [];
  const active = tasks.find((t) => !['completed', 'cancelled'].includes(t.status));
  const current = tasks.find((t) => t.id === selected) || active || tasks[0];
  const fault = data?.facilities.find((f) => f.id === 'A-E2')?.status === 'fault';
  const pageNames: Record<string, string> = {
    home: user ? '安心出行，从这里开始' : '每一程，都有接应',
    help: '帮助中心',
    mine: '我的',
    profile: '个人资料',
    preferences: '出行与阅读偏好',
    saved: '常用行程',
    about: '关于 Route Rescue',
    history: '服务记录',
    manage: '服务场景管理',
    overview: '运营数据概览',
    analytics: '服务趋势分析',
    plans: '选择恢复方案',
    location: '确认当前位置',
    record: '服务记录详情',
  };
  const pageTitle =
    pageNames[screen] ||
    (!user
      ? '登录后开启旅程'
      : user.role === 'admin'
        ? '服务场景管理'
        : user.role === 'staff'
          ? selected
            ? '接应任务'
            : '今日接应任务'
          : active
            ? active.status === 'pending'
              ? '等待接应'
              : '旅程恢复中'
            : screen !== 'newJourney' && tasks[0]?.status === 'completed'
              ? '已抵达目的地'
              : '当前旅程');
  const activeNav =
    screen === 'home'
      ? 'home'
      : ['mine', 'profile', 'preferences', 'saved', 'history', 'record'].includes(screen)
        ? 'mine'
        : ['help', 'about'].includes(screen)
          ? 'help'
          : (user?.role || role) === 'admin'
            ? 'manage'
            : 'journey';
  useEffect(() => {
    document.title = pageTitle + ' · Route Rescue';
  }, [pageTitle]);
  async function action(t: Task, a: string) {
    await run(async () => {
      await api('action', { id: t.id, version: t.version, action: a });
      await refresh();
      setMessage('服务进度已更新，其他设备将同步显示');
      setModal('');
    });
  }
  async function submit() {
    await run(async () => {
      requestId.current ||= newRequestId();
      const r = await api('tasks', { id: requestId.current, location, needs, note, plan });
      await refresh();
      setSelected(r.id);
      setScreen('journey');
      requestId.current = '';
      setMessage('求助已发送，请在安全位置等候');
    });
  }
  async function manage(payload: unknown) {
    await run(async () => {
      await api('admin', payload);
      await refresh();
      setMessage('服务场景已更新');
      setModal('');
    });
  }
  function resetSelections() {
    setPlan('next');
    setLocation('列车上');
    setNeeds([...defaultPreferences.needs]);
    setNote('');
    setMessage('已重置选择：默认方案、列车上、轮椅通行与工作人员引导');
  }
  async function resetPage() {
    await run(async () => {
      stateRequest.current++;
      refreshInFlight.current = false;
      let temporary = false;
      let result: { resetVersion: string };
      try {
        if (!user) {
          await api('login', { username: publicAdminAccount, password: demoPassword });
          temporary = true;
        }
        result = await api('reset', { confirm: 'RESET_ALL' });
      } finally {
        if (temporary) await api('logout', {});
      }
      clearClientScene(user);
      rememberReset(result.resetVersion);
      if (user) await refresh();
      else {
        chooseRole(initialRole || 'passenger');
        setUser(null);
        setData(null);
        userRef.current = null;
        setLoading(false);
      }
      setMessage('已全部重置，两端服务记录和选择已清空，可以从头开始');
    });
  }

  return {
    data,
    user,
    loading,
    busy,
    error,
    message,
    role,
    username,
    password,
    screen,
    plan,
    location,
    needs,
    note,
    tab,
    selected,
    preferences,
    checked,
    modal,
    resetText,
    now,
    dialog,
    tasks,
    active,
    current,
    fault,
    pageTitle,
    activeNav,
    setUsername,
    setPassword,
    setScreen,
    openRecord,
    setSelected,
    setChecked,
    setModal,
    setResetText,
    setPlan,
    setLocation,
    setNeeds,
    setNote,
    setTab,
    setError,
    refresh,
    signIn,
    signOut,
    chooseRole,
    action,
    submit,
    manage,
    resetSelections,
    resetPage,
    updatePreferences,
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
