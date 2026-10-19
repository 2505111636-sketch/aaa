import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { handle } from './router';
const devServer =
  process.env.NODE_ENV === 'development'
    ? await (
        await import('vite')
      ).createServer({
        configFile: path.resolve('vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      })
    : null;
if (!process.env.ADMIN_PASSWORD && !/^[a-f0-9]{64}$/.test(process.env.ADMIN_PASSWORD_HASH || '')) {
  console.error('A private admin password or server-only password verifier is required.');
  process.exit(1);
}
if (
  process.env.MEOO_REQUIRE_SECURE_ORIGIN === '1' &&
  !process.env.PUBLIC_ORIGIN?.startsWith('https://')
)
  throw new Error('The Meoo public HTTPS origin is not configured');
const publicDir = path.resolve('dist/client');
const mimes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const server = http.createServer(async (req, res) => {
  try {
    const preview = process.env.APP_PREVIEW === '1';
    const forwardedHost = preview && req.headers['x-forwarded-host'];
    const previewHost =
      typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : req.headers.host;
    const previewProtocol =
      preview && req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const origin = process.env.PUBLIC_ORIGIN
      ? new URL(process.env.PUBLIC_ORIGIN).origin
      : `${previewProtocol}://${previewHost}`;
    const url = new URL(req.url || '/', origin);
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(
        JSON.stringify({
          app: 'route-rescue',
          status: 'ok',
          ...(process.env.TEST_INSTANCE ? { testInstance: process.env.TEST_INSTANCE } : {}),
        }),
      );
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      let size = 0;
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4096) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '提交内容过长' }));
          return;
        }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers))
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      const request = new Request(url, {
        method: req.method,
        headers,
        ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await handle(request);
      res.statusCode = response.status;
      for (const [key, value] of response.headers)
        if (key !== 'set-cookie') res.setHeader(key, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (devServer) {
      devServer.middlewares(req, res);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    const name = decodeURIComponent(url.pathname);
    let file = path.resolve(publicDir, '.' + name);
    if (file !== publicDir && !file.startsWith(publicDir + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let exists = false;
    try {
      exists = (await fsp.stat(file)).isFile();
    } catch {}
    if (!exists) {
      if (path.extname(name)) {
        res.writeHead(404);
        res.end();
        return;
      }
      file = path.join(publicDir, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': mimes[path.extname(file)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=86400',
      'Referrer-Policy': 'same-origin',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error('HTTP request failed', e instanceof Error ? e.message : 'unknown');
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '服务暂不可用，请稍后重试' }));
  }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || '0.0.0.0', () =>
  console.log(`Route Rescue server: http://127.0.0.1:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
export { server };
