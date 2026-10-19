# 不依赖 chatgpt.site 的独立部署

仓库提供同一 React 界面、同一服务端状态机和权限校验的 Node.js 24 + SQLite 版本。它无需 Cloudflare、ChatGPT 或外部数据库账号；适合部署在你自己可控的服务器、比赛局域网或国内云主机。它与 Sites D1 是两套独立数据库，不会自动迁移已有演示记录。

## 直接运行

```sh
npm ci
npm run build:standalone
# 设置 ADMIN_PASSWORD，生产 HTTPS 地址还需设置 PUBLIC_ORIGIN
npm run start:standalone
```

默认监听 `0.0.0.0:3000`，默认数据库路径 `data/route-rescue.sqlite`。首次启动自动应用 drizzle SQL，之后只执行新增迁移。不要删除 data 目录。仅在演示可信内网开放此端口，公网通过 HTTPS 反向代理访问。

Linux 环境示例（密码请自行替换，不提交到仓库）：

```sh
export ADMIN_PASSWORD='replace-with-a-private-password'
export PUBLIC_ORIGIN='https://your-domain.example'
export DATABASE_PATH='/var/lib/route-rescue/route-rescue.sqlite'
npm run start:standalone
```

Windows PowerShell 可用 `$env:ADMIN_PASSWORD='...'`、`$env:PUBLIC_ORIGIN='http://localhost:3000'` 设置环境变量。本地也可用 `node --env-file=.dev.vars server/node.mjs`。

## Docker Compose

在有 Docker 与 Compose 的 Linux 服务器上，克隆本仓库，在项目目录创建被 Git 忽略的 `.env`：

```dotenv
ADMIN_PASSWORD=replace-with-a-private-admin-password
PUBLIC_ORIGIN=https://your-domain.example
```

运行：

```sh
docker compose up -d --build
docker compose logs --tail=50
```

容器端口只绑定服务器本机 `127.0.0.1:3000`；SQLite 保存到 route_rescue_data 命名卷。不要执行 `docker compose down -v`，该命令会删除数据库卷。升级使用 `git pull` 后再次 `docker compose up -d --build`。

通过服务器上已有 Nginx 的 HTTPS 站点配置代理：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

PUBLIC_ORIGIN 必须与评委实际访问的 HTTPS 来源完全一致，服务端据此校验来源并设置 Secure Cookie。证书、域名、云主机账号及网络访问设置由部署方提供。当前会话没有这些资源，未代用户购买云资源或绑定未知域名。

## 验收与备份

使用另一设备访问 `/passenger` 和 `/staff`，分别登录 passenger01 与 staffA。完成从求助、接单到跨站确认的流程；重新启动容器后再次登录检查历史记录。管理员登录 `/admin` 后可设置故障，重置只归档记录。

备份应使用 SQLite 在线备份工具或停服后同时备份 `.sqlite`、`-wal`、`-shm` 文件；Docker 命名卷中数据库位置为 `/app/data/route-rescue.sqlite`。如需迁移演示数据，应先停止写入并备份，再恢复到新环境。

独立 Node 版本已执行与 D1 版本相同的 47 项业务与权限接口测试。当前设备没有 Docker CLI，因此 Docker 镜像构建未在本设备实测；Dockerfile 使用相同的已验证构建脚本与 Node 入口，部署后仍需按上述步骤验收。
