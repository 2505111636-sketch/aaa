import type { Facility, ServiceEvent } from '../shared/insights';
import type { Account, Task } from '../shared/model';
export type Role = 'passenger' | 'staff' | 'admin';
export type Go = (screen: string) => void;
export type PageData = { tasks: Task[]; facilities: Facility[] };
export type Snapshot = PageData & {
  account: Account;
  events: (ServiceEvent & { id: string })[];
  resetVersion: string;
  serverTime: number;
};
