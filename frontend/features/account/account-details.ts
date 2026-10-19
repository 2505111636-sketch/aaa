import type { Account } from '../../../shared/model';
export const roleName = (a: Account) =>
  a.role === 'staff' ? '车站接应专员' : a.role === 'admin' ? '协同服务管理员' : '无障碍出行乘客';
export const codes: Record<string, string> = {
  passenger01: 'RR-P001',
  passenger02: 'RR-P002',
  staffA: 'RR-A021',
  staffB: 'RR-B016',
  staffC: 'RR-C008',
  admin: 'RR-ADMIN',
  demoAdmin: 'RR-ADMIN-01',
};
