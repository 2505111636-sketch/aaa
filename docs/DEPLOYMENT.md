# 部署与维护

当前正式站：https://cng6c22v2wdr.meoo.fun/ 。使用 Meoo Node.js + PostgreSQL，已通过匿名访问和线上闭环验收，用户确认关闭 VPN 后可打开。部署与免费额度详情见 [MEOO.md](MEOO.md)。

下文保留旧 Sites/Cloudflare 版本的部署记录。原站使用 Sites 托管 React/Vinext Worker，并绑定 Cloudflare D1 服务端数据库，与当前 Meoo 数据库独立。应用为公开访问；应用内再校验虚拟演示账号。管理密码不包含在源码中。

访问实测：托管返回 succeeded，生产 D1 的 6 张表已创建。真实浏览器可打开应用登录页；生产日志确认登录返回 200，随后读取共享状态返回 200。当前执行主机的命令行网络请求被 Cloudflare 边缘返回 403，所以线上完整自动接口验收不能在该网络中执行，不能声称所有比赛网络均可访问。赛前请使用评委预期网络实测；若受拦截，优先采用 [独立 Node.js + SQLite 部署方案](SELF-HOST.md)，该方案不依赖 chatgpt.site。

已从 GitHub Actions 的执行网络完成正式站 17 项闭环验收，结果通过，包含生产任务写入、跨站交接、最终完成和新会话持久读取。详见 [测试记录](TESTS.md)。

部署验收：使用未登录访问 `/passenger`、`/staff`、`/admin` 应看到应用内登录页；`GET /api/state` 应返回 401。普通账号不具有设施修改或重置权限。按 README 的三角色流程完成一轮后刷新，任务及事件应仍然存在。

## 独立 Cloudflare 部署（可执行替代方案）

需要拥有 Cloudflare 账号并在当地网络中可访问 Cloudflare；公共域名的中国大陆具体网络可达性须在比赛网络实测。GitHub Pages 只能托管静态页面，不能直接运行本应用的服务端权限与共享数据库。

1. `npm ci`，安装 Node.js 24。
2. `npx wrangler login`，登录自己的 Cloudflare 账号。
3. `npx wrangler d1 create route-rescue-db`，记下返回的 database_id。
4. 复制 `wrangler.standalone.jsonc.example` 为 `wrangler.standalone.jsonc`，替换 database_id。
5. `npm run build`。
6. 首次部署执行 `npx wrangler d1 execute DB --remote --config wrangler.standalone.jsonc --file drizzle/0000_stale_agent_brand.sql`。该迁移只首次执行；后续按新增 SQL 顺序执行。
7. `npx wrangler secret put ADMIN_PASSWORD --config wrangler.standalone.jsonc`，交互输入管理员密码。
8. `npx wrangler deploy --config wrangler.standalone.jsonc`，记录返回的 workers.dev 网址；也可在 Cloudflare 控制台绑定自有域名。
9. 按上述验收流程在另一台设备和无痕浏览器验证访问。

后续更新只需检查、构建与部署；不要重新应用已执行的建表 SQL。删除 D1 数据库会丢失记录。应用的重置按钮只归档任务，不删除历史记录；如需从归档中恢复，先备份数据库再由维护人员操作。

## 已知适用范围

这是单场景、多虚拟账号的竞赛演示。普通演示账号的密码公开；应只使用虚拟信息。不同评委登录同一个乘客账号会共享该乘客的任务，这也是跨设备演示的机制；独立体验可用 passenger02。列表读取最近 60 条当前场景任务。轮询间隔为 3 秒，后台标签页暂停轮询，重新聚焦会立即刷新。

真实运营版本需要替换演示账号为实名授权身份体系，接入真实设施数据并经过运营、安全和无障碍审核，完善多租户、消息推送、人工队列调度及长期审计归档管理。
# 当前正式入口（Meoo）

https://cng6c22v2wdr.meoo.fun/ 。当前发布和维护请优先参阅 [MEOO.md](MEOO.md)。下文记录原 Sites/Cloudflare 部署路径，旧站数据库与 Meoo 独立。

