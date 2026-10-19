import {env} from 'cloudflare:workers';
import {demoAccounts,demoPassword,canView,transition,locations,needOptions,isUnassigned, type Task, type Account} from './model';
import {summarize,periodStart,type Facility,type ServiceEvent} from './insights';
const terminal=['completed','cancelled'];
export class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
function db(){if(!env.DB)throw new HttpError(503,'数据库暂不可用，请稍后重试');return env.DB;}
async function hash(value:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function equal(a:string,b:string){const x=await hash(a),y=await hash(b);let n=0;for(let i=0;i<x.length;i++)n|=x.charCodeAt(i)^y.charCodeAt(i);return n===0;}
export async function account(req:Request):Promise<Account>{
  const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('rr_session='))?.slice(11);
  if(!raw||raw.length>100)throw new HttpError(401,'请先登录账号');
  const s=await db().prepare('SELECT account FROM sessions WHERE token=? AND expires>?').bind(await hash(raw),Date.now()).first<{account:string}>();
  const a=demoAccounts.find(x=>x.id===s?.account);if(!a)throw new HttpError(401,'登录已过期，请重新登录');return a;
}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'请求来源校验失败');}
export async function body(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'请使用 JSON 请求');if(Number(req.headers.get('content-length'))>4096)throw new HttpError(413,'提交内容过长');const reader=req.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();throw new HttpError(413,'提交内容过长');}chunks.push(value);}}const raw=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}try{const parsed=JSON.parse(new TextDecoder().decode(raw));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed;}catch{throw new HttpError(400,'请求格式无效');}}
export function json(data:unknown,status=200,extra:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
let seeding:Promise<void>|undefined;
async function seed(){if(!seeding)seeding=db().batch([
 db().prepare("INSERT OR IGNORE INTO facilities VALUES ('A-E2','A','2号电梯','healthy',?)").bind(Date.now()),
 db().prepare("INSERT OR IGNORE INTO facilities VALUES ('B-E1','B','1号电梯','healthy',?)").bind(Date.now()),
 db().prepare("INSERT OR IGNORE INTO facilities VALUES ('C-R1','C','无障碍坡道','healthy',?)").bind(Date.now())]).then(()=>{}).catch(error=>{seeding=undefined;throw error;});await seeding;}
export async function login(req:Request){
 sameOrigin(req);const b=await body(req);if(typeof b.username!=='string'||typeof b.password!=='string'||b.username.length>30||b.password.length>128)throw new HttpError(400,'账号或密码格式无效');
 const key=await hash((req.headers.get('cf-connecting-ip')||'local')+':'+b.username);const now=Date.now();
 await db().prepare('INSERT INTO login_limits(key,count,until) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN until<? THEN 1 ELSE count+1 END,until=CASE WHEN until<? THEN ? ELSE until END').bind(key,now+600000,now,now,now+600000).run();
 const limit=await db().prepare('SELECT count FROM login_limits WHERE key=?').bind(key).first<{count:number}>();if((limit?.count||0)>15)throw new HttpError(429,'尝试次数较多，请在 10 分钟后重试');
 const a=demoAccounts.find(x=>x.id===b.username);const configured=(env as unknown as Record<string,string>).ADMIN_PASSWORD;
 const configuredHash=(env as unknown as Record<string,string>).ADMIN_PASSWORD_HASH;
 // The public experience administrator controls only this application's
 // fictional dataset. The owner's admin secret stays server-side and private.
 const expected=a?.id==='admin'?configured:demoPassword;
 const valid=expected?await equal(b.password,expected):a?.id==='admin'&&/^[a-f0-9]{64}$/.test(configuredHash||'')&&await equal(await hash(b.password),configuredHash);
 if(!a||!valid)throw new HttpError(401,'账号或密码不正确');
 const token=crypto.randomUUID()+crypto.randomUUID();await db().batch([db().prepare('DELETE FROM sessions WHERE expires<?').bind(now),db().prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await hash(token),a.id,now+12*3600000),db().prepare('DELETE FROM login_limits WHERE until<?').bind(now),db().prepare('DELETE FROM login_limits WHERE key=?').bind(key)]);await seed();
 return json({account:a},200,{'Set-Cookie':`rr_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${new URL(req.url).protocol==='https:'?'; Secure':''}`});
}
export async function logout(req:Request){sameOrigin(req);const raw=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('rr_session='))?.slice(11);if(raw)await db().prepare('DELETE FROM sessions WHERE token=?').bind(await hash(raw)).run();return json({ok:true},200,{'Set-Cookie':'rr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});}
export async function state(req:Request){
 const a=await account(req);await seed();
 let q='SELECT * FROM tasks WHERE archived=0';const binds:string[]=[];
 if(a.role==='passenger'){q+=' AND passenger=?';binds.push(a.id);}else if(a.role==='staff'){q+=" AND (origin=? OR (target=? AND status IN ('handoff_pending','handoff_received','awaiting_confirmation','completed')))";binds.push(a.station,a.station);}
 const selected=q+' ORDER BY created DESC,id DESC LIMIT 60';
 const eventQuery='SELECT * FROM events WHERE task IN ('+selected.replace('SELECT * FROM tasks','SELECT id FROM tasks')+') ORDER BY created,id';
 const results=await db().batch([db().prepare(selected).bind(...binds),db().prepare(eventQuery).bind(...binds),db().prepare('SELECT * FROM facilities ORDER BY id'),db().prepare("SELECT action AS id FROM audit WHERE id='scene-reset-marker'")]);
 const rows=results[0].results as unknown as Task[];
 const taskRows=rows.map(t=>({...t,unassigned:isUnassigned(t,Date.now())}));
 const resetVersion=(results[3].results[0] as {id:string}|undefined)?.id||'initial';
 return json({account:a,facilities:results[2].results,tasks:taskRows,events:results[1].results,resetVersion,serverTime:Date.now(),simulation:true});
}
export async function resetScene(req:Request){
 sameOrigin(req);const a=await account(req);const b=await body(req);
 if(b.confirm!=='RESET_ALL')throw new HttpError(400,'请确认重新开始场景');
 // All fixed experience identities have this explicitly shared reset ability.
 // General facility management and analytics remain restricted to admins.
 if(!demoAccounts.some(x=>x.id===a.id))throw new HttpError(403,'当前账号不能重置体验数据');
 await seed();const version=crypto.randomUUID(),now=Date.now();
 await db().batch([db().prepare('DELETE FROM events'),db().prepare('DELETE FROM tasks'),db().prepare("UPDATE facilities SET status=CASE WHEN id='A-E2' THEN 'fault' ELSE 'healthy' END,updated=?").bind(now),db().prepare('INSERT INTO audit VALUES (?,?,?,?)').bind(version,a.id,'重置全部体验数据',now),db().prepare('INSERT INTO audit VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET actor=excluded.actor,action=excluded.action,created=excluded.created').bind('scene-reset-marker',a.id,version,now)]);
 return json({ok:true,resetVersion:version});
}
export async function createTask(req:Request){
 sameOrigin(req);const a=await account(req);if(a.role!=='passenger')throw new HttpError(403,'仅乘客可提交求助');const b=await body(req);
 if(!locations.includes(b.location)||!Array.isArray(b.needs)||!b.needs.length||b.needs.length>4||b.needs.some((n:unknown)=>typeof n!=='string'||!needOptions.includes(n))||!['next','continue'].includes(b.plan)||typeof b.note!=='string'||b.note.length>200||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id))throw new HttpError(400,'请确认位置、需求和恢复方案');
 await seed();const target=b.plan==='next'?'B':'C';
 const f=await db().prepare('SELECT status FROM facilities WHERE station=?').bind(target).first<{status:string}>();if(f?.status!=='healthy')throw new HttpError(409,'所选恢复站点设施不可用，请选择其他方案');
 const existing=await db().prepare('SELECT * FROM tasks WHERE passenger=? AND archived=0 AND status NOT IN (?,?)').bind(a.id,...terminal).first<Task>();if(existing){if(existing.id===b.id)return json({id:existing.id});throw new HttpError(409,'已有进行中的求助，请查看服务进度');}
 const now=Date.now(),eventId=crypto.randomUUID();
 try{await db().batch([db().prepare("INSERT INTO tasks (id,passenger,location,needs,note,plan,origin,target,status,assigned,receiver,escalated,archived,version,last_event,created,updated) VALUES (?,?,?,?,?,?,'A',?,'pending',NULL,NULL,0,0,1,?,?,?)").bind(b.id,a.id,b.location,JSON.stringify([...new Set(b.needs)]),b.note,b.plan,target,eventId,now,now),db().prepare('INSERT INTO events VALUES (?,?,?,?,?)').bind(eventId,b.id,a.id,'求助已提交，等待 A站工作人员接单',now)]);}catch{throw new HttpError(409,'求助已更新，请刷新服务进度后重试');}
 return json({id:b.id},201);
}
export async function insights(req:Request){
 const a=await account(req);if(a.role!=='admin')throw new HttpError(403,'仅管理员可查看总体数据');
 const raw=new URL(req.url).searchParams.get('days')||'7';if(!['7','14','30'].includes(raw))throw new HttpError(400,'请选择 7、14 或 30 天');
 const days=Number(raw),now=Date.now(),start=periodStart(now,days)-days*86400000;await seed();
 const scope='SELECT id FROM tasks WHERE created>=? OR archived=0';
 const result=await db().batch([db().prepare('SELECT * FROM tasks WHERE created>=? OR archived=0').bind(start),db().prepare('SELECT task,actor,label,created FROM events WHERE task IN ('+scope+') ORDER BY created').bind(start),db().prepare('SELECT * FROM facilities ORDER BY id')]);
 return json(summarize(result[0].results as unknown as Task[],result[1].results as unknown as ServiceEvent[],result[2].results as unknown as Facility[],now,days));
}
export async function act(req:Request){
 sameOrigin(req);const a=await account(req);const b=await body(req);if(typeof b.id!=='string'||typeof b.action!=='string'||!Number.isInteger(b.version))throw new HttpError(400,'操作参数无效');
 const t=await db().prepare('SELECT * FROM tasks WHERE id=?').bind(b.id).first<Task>();if(!t)throw new HttpError(404,'任务不存在');if(!canView(a,t))throw new HttpError(403,'无权访问此任务');if(t.version!==b.version)throw new HttpError(409,'任务已被其他设备更新，请查看最新状态');
 let change;try{change=transition(a,t,b.action);}catch(e){throw new HttpError(409,(e as Error).message);}
 const now=Date.now(),eid=crypto.randomUUID();const updates:Record<string,unknown>={status:change.status??t.status,assigned:change.assigned===undefined?t.assigned:change.assigned||null,receiver:change.receiver??t.receiver,escalated:change.escalated??t.escalated,updated:now,version:t.version+1,last_event:eid};
 const r=await db().batch([db().prepare('UPDATE tasks SET '+Object.keys(updates).map(k=>k+'=?').join(',')+' WHERE id=? AND version=? AND archived=0').bind(...Object.values(updates),t.id,t.version),db().prepare('INSERT INTO events SELECT ?,id,?,?,? FROM tasks WHERE id=? AND last_event=?').bind(eid,a.id,change.label,now,t.id,eid)]);
 if(!r[0].meta.changes)throw new HttpError(409,'任务已被其他设备更新，请查看最新状态');return json({ok:true});
}
export async function admin(req:Request){
 sameOrigin(req);const a=await account(req);if(a.role!=='admin')throw new HttpError(403,'仅管理员可操作演示场景');const b=await body(req);const now=Date.now();
 if(b.action==='facility'){
 if(!['A-E2','B-E1','C-R1'].includes(b.id)||!['healthy','fault'].includes(b.status))throw new HttpError(400,'设施参数无效');
 await db().batch([db().prepare('UPDATE facilities SET status=?,updated=? WHERE id=?').bind(b.status,now,b.id),db().prepare('INSERT INTO audit VALUES (?,?,?,?)').bind(crypto.randomUUID(),a.id,`设施 ${b.id} 设为 ${b.status}`,now)]);
 }else if(b.action==='reset'){
 if(b.confirm!=='RESET')throw new HttpError(400,'请确认重置场景');
 await db().batch([db().prepare('INSERT INTO events SELECT lower(hex(randomblob(16))),id,?,?,? FROM tasks WHERE archived=0').bind(a.id,'管理员重置演示场景，记录已归档',now),db().prepare("UPDATE tasks SET archived=1,status=CASE WHEN status IN ('completed','cancelled') THEN status ELSE 'cancelled' END,version=version+1,updated=? WHERE archived=0").bind(now),db().prepare("UPDATE facilities SET status='healthy',updated=?").bind(now),db().prepare('INSERT INTO audit VALUES (?,?,?,?)').bind(crypto.randomUUID(),a.id,'重置演示场景并归档任务',now)]);
 }else throw new HttpError(400,'未知管理操作');return json({ok:true});
}
export async function handle(req:Request,kind:string){try{if(kind==='login')return await login(req);if(kind==='logout')return await logout(req);if(kind==='state')return await state(req);if(kind==='insights')return await insights(req);if(kind==='reset')return await resetScene(req);if(kind==='tasks')return await createTask(req);if(kind==='action')return await act(req);if(kind==='admin')return await admin(req);return json({error:'接口不存在'},404);}catch(e){if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Route Rescue API failure',e instanceof Error?e.message:'unknown');return json({error:'服务暂不可用，请稍后重试'},503);}}
