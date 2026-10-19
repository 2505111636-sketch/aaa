import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:3018',cookies={},checks=[];
async function request(who,path,body,status=200){
 const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{Cookie:cookies[who]||'',...(body?{'Content-Type':'application/json',Origin:base}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const value=await r.json();assert.equal(r.status,status,JSON.stringify(value));
 if(r.headers.getSetCookie().length)cookies[who]=r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
 return value;
}
async function check(label,fn){await fn();checks.push(label);console.log('PASS '+label);}
await check('匿名不能访问运营档案',()=>request('anon','insights?source=archive',undefined,401));
for(const who of ['passenger01','staffA','demoAdmin'])await request(who,'login',{username:who,password:'Route2026!'});
for(const who of ['passenger01','staffA'])await check(who+'不能读取历史运营数据',()=>request(who,'insights?source=archive',undefined,403));
const before=await request('demoAdmin','state');
for(const days of [7,14,30])await check(days+'天档案数据完整且聚合一致',async()=>{
 const d=await request('demoAdmin','insights?source=archive&days='+days);
 assert.equal(d.source,'archive');assert.equal(d.daily.length,days);assert(d.summary.requests>100);
 assert.equal(d.summary.requests,d.daily.reduce((n,x)=>n+x.requested,0));
 assert.equal(d.summary.completed,d.station.reduce((n,x)=>n+x.completed,0));
 assert(!JSON.stringify(d).includes('archive-guest'));assert.equal(d.through,'2026-10-18');
});
await check('默认接口保持本轮数据兼容',async()=>{
 const a=await request('demoAdmin','insights'),b=await request('demoAdmin','insights?source=live');
 assert.equal(a.source,'live');assert.deepEqual(a.summary,b.summary);
});
await check('未知数据范围和时间范围被拒绝',async()=>{
 await request('demoAdmin','insights?source=unknown',undefined,400);
 await request('demoAdmin','insights?source=archive&days=90',undefined,400);
});
await check('读取档案不会向实际任务队列注入记录',async()=>{
 const after=await request('demoAdmin','state');assert.deepEqual(after.tasks,before.tasks);assert.deepEqual(after.events,before.events);
});
await fs.writeFile('test-results/operations-api-report.json',JSON.stringify({base,at:new Date().toISOString(),status:'PASS',checks},null,2));
