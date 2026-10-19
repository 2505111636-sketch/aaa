export const stations: Record<string, string> = { A: '中央车站', B: '东湖广场', C: '市民中心' };
export const publicAdminAccount = 'demoAdmin';
export const demoPassword = 'Route2026!';
export type Role = 'passenger' | 'staff' | 'admin';
export type Account = { id: string; role: Role; name: string; station: string };
export const demoAccounts: Account[] = [
  { id: 'passenger01', role: 'passenger', name: '林晓', station: '' },
  { id: 'passenger02', role: 'passenger', name: '周宁', station: '' },
  { id: 'staffA', role: 'staff', name: '陈雨 · A站服务', station: 'A' },
  { id: 'staffB', role: 'staff', name: '苏禾 · B站服务', station: 'B' },
  { id: 'staffC', role: 'staff', name: '沈航 · C站服务', station: 'C' },
  { id: 'admin', role: 'admin', name: '服务管理员', station: '' },
  { id: publicAdminAccount, role: 'admin', name: '许知远 · 运营管理', station: '' },
];

export type Task = {
  id: string;
  passenger: string;
  location: string;
  needs: string;
  note: string;
  plan: string;
  origin: string;
  target: string;
  status: string;
  assigned: string | null;
  receiver: string | null;
  escalated: number;
  archived: number;
  version: number;
  last_event: string;
  created: number;
  updated: number;
  unassigned?: boolean;
};
export const statusNames: Record<string, string> = {
  pending: '等待接单',
  accepted: '工作人员已接单',
  en_route: '工作人员赶往中',
  on_site: '现场接应中',
  handoff_pending: '等待跨站接收',
  handoff_received: '下一站已接收',
  awaiting_confirmation: '等待乘客确认',
  completed: '服务已完成',
  cancelled: '已取消',
};
export const locations = ['列车上', '站台', '站厅', '我不确定'];
export const needOptions = ['轮椅通行', '坡道辅助', '工作人员引导', '信息沟通'];
export function isUnassigned(task: Pick<Task, 'status' | 'created'>, now: number) {
  return task.status === 'pending' && now - task.created >= 120000;
}
export function canView(identity: Account, task: Task) {
  return (
    identity.role === 'admin' ||
    (identity.role === 'passenger'
      ? task.passenger === identity.id
      : task.origin === identity.station ||
        (task.target === identity.station &&
          ['handoff_pending', 'handoff_received', 'awaiting_confirmation', 'completed'].includes(
            task.status,
          )))
  );
}
export function transition(
  identity: Account,
  task: Task,
  action: string,
): { status?: string; assigned?: string; receiver?: string; escalated?: number; label: string } {
  if (!canView(identity, task) || task.archived) throw new Error('无权访问此任务');
  if (identity.role === 'passenger') {
    if (action === 'cancel' && !['completed', 'cancelled'].includes(task.status))
      return { status: 'cancelled', label: '乘客取消了本次求助' };
    if (action === 'confirm' && task.status === 'awaiting_confirmation')
      return { status: 'completed', label: '乘客确认服务完成，恢复行程' };
    if (action === 'escalate' && task.status === 'pending' && !task.escalated)
      return { escalated: 1, label: '乘客发起人工关注请求（演示队列）' };
    throw new Error('当前状态不支持此操作');
  }
  if (identity.role !== 'staff') throw new Error('该操作仅限工作人员');
  if (action === 'claim' && task.status === 'pending' && task.origin === identity.station)
    return { status: 'accepted', assigned: identity.id, label: `${identity.name} 接单` };
  if (action === 'receive' && task.status === 'handoff_pending' && task.target === identity.station)
    return {
      status: 'handoff_received',
      receiver: identity.id,
      label: `${identity.name} 确认跨站接收`,
    };
  if (task.assigned === identity.id) {
    if (action === 'depart' && task.status === 'accepted')
      return { status: 'en_route', label: '接应准备完成，正在赶往会合点' };
    if (action === 'arrive' && task.status === 'en_route')
      return { status: 'on_site', label: '工作人员确认到达现场' };
    if (action === 'handoff' && task.status === 'on_site')
      return {
        status: 'handoff_pending',
        label: `已向 ${stations[task.target]} 发送交接，等待接收确认`,
      };
    if (action === 'release' && task.status === 'accepted')
      return { status: 'pending', assigned: '', label: '工作人员退回待接单队列' };
  }
  if (action === 'finish' && task.status === 'handoff_received' && task.receiver === identity.id)
    return { status: 'awaiting_confirmation', label: '接收站确认接应完成，等待乘客确认' };
  throw new Error('当前状态或站点不支持此操作');
}
