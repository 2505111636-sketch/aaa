import {stations,needOptions,statusNames,type Task} from './model';
export type ServiceEvent={task:string;actor:string;label:string;created:number};
export type Facility={id:string;station:string;name:string;status:string;updated:number};
const DAY=86400000,OFFSET=8*3600000;
export function periodStart(now:number,days:number){return Math.floor((now+OFFSET)/DAY)*DAY-OFFSET-(days-1)*DAY;}
export function summarize(tasks:Task[],events:ServiceEvent[],facilities:Facility[],now:number,days:number){
 const start=periodStart(now,days),previousStart=start-days*DAY;
 const current=tasks.filter(t=>t.created>=start&&t.created<=now),previous=tasks.filter(t=>t.created>=previousStart&&t.created<start);
 const live=tasks.filter(t=>!t.archived&&!['completed','cancelled'].includes(t.status));
 const completed=current.filter(t=>t.status==='completed');
 const grouped=new Map<string,ServiceEvent[]>();for(const e of events){const a=grouped.get(e.task)||[];a.push(e);grouped.set(e.task,a);}
 const waits:number[]=[],durations:number[]=[];
 for(const t of current){const log=grouped.get(t.id)||[];const claims=log.filter(e=>e.actor.startsWith('staff')&&e.label.endsWith(' 接单')&&e.created>=t.created).map(e=>e.created);if(claims.length)waits.push(Math.min(...claims)-t.created);
  const confirmations=log.filter(e=>e.actor===t.passenger&&e.label==='乘客确认服务完成，恢复行程'&&e.created>=t.created).map(e=>e.created);if(t.status==='completed'&&confirmations.length)durations.push(Math.min(...confirmations)-t.created);
 }
 const average=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length/6000)/10:null;
 const daily=Array.from({length:days},(_,i)=>{const from=start+i*DAY,rows=current.filter(t=>t.created>=from&&t.created<from+DAY);return {date:new Date(from+OFFSET).toISOString().slice(0,10),requested:rows.length,completed:rows.filter(t=>t.status==='completed').length,cancelled:rows.filter(t=>t.status==='cancelled').length};});
 const handoffs=current.filter(t=>(grouped.get(t.id)||[]).some(e=>e.label.includes('发送交接')));
 return {days,from:start,to:now,updated:now,summary:{requests:current.length,previousRequests:previous.length,completed:completed.length,previousCompleted:previous.filter(t=>t.status==='completed').length,completionRate:current.length?Math.round(completed.length/current.length*100):0,active:live.length,pending:live.filter(t=>t.status==='pending').length,unassigned:live.filter(t=>t.status==='pending'&&now-t.created>=120000).length,handoffWaiting:live.filter(t=>t.status==='handoff_pending').length,archived:current.filter(t=>t.archived).length,avgWaitMinutes:average(waits),waitSamples:waits.length,avgServiceMinutes:average(durations),serviceSamples:durations.length,handoffs:handoffs.length},daily,
  status:Object.entries(statusNames).map(([key,label])=>({key,label,count:current.filter(t=>t.status===key).length})),
  station:Object.entries(stations).map(([id,name])=>({id,name,requested:current.filter(t=>t.origin===id).length,received:handoffs.filter(t=>t.target===id).length,completed:completed.filter(t=>t.target===id).length})),
  needs:needOptions.map(name=>({name,count:current.filter(t=>{try{return (JSON.parse(t.needs) as string[]).includes(name);}catch{return false;}}).length})),
  facilities:{total:facilities.length,healthy:facilities.filter(f=>f.status==='healthy').length,fault:facilities.filter(f=>f.status==='fault').length,items:facilities},
 };
}
export type Insights=ReturnType<typeof summarize>;
