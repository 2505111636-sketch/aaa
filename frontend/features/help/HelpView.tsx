import { ArrowUpRight, LifeBuoy, ShieldCheck } from 'lucide-react';
import { Card as Box, Menu } from '../../components/ui';
import type { Go } from '../../types';
export function Help({ go, about = false }: { go: Go; about?: boolean }) {
  return about ? (
    <>
      <button className="back" onClick={() => go('help')}>
        ← 返回帮助中心
      </button>
      <Box className="about-brand">
        <img src="/figma/60dd8.png" alt="" />
        <h2>Route Rescue</h2>
        <p>让中断的行程，重新连接。</p>
        <span className="badge">协同服务系统 · 2.0</span>
      </Box>
      <Box>
        <h2>作品与数据说明</h2>
        <p>
          本作品用于数字媒体科技竞赛展示。站点、设施、路线、预计时间及人物资料均为虚构设定；管理员运营档案为预设的历史服务资料，用于展示统计与分析；本轮接应请求与服务进度真实保存在本系统数据库中。
        </p>
        <p>
          系统未接入实际地铁接口、室内定位、车辆调度、电话、短信或控制中心。位置由使用者手动确认，路线与距离为预设参考。
        </p>
        <p>真实出行遇到困难，请联系车站现场服务人员。请勿在公开体验账号中提交真实个人信息。</p>
      </Box>
      <Box>
        <h2>隐私与权限</h2>
        <p>
          乘客仅可查看自己的服务记录；工作人员按站点与交接阶段访问任务；总体数据和设施管理仅向管理员开放。
        </p>
        <p>不同设备使用各自账号登录，共享同一服务任务。退出账号后会话立即失效。</p>
      </Box>
    </>
  ) : (
    <>
      <Box className="help-banner">
        <span className="icon-disc">
          <LifeBuoy size={28} />
        </span>
        <h2>有什么可以帮到你？</h2>
        <p>从发起求助到安心抵达，了解每一步。</p>
      </Box>
      <Box>
        <h2>接应服务怎么使用</h2>
        <ol className="help-steps">
          {[
            ['查看行程', '了解沿线设施状态，选择恢复方案。'],
            ['确认需求', '手动确认当前位置，勾选通行需求。'],
            ['协同接应', '源站接单并到场，目标站确认接收。'],
            ['完成确认', '工作人员完成接应后，由乘客确认结果。'],
          ].map(([title, text], i) => (
            <li key={title}>
              <b>{i + 1}</b>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button className="button primary" onClick={() => go('journey')}>
          查看我的旅程 <ArrowUpRight size={18} />
        </button>
      </Box>
      <Box>
        <h2>常见问题</h2>
        {[
          [
            '一直没有人接单怎么办？',
            '等待超过2分钟后会显示无人接单提示。你可以发起系统内人工关注，也可以取消并重新选择方案。此操作不会拨打电话或联系实际控制中心。',
          ],
          [
            '如何查看跨站交接进展？',
            '工作人员发送交接后，旅程页面会显示等待目标站接收。目标站确认后，进度和时间线会自动更新。',
          ],
          [
            '刷新页面会丢失记录吗？',
            '服务记录保存在服务器数据库中，登录同一账号可继续查看。点击“一键重置”会清空全部体验账号的服务记录与页面选择，所有设备同步重新开始。',
          ],
          [
            '如何同时体验乘客和工作人员？',
            '请在不同设备、浏览器或独立无痕窗口登录。乘客使用 passenger01 或 passenger02，工作人员使用 staffA、staffB 或 staffC，体验密码均为 Route2026!。',
          ],
        ].map(([q, a]) => (
          <details className="faq" key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </Box>
      <Menu
        icon={<ShieldCheck size={21} />}
        label="系统说明与数据来源"
        detail="了解作品范围与隐私保护"
        onClick={() => go('about')}
      />
    </>
  );
}
