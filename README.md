# Route Rescue 无障碍行程恢复协同系统

新版补齐独立的首页、旅程/任务、帮助和个人中心，页头提供“一键重置全部场景”；管理员增加运营概览与服务分析两个页面。功能、统计口径和权限说明见 [界面优化记录](docs/UI-UPDATE.md)。

管理员运营概览、服务分析、首页和个人中心已补齐历史运营档案，默认展示完整统计与趋势，可切换查看本轮实际服务。档案截至2026-10-18，为竞赛预设的虚构资料，独立于当前任务队列与一键重置。数据口径与验证见 [运营档案说明](docs/OPERATIONS-ARCHIVE.md)。

Windows 现场交付可使用包含 Node.js 与 SQLite 的 [离线运行包](docs/PORTABLE.md)，完整解压后双击启动，无需安装依赖或连接云服务。维护者执行 `npm run build:standalone` 后，可用 `npm run package:portable -- --node=本机node.exe路径 --license=Node官方LICENSE路径 --source=源码ZIP路径` 生成文件夹；打包时不包含 data 目录和线上管理员凭据。

无障碍服务：基于用户 Figma「无障碍出行」设计开发，面向全国大学生数字媒体科技作品及创意竞赛的移动与网络应用开发类赛项。第一版使用 3 个模拟站点、3 项模拟设施、虚拟乘客和工作人员信息。

正式入口：https://cng6c22v2wdr.meoo.fun/

访问说明：Meoo 新站公开首页及各角色入口均无需平台账号，登录使用下列应用演示账号。2026-10-19 线上 17 项闭环测试通过，用户已确认关闭 VPN 后可以正常打开。比赛现场仍应复测所用网络。共享记录保存到 Meoo PostgreSQL；[Meoo 部署说明](docs/MEOO.md) 记录环境、权限和免费套餐限制。仓库同时提供 [独立 Node.js + SQLite / Docker 部署](docs/SELF-HOST.md)。原 Sites 网址保留为旧版，数据库相互独立。

| 入口 | 账号 | 演示密码 |
| --- | --- | --- |
| `/passenger` 乘客端 | passenger01 / passenger02 | Route2026! |
| `/staff` A站工作人员 | staffA | Route2026! |
| `/staff` B站工作人员 | staffB | Route2026! |
| `/staff` C站工作人员 | staffC | Route2026! |
| `/admin` 体验管理 | demoAdmin（页面已预填） | Route2026!（页面已预填） |

公开访问无需 ChatGPT 登录或工作区邀请。普通演示密码公开，请勿输入真实个人信息。同一浏览器会共享登录 Cookie；同时体验多个角色请使用不同设备、浏览器或独立无痕窗口。

## 5 分钟体验流程

1. 初始场景为 A站 2号电梯故障。乘客 passenger01 查看影响，选择“下一站下车”，确认位置与需求并发送求助。
2. 在另一设备用 staffA 登录，打开待接单任务并接单。勾选接应准备项，点击“准备完成，前往会合点”，再确认到场。
3. staffA 点击“发送交接至 B站”。用 staffB 登录，打开“待交接”并确认接收，完成现场接应后确认完成。
4. 乘客端自动同步并出现完成确认按钮。乘客确认后任务才进入已完成。刷新或另一设备登录同一乘客账号，仍可查看任务与服务时间线。
5. 备选“继续乘坐2站”会交接给 staffC。没有工作人员接单时，2分钟后展示暂时无人接单，可发起系统内的人工关注或取消求助。
6. 管理员可修改设施故障或恢复状态。页头“一键重置”会清空两端全部服务记录和选择，管理统计归零，并恢复 A站电梯故障的初始场景。所有固定体验角色均可重新开始，其他设备会同步重置。

人工关注、站点、设施、位置、路线、时间、距离均为模拟。未接入实际地铁接口、室内定位、车辆调度、电话、短信或控制中心；真实出行请通过车站现场渠道求助。

## 本地运行

需要 Node.js 24、npm 11，Windows/macOS/Linux 均可。

```sh
npm ci
# 复制 .env.example 为 .dev.vars，并设置自己私有的 ADMIN_PASSWORD
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_stale_agent_brand.sql
npm run dev
```

访问终端显示的 `http://127.0.0.1:5173`。首次本地数据库迁移只执行一次；数据库保存在被 Git 忽略的 `.wrangler/state`。重新启动服务不会删除数据。`npm run start` 可预览构建产物，默认端口由 Wrangler 显示。生产与本地数据库互相独立。

```sh
npx tsc --noEmit
node tests/model.mjs
node tests/api.mjs
```

接口测试会重置所指向的演示场景，默认只测试本地地址。读取本地 `.dev.vars` 的管理员密码；线上测试须显式设置 BASE_URL 与 ADMIN_PASSWORD。禁止对真实运营数据运行此测试。测试输出 `test-results/api-report.json`，含 47 项业务与权限用例。

## 实现与权限

React 19 + TypeScript + Vinext/Vite。当前 Meoo 正式站使用 Node.js + PostgreSQL；工程同时支持 Cloudflare Workers + D1、独立 Node.js + SQLite。Figma 素材全部本地保存，使用普通 CSS 响应式布局，无在线字体或临时素材 URL 依赖。

- 乘客只读取、操作自己的任务与事件；工作人员仅读取本站源任务和已经交接给本站的任务。
- 只有源站工作人员可接单；只有指定目标站可确认接收；只有接收工作人员可确认完成；最后必须乘客确认。
- 服务端状态机校验每次动作，使用版本号进行乐观并发控制。D1 事务批次保证任务更新和事件记录一致；唯一索引阻止同一乘客的重复活动请求。
- HttpOnly/SameSite Cookie 中只有随机会话令牌，数据库保存令牌 SHA-256，12小时过期。生产 Cookie 使用 Secure。所有写请求校验同源与 JSON 输入；登录有失败频率限制。
- 维护账号 admin 的专用口令来自服务端运行时密钥，不在公开源码和前端中；默认体验管理员 demoAdmin 使用页面公开预填的体验密码。管理操作保留审计记录；体验场景一键重置会清空任务和时间线。
- 加载骨架、空列表、失败提示与重试、取消确认、无人接单、跨站接收等待、完成确认等状态均有对应界面。表单有标签、键盘焦点、提示区域、原生对话框和减少动态效果支持。

主要代码：`app/rescue-app.tsx` 界面与交互；`app/globals.css` 样式；`lib/model.ts` 状态机；`lib/server.ts` 服务端；`db/schema.ts` 数据模型；`drizzle/` 数据库迁移；`tests/` 自动化用例。

设计还原细节见 [docs/DESIGN.md](docs/DESIGN.md)。部署、公开访问验收、维护和独立 Cloudflare 部署方案见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

自建服务器运行：`npm run build:standalone` 后设置 ADMIN_PASSWORD 并执行 `npm run start:standalone`。默认端口 3000，SQLite 文件保存在 data/。完整 Docker、HTTPS 与持久化说明见 [docs/SELF-HOST.md](docs/SELF-HOST.md)。
