import {clearSession,selectSession,sessionContext} from './tab-session';
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function api(path: string, data?: unknown, signal?: AbortSignal): Promise<any> {
  const loginAccount =
    path === 'login' && data && typeof data === 'object' && 'username' in data
      ? String(data.username)
      : undefined;
  const response = await fetch('/api/' + path, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: {
      'X-Route-Session': sessionContext(loginAccount),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: signal || AbortSignal.timeout(15000),
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
  if (path === 'login' && loginAccount) selectSession(loginAccount);
  if (path === 'logout') clearSession();
  return result;
}
