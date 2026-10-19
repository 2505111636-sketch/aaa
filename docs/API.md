# 接口与权限

接口位于 `/api/`，返回JSON。登录使用HttpOnly、SameSite=Strict Cookie，HTTPS下启用Secure。会话令牌只在Cookie中传递，数据库保存其SHA-256摘要。

写请求需要 `Content-Type: application/json`，Origin必须与访问域名一致，请求体上限4096字节。业务冲突返回409，未登录返回401，越权返回403，无法处理的服务异常返回503。

| 方法 | 接口        | 说明                                               |
| ---- | ----------- | -------------------------------------------------- |
| POST | `/login`    | username、password；账号角色由服务端决定           |
| POST | `/logout`   | 撤销当前会话                                       |
| GET  | `/state`    | 角色可见的任务、事件、设施和场景版本               |
| POST | `/tasks`    | 乘客提交位置、需求和恢复方案，id提供幂等标识       |
| POST | `/action`   | id、version、action；服务端验证状态流转            |
| POST | `/reset`    | confirm为RESET_ALL，清空固定体验账号的共享场景     |
| POST | `/admin`    | 管理员设施变更；保留兼容归档入口                   |
| GET  | `/insights` | 管理员统计，days为7／14／30，source为live或archive |

状态动作包括claim、depart、arrive、handoff、receive、finish、confirm、cancel、release、escalate。允许的角色、站点与当前状态统一由 `shared/model.ts` 校验。

乘客只能查看自己的任务。工作人员读取本站源任务，以及已经发送到本站的交接任务。总体统计和设施管理仅向管理员开放。

体验账号共同拥有重置场景的能力；重置清空任务与时间线，但保留会话和管理审计。运营档案独立于当前任务，不随本轮重置删除。固定体验账号应只用于虚构数据，不用于真实个人信息或正式交通调度。
