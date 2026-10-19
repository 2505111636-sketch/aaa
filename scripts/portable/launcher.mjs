import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';
import {randomBytes, randomUUID} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const data = path.join(root, 'data');
fs.mkdirSync(data, {recursive: true});
const configPath = path.join(data, 'local-config.json');
const runningPath = path.join(data, 'running.json');
const args = process.argv.slice(2);
const lan = args.includes('--lan');
const noBrowser = args.includes('--no-browser');
let ownsRunningFile = false;

function browser(url) {
  if (noBrowser) return;
  const child = spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], {windowsHide: true, stdio: 'ignore'});
  child.on('error', () => console.log('请复制上方地址到浏览器打开。'));
  child.unref();
}
function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', {mode: 0o600});
}
async function freePort(first) {
  for (let port = first; port < first + 30 && port < 65536; port++) {
    const available = await new Promise(resolve => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => probe.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error('未找到可用端口。请关闭占用端口的程序，或添加 --port=其他端口 后重试。');
}
async function main() {
  let config;
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (typeof config.adminPassword !== 'string' || config.adminPassword.length < 12 || typeof config.installationId !== 'string') {
      throw new Error('data/local-config.json 格式无效。请从备份恢复此文件。');
    }
  } else {
    config = {installationId: randomUUID(), adminPassword: 'RR-' + randomBytes(15).toString('base64url') + '!', seeded: false};
    saveConfig(config);
  }
  if (fs.existsSync(runningPath)) {
    try {
      const running = JSON.parse(fs.readFileSync(runningPath, 'utf8'));
      const url = `http://127.0.0.1:${Number(running.port)}`;
      const response = await fetch(url + '/__portable-health', {signal: AbortSignal.timeout(1500)});
      const status = await response.json();
      if (status.app === 'route-rescue' && status.installation === config.installationId) {
        console.log(`Route Rescue 已在运行：${url}/passenger`);
        if (lan && !running.lan) console.log('当前为本机模式。请先在原启动窗口按 Ctrl+C 停止，再双击“局域网启动.cmd”。');
        browser(url + '/passenger');
        return;
      }
    } catch { /* A closed console may leave a stale marker. The database is kept. */ }
  }
  const requestedPort = args.find(a => a.startsWith('--port='))?.slice(7) || '3000';
  if (!/^\d+$/.test(requestedPort) || Number(requestedPort) < 1024 || Number(requestedPort) > 65505) throw new Error('端口须为 1024 至 65505 的整数。');
  const port = await freePort(Number(requestedPort));
  const base = `http://127.0.0.1:${port}`;
  process.env.PORT = String(port);
  process.env.HOST = lan ? '0.0.0.0' : '127.0.0.1';
  process.env.ADMIN_PASSWORD = config.adminPassword;
  process.env.DATABASE_PATH = path.join(data, 'route-rescue.sqlite');
  process.env.APP_BUNDLE_DIR = path.join(root, 'dist-standalone');
  process.env.ROUTE_RESCUE_PORTABLE_ID = config.installationId;
  delete process.env.PUBLIC_ORIGIN;
  delete process.env.APP_PREVIEW;
  delete process.env.MEOO_REQUIRE_SECURE_ORIGIN;
  const {server} = await import(pathToFileURL(path.join(root, 'server', 'node.mjs')));
  if (!server.listening) await once(server, 'listening');
  fs.writeFileSync(runningPath, JSON.stringify({port, lan, pid: process.pid}));
  ownsRunningFile = true;

  if (!config.seeded) {
    const headers = {'Content-Type': 'application/json', Origin: base};
    const login = await fetch(base + '/api/login', {method: 'POST', headers, body: JSON.stringify({username: 'admin', password: config.adminPassword})});
    if (!login.ok) throw new Error('首次演示场景初始化登录失败。请查看 data/startup.log。');
    const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const initialized = await fetch(base + '/api/admin', {method: 'POST', headers: {...headers, Cookie: cookie}, body: JSON.stringify({action: 'facility', id: 'A-E2', status: 'fault'})});
    if (!initialized.ok) throw new Error('首次演示故障设置失败。');
    await fetch(base + '/api/logout', {method: 'POST', headers: {...headers, Cookie: cookie}, body: '{}'});
    config.seeded = true;
    saveConfig(config);
  }
  const endpoints = [`本机乘客端：${base}/passenger`, `本机工作人员端：${base}/staff`, `本机管理入口：${base}/admin`];
  if (lan) {
    for (const addresses of Object.values(os.networkInterfaces())) {
      for (const address of addresses || []) {
        if (!address.internal && address.family === 'IPv4') endpoints.push(`局域网候选地址：http://${address.address}:${port}/passenger`);
      }
    }
  }
  fs.writeFileSync(path.join(data, '入口与管理员账号.txt'), '\ufeff' + [
    'Route Rescue 离线演示；仅使用虚拟信息', ...endpoints,
    '', '乘客账号：passenger01 / passenger02', '工作人员账号：staffA / staffB / staffC',
    '普通演示密码：Route2026!', '', '本运行包的管理员账号：admin', `本运行包的管理员密码：${config.adminPassword}`,
    '', '管理员密码首次启动随机生成，与线上环境独立。请勿公开上传 data 文件夹。',
    '停止服务后，完整复制 data 文件夹可备份记录和管理员配置。'
  ].join('\r\n'), {mode: 0o600});
  console.log('\nRoute Rescue 已就绪（模拟站点与设施演示）\n');
  console.log(endpoints.join('\n'));
  console.log('\n普通账号密码：Route2026!');
  console.log('管理员账号与密码：请打开 data 文件夹中的“入口与管理员账号.txt”');
  console.log('请保留本窗口。在本窗口按 Enter（回车）停止服务；也可按 Ctrl+C。下次启动会保留记录。');
  if (lan) console.log('手机与电脑须在同一局域网。使用实际连接的 IPv4 地址；如防火墙提示，请仅允许可信专用网络。');
  console.log('\nREADY ' + base);
  fs.appendFileSync(path.join(data, 'startup.log'), `${new Date().toISOString()} ready ${base} mode=${lan ? 'lan' : 'local'}\n`);
  process.stdin.on('data', chunk => {
    if (/[\r\n]/.test(chunk.toString())) {
      console.log('正在保存并停止服务……');
      server.close(() => process.exit(0));
    }
  });
  process.stdin.resume();
  browser(base + '/passenger');
}
process.on('exit', () => {
  if (ownsRunningFile) {
    try { fs.unlinkSync(runningPath); } catch { /* Already removed. */ }
  }
});
main().catch(error => {
  const message = error instanceof Error ? error.message : '启动失败';
  console.error('\n启动失败：' + message);
  console.error('请确认完整解压到可写文件夹；不要直接在压缩包里运行。');
  fs.appendFileSync(path.join(data, 'startup.log'), `${new Date().toISOString()} error ${message}\n`);
  process.exit(1);
});
