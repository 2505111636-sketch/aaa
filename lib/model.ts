export const stations:Record<string,string> = {A:'中央车站',B:'东湖广场',C:'市民中心'};
export const publicAdminAccount='demoAdmin';
export const demoPassword='Route2026!';
export const demoAccounts = [
  {id:'passenger01',role:'passenger',name:'林晓',station:''},
  {id:'passenger02',role:'passenger',name:'周宁',station:''},
  {id:'staffA',role:'staff',name:'陈雨 · A站服务',station:'A'},
  {id:'staffB',role:'staff',name:'苏禾 · B站服务',station:'B'},
  {id:'staffC',role:'staff',name:'沈航 · C站服务',station:'C'},
  {id:'admin',role:'admin',name:'服务管理员',station:''},
  {id:publicAdminAccount,role:'admin',name:'体验管理员',station:''}
];
export type Account = typeof demoAccounts[number];
export type Task = {id:string;passenger:string;location:string;needs:string;note:string;plan:string;origin:string;target:string;status:string;assigned:string|null;receiver:string|null;escalated:number;archived:number;version:number;last_event:string;created:number;updated:number;unassigned?:boolean};
export const statusNames:Record<string,string>={pending:'等待接单',accepted:'工作人员已接单',en_route:'工作人员赶往中',on_site:'现场接应中',handoff_pending:'等待跨站接收',handoff_received:'下一站已接收',awaiting_confirmation:'等待乘客确认',completed:'服务已完成',cancelled:'已取消'};
export const locations=['列车上','站台','站厅','我不确定'];
export const needOptions=['轮椅通行','坡道辅助','工作人员引导','信息沟通'];
export function isUnassigned(t:Pick<Task,'status'|'created'>,now:number){return t.status==='pending'&&now-t.created>=120000;}
export function canView(a:Account,t:Task){return a.role==='admin'||(a.role==='passenger'?t.passenger===a.id:t.origin===a.station||((t.target===a.station)&&['handoff_pending','handoff_received','awaiting_confirmation','completed'].includes(t.status)));}
export function transition(a:Account,t:Task,action:string):{status?:string;assigned?:string;receiver?:string;escalated?:number;label:string}{
  if(!canView(a,t)||t.archived)throw new Error('无权访问此任务');
  if(a.role==='passenger'){
    if(action==='cancel'&&!['completed','cancelled'].includes(t.status))return {status:'cancelled',label:'乘客取消了本次求助'};
    if(action==='confirm'&&t.status==='awaiting_confirmation')return {status:'completed',label:'乘客确认服务完成，恢复行程'};
    if(action==='escalate'&&t.status==='pending'&&!t.escalated)return {escalated:1,label:'乘客发起人工关注请求（演示队列）'};
    throw new Error('当前状态不支持此操作');
  }
  if(a.role!=='staff')throw new Error('该操作仅限工作人员');
  if(action==='claim'&&t.status==='pending'&&t.origin===a.station)return {status:'accepted',assigned:a.id,label:`${a.name} 接单`};
  if(action==='receive'&&t.status==='handoff_pending'&&t.target===a.station)return {status:'handoff_received',receiver:a.id,label:`${a.name} 确认跨站接收`};
  if(t.assigned===a.id){
    if(action==='depart'&&t.status==='accepted')return {status:'en_route',label:'接应准备完成，正在赶往会合点'};
    if(action==='arrive'&&t.status==='en_route')return {status:'on_site',label:'工作人员确认到达现场'};
    if(action==='handoff'&&t.status==='on_site')return {status:'handoff_pending',label:`已向 ${stations[t.target]} 发送交接，等待接收确认`};
    if(action==='release'&&t.status==='accepted')return {status:'pending',assigned:'',label:'工作人员退回待接单队列'};
  }
  if(action==='finish'&&t.status==='handoff_received'&&t.receiver===a.id)return {status:'awaiting_confirmation',label:'接收站确认接应完成，等待乘客确认'};
  throw new Error('当前状态或站点不支持此操作');
}
