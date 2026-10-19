import { HttpError, json } from './core/http';
import { admin } from './routes/admin';
import { login, logout } from './routes/auth';
import { insights } from './routes/insights';
import { resetScene, state } from './routes/scene';
import { act, createTask } from './routes/tasks';

const routes = {
  GET: { state, insights },
  POST: { login, logout, tasks: createTask, action: act, admin, reset: resetScene },
} satisfies Record<string, Record<string, (request: Request) => Promise<Response>>>;

export async function handle(request: Request): Promise<Response> {
  const kind = new URL(request.url).pathname.slice('/api/'.length);
  const group = routes[request.method as keyof typeof routes] as
    | Record<string, (r: Request) => Promise<Response>>
    | undefined;
  const handler = group?.[kind];
  if (!handler) return json({ error: '接口不存在' }, 404);
  try {
    return await handler(request);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error('API request failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: '服务暂不可用，请稍后重试' }, 503);
  }
}
