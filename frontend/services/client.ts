import type { Insights } from '../../shared/insights';
import type { Account } from '../../shared/model';
import type { Snapshot } from '../types';

type Responses = {
  state: Snapshot;
  login: { account: Account };
  logout: { ok: boolean };
  tasks: { id: string };
  action: { ok: boolean };
  admin: { ok: boolean };
  reset: { ok: boolean; resetVersion: string };
};
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function api<P extends keyof Responses>(path: P, data?: unknown): Promise<Responses[P]>;
export function api<T>(path: string, data?: unknown): Promise<T>;
export async function api(path: string, data?: unknown): Promise<unknown> {
  const response = await fetch('/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('服务响应异常，请稍后重试', response.status);
  }
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result
        ? String(result.error)
        : '操作失败，请重试';
    throw new ApiError(message, response.status);
  }
  return result;
}
export const fetchInsights = (path: string) => api<Insights>(path);
