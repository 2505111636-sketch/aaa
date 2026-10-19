import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const option = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const node = option('node');
const license = option('license');
const source = option('source');
const evidence = option('evidence');
const out = path.resolve(option('out') || 'release/Route-Rescue-Windows-x64');
if (!node || !license) throw new Error('Usage: node scripts/package-portable.mjs --node=path/to/node.exe --license=path/to/Node-LICENSE.txt --source=path/to/source.zip [--out=path]');
if (fs.existsSync(out)) throw new Error('Output folder already exists; choose a fresh output path.');
for (const required of ['dist-standalone/client/index.html', 'dist-standalone/server/handler.mjs', node, license]) fs.accessSync(required);
fs.mkdirSync(out, {recursive: true});
for (const directory of ['dist-standalone', 'drizzle']) fs.cpSync(directory, path.join(out, directory), {recursive: true});
fs.mkdirSync(path.join(out, 'server'));
fs.copyFileSync('server/node.mjs', path.join(out, 'server/node.mjs'));
fs.copyFileSync('scripts/portable/launcher.mjs', path.join(out, 'launcher.mjs'));
fs.mkdirSync(path.join(out, 'runtime'));
fs.copyFileSync(node, path.join(out, 'runtime/node.exe'));
fs.copyFileSync(license, path.join(out, 'runtime/Node-LICENSE.txt'));
const notices = ['react', 'react-dom', 'scheduler'].map(name => `${name}\n${fs.readFileSync(`node_modules/${name}/LICENSE`, 'utf8')}`).join('\n\n');
fs.writeFileSync(path.join(out, 'THIRD-PARTY-NOTICES.txt'), notices);
fs.copyFileSync('docs/PORTABLE.md', path.join(out, '使用说明.md'));
fs.writeFileSync(path.join(out, '先读我.txt'), '\ufeff' + [
  'Route Rescue 无障碍行程恢复协同系统 —— Windows x64 离线运行版',
  '', '1. 完整解压后，双击“启动 Route Rescue.cmd”。', '2. 不需要安装 Node.js、不需要联网、不需要运行 npm。',
  '3. 保留启动窗口。在该窗口按 Enter（回车）停止，下次启动记录仍保留。', '',
  '普通演示密码：Route2026!', '乘客：passenger01 / passenger02；工作人员：staffA / staffB / staffC。',
  '管理员密码首次启动随机生成，见 data 文件夹中的“入口与管理员账号.txt”。', '',
  '手机与电脑协同：先停服，再双击“局域网启动.cmd”；设备连接同一 Wi-Fi 或热点。',
  '完整操作流程、入口、数据备份与排错：请打开“使用说明.md”（可用记事本）。',
  '首次自动准备 A站2号电梯故障场景。仅模拟数据，无真实地铁/定位/车辆调度接口。',
  '本包供 Windows 10/11 64位（x64）使用。不要直接双击 index.html。'
].join('\r\n'));
for (const [name, args] of [['启动 Route Rescue.cmd', ''], ['局域网启动.cmd', '--lan ']]) {
  fs.writeFileSync(path.join(out, name), [
    '@echo off', 'setlocal', 'chcp 65001 >nul', 'pushd "%~dp0"',
    'if not exist "runtime\\node.exe" (', '  echo Missing runtime\\node.exe. Extract the entire ZIP first.', '  pause', '  popd', '  exit /b 1', ')',
    `"runtime\\node.exe" --disable-warning=ExperimentalWarning "launcher.mjs" ${args}%*`,
    'set "RR_EXIT=%ERRORLEVEL%"', 'if not "%RR_EXIT%"=="0" pause', 'popd', 'exit /b %RR_EXIT%', ''
  ].join('\r\n'));
}
if (source) {
  fs.mkdirSync(path.join(out, '源码'));
  fs.copyFileSync(source, path.join(out, '源码/route-rescue-source.zip'));
}
if (evidence) fs.cpSync(evidence, path.join(out, '验收记录'), {recursive: true});
function files(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
const sums = files(out).sort().map(file => `${createHash('sha256').update(fs.readFileSync(file)).digest('hex')}  ${path.relative(out, file).replaceAll('\\', '/')}`);
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(JSON.stringify({out, files: sums.length, includesRuntime: true, includesSource: !!source}));
