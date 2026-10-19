import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'https://route-rescue-accessible.red-sage-5554.chatgpt.site';
const cookies={},checks=[];let created;
async function request(who,route,data,expected=200){const r=await fetch(base+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json',Origin:base}),...(cookies[who]?{Cookie:cookies[who]}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const raw=await r.text();let b;try{b=JSON.parse(raw);}catch{throw new Error(`Hosting returned ${r.status} instead of JSON; network/edge access check failed`);}assert.equal(r.status,expected,`${who} ${route}: ${JSON.stringify(b)}`);const cookie=r.headers.get('set-cookie');if(cookie)cookies[who]=cookie.split(';')[0];return b;}
async function check(name,fn){await fn();checks.push({name,status:'PASS'});console.log('PASS '+name);}
const state=who=>request(who,'state');
async function task(who){return (await state(who)).tasks.find(t=>t.id===created);}
async function act(who,action,expected=200){const t=await task(who);return request(who,'action',{id:created,version:t?.version,action},expected);}
const report={base,at:new Date().toISOString(),checks,status:'RUNNING'};
try{
await check('公开站点匿名请求到达应用并返回401',()=>request('anon','state',undefined,401));
for(const a of ['passenger01','passenger02','staffA','staffB','staffC'])await check(a+' 可使用公开演示密码独立登录',()=>request(a,'login',{username:a,password:'Route2026!'}));
const before=await state('passenger02');if(before.tasks.some(t=>!['completed','cancelled'].includes(t.status)))throw new Error('passenger02 has an active manual demonstration; automatic test did not modify it');
const target=before.facilities.find(f=>f.station==='B')?.status==='healthy'?'B':'C';
await check('生产数据库可保存求助',async()=>{created=crypto.randomUUID();await request('passenger02','tasks',{id:created,location:'列车上',needs:['轮椅通行','工作人员引导'],plan:target==='B'?'next':'continue',note:'自动验收虚拟数据'},201);assert.equal((await task('passenger02')).status,'pending');});
await check('生产数据按乘客隔离',async()=>assert(!(await state('passenger01')).tasks.some(t=>t.id===created)));
await check('接单竞态只有一个成功',async()=>{const t=await task('staffA');const r=await Promise.all([1,2].map(()=>fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookies.staffA},body:JSON.stringify({id:created,version:t.version,action:'claim'}),signal:AbortSignal.timeout(15000)})));assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);});
await check('准备后更新为赶往现场',()=>act('staffA','depart'));
await check('工作人员确认到场',()=>act('staffA','arrive'));
await check('发送跨站交接',()=>act('staffA','handoff'));
await check('接收站可看到相同任务',async()=>assert.equal((await task('staff'+target)).status,'handoff_pending'));
await check('接收站确认接收',()=>act('staff'+target,'receive'));
await check('接收站确认服务完成',()=>act('staff'+target,'finish'));
await check('乘客完成最终确认',()=>act('passenger02','confirm'));
await check('新登录会话可读取已完成记录和时间线',async()=>{await request('newDevice','login',{username:'passenger02',password:'Route2026!'});const s=await state('newDevice');assert.equal(s.tasks.find(t=>t.id===created).status,'completed');assert.equal(s.events.filter(e=>e.task===created).length,8);});
report.status='PASS';report.total=checks.length;report.task=created;
}catch(e){report.status='FAIL';report.error=e.message;try{if(created){const t=await task('passenger02');if(t&&!['completed','cancelled'].includes(t.status))await act('passenger02','cancel');}}catch{}process.exitCode=1;console.error(e.message);}
await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/live-report.json',JSON.stringify(report,null,2));
