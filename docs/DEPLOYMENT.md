# 运行与部署

## 本机

使用Node.js24或更新版本，按照根目录README执行 `npm ci`、`npm run setup`、`npm run build`、`npm start`。默认端口3000，监听 `0.0.0.0`。

SQLite默认保存在 `data/route-rescue.sqlite`。升级代码时保留 `.env` 和 `data/`；停止进程后再备份数据库及其WAL文件，或使用SQLite备份工具。不要在程序运行时只复制主数据库文件。

修改 `.env` 中的PORT可换端口。局域网其他设备可通过“服务器局域网IP:端口”访问同一数据库；需要系统防火墙放行对应端口。

## 服务器

1. 将完整源码放到服务器，安装依赖并构建。
2. 将 `.env` 中的维护密码改为私有强口令；固定体验账号仍用于竞赛体验。
3. 使用进程管理器或系统服务运行 `npm start`，将 `data/` 放到持久磁盘。
4. 通过HTTPS反向代理转发到应用端口，设置 `PUBLIC_ORIGIN=https://你的域名`，重启应用。

`PUBLIC_ORIGIN` 必须与浏览器实际访问的协议和域名一致，否则写操作会被同源校验拒绝。`/health` 用于进程存活检查，不代替云端数据库连通性检查。

本整理版作为独立源码交付，不会自动替换已有正式站，也不会携带已有云资源的密码或密钥。

## PostgreSQL / Meoo

将 `DATABASE_DRIVER` 改为 `postgres`，配置 `ROUTE_RESCUE_DB_URL`、`SUPABASE_SERVICE_ROLE_KEY` 和必要的 `MEOO_PROJECT_URL_ID`。云适配器面向兼容Supabase REST RPC的服务，调用 `route_rescue_execute`，不是直接的PostgreSQL连接字符串。

数据库需要已有 `route_rescue` schema 和仅服务角色可执行的参数化批次RPC。建库脚本放在 `database/postgres/setup.sql`，请由项目所有者在目标云数据库中执行，随后配置服务端环境变量。脚本不会复制旧站的任务或会话。

Meoo容器可在构建后用 `PORT=9000 npm start`；预览使用3015端口。生产必须设置HTTPS的PUBLIC_ORIGIN；如果平台预览通过可信网关转发域名，可显式设置 `APP_PREVIEW=1`，仅在预览环境使用。

本地模式使用 `npm run setup` 生成私有配置。重新部署云端时，应在服务商的运行时密钥管理中配置维护密码和服务角色密钥，不将 `.env` 放入源码仓库或公开文件目录。
