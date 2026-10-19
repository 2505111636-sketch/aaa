# Meoo 全栈部署与运行

本项目保留原 React/Figma 界面，以 Node.js HTTP 服务发布至 Meoo；共享任务使用同一 Meoo PostgreSQL 云数据库。容器本地文件不保存业务记录。云端与原 Sites D1、独立 SQLite 是不同数据库，原演示记录不会自动迁入。

正式网址：https://cng6c22v2wdr.meoo.fun/ 。2026-10-19 已发布 v1，发布记录 568830，平台健康检查通过。匿名首页、三类角色入口与 JS/CSS 均返回 200，匿名数据接口返回应用自身的 401，无平台登录跳转。用户确认关闭 VPN 后可以打开当前新网址。

当前源码验收：云数据库业务及权限 47 项通过；云数据库匿名权限、参数绑定和事务回滚补充检查 5 项通过；独立 SQLite 回归 47 项通过；新站实际在线闭环 17 项通过。报告位于 `test-results/`，维护者交付目录另有归档副本。

## 工程与配置

- `mise.toml`：Node 24.19.0；预览监听 `0.0.0.0:3015`，生产监听 `0.0.0.0:9000`。
- `mise run install` 安装锁定依赖，`mise run build` 生成 `dist-meoo/`，`mise run dev` / `mise run start` 启动服务。
- `meoo.config.json` 只包含当前项目 ID 和 Meoo 返回的数据库公开地址，不含任何密钥。部署到别的项目时必须更新此文件并使用对应项目凭据。
- `migrations/meoo_route_rescue.sql` 创建六张业务表与受保护的事务 RPC。表启用 RLS，匿名及普通 Supabase 用户不具有业务表读取权限；RPC 只允许 service_role。应用继续在 HTTP 服务端校验每个乘客、工作人员与管理员动作。
- `functions/rescue-config/index.ts` 使用平台运行时 Secret 提供启动配置，只接受经过 JWT 验证且与该项目 service_role 一致的服务端调用。匿名角色调用被拒绝。响应只含单向密码校验值及公开来源，不返回明文管理员密码，不将校验值写入业务数据库。
- 服务角色密钥只在服务端使用，前端只访问同源 `/api/`。不要将任何服务角色密钥放进 VITE 环境变量、浏览器客户端或 Git。

## 已有项目重新发布

在 Meoo 登录后，使用自己的项目 ID 绑定目录；本项目 ID 为 `cng6c22v2wdr`。不要重复创建或开通数据库，当前免费实例已经用于此项目。

```sh
meoo login
meoo projects use cng6c22v2wdr
```

CLI 若尝试自动改造原 Sites 的 Vite 配置，可在独立的本地服务端配置目录执行 `meoo cloud pull-env --project cng6c22v2wdr`。本应用没有通过浏览器直连数据库，不需要自动生成的前端 Supabase 客户端。不要手动修改生成文件。

新环境首次使用时，由维护者运行数据库迁移；已有环境升级仅应用新增迁移，不要删除或重建数据。配置 Meoo 运行时 Secret `ADMIN_PASSWORD`、`PUBLIC_ORIGIN` 和 `MEOO_PROJECT_URL_ID`，并部署受保护的配置函数：

```sh
meoo db query --file migrations/meoo_route_rescue.sql
meoo fn deploy rescue-config
```

管理员口令应交互输入或通过安全的本地过程设置，勿将明文粘贴到共享脚本、命令历史或公开仓库。当前新站已使用与原站不同的专用管理员口令，维护者在私有交付文件中取得。

发布前必须通过 Mise 协议、构建及真实 dev/start 门禁。`scripts/prepare-meoo.mjs` 从 Git 管理和未忽略源码生成一个新发布目录，排除本地数据库、私有变量和工具状态；Meoo 沙箱上传不读取 `.dockerignore`，因此应从此干净目录发布：

```sh
node scripts/prepare-meoo.mjs ../meoo-publish-new
# 在该干净目录内完成 mise install / mise run install / mise run build 和运行验证
meoo deploy --force
```

正式发布以 CLI 终态和匿名 HTTP 验收为准。沙箱源码同步、预览重启请求、镜像构建成功均不能单独作为正式站已可用的证据。

## 本地云数据库联调

本地服务端可在被 Git 忽略的 `.env.meoo.local` 中设置 `SUPABASE_SERVICE_ROLE_KEY`，使用与 `meoo.config.json` 对应的同一项目服务端凭据。平台 FC 运行时会注入服务角色密钥；本地凭据须由维护者从官方授权接口取得，不能用 anon key 替代。没有本地管理员明文时，服务通过受保护云函数取得单向校验值。

```sh
mise run build
mise run dev
```

对全新的虚拟演示场景执行 `tests/api.mjs` 可验证 47 项业务与权限；此测试会归档当前场景。线上用 `BASE_URL` 指定发布网址，再执行 `node tests/live-smoke.mjs`，使用 passenger02 并避免覆盖已有活动任务。

## 免费套餐边界

2026-10-19 账号实测：全栈应用 1 个、云数据库 1 个、存储 1GB、每项目云函数 1 个、并发访问限制 5。平台标注限时免费，不能承诺永久免费或无限访问。当前使用原生业务逻辑，没有调用计费 AI 模型。额度和政策以后以 https://docs.meoo.com/coindesc 及账号控制台为准。

初始场景和所有站点、设施、位置、路线、距离及个人信息均为虚拟演示。没有接入实际地铁、室内定位、车辆调度、电话、短信或控制中心。
