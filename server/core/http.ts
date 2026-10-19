export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (origin !== new URL(req.url).origin || req.headers.get('sec-fetch-site') === 'cross-site')
    throw new HttpError(403, '请求来源校验失败');
}
export async function body(req: Request) {
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, '请使用 JSON 请求');
  if (Number(req.headers.get('content-length')) > 4096) throw new HttpError(413, '提交内容过长');
  const reader = req.body?.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        throw new HttpError(413, '提交内容过长');
      }
      chunks.push(value);
    }
  }
  const raw = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, '请求格式无效');
  }
}
export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}
