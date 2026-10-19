import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {mergeCookies} from './cookies.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:3018',cookies={},checks=[];
async function request(who,path,data,status=200,origin=base){const r=await fetch(base+'/api/'+path,{method:data===undefined?'GET':'POST',headers:{...(cookies[who]?{Cookie:cookies[who]}:{}),...(data===undefined?{}:{'Content-Type':'application/json',Origin:origin})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});const b=await r.json();assert.equal(r.status,status,who+' '+path+': '+JSON.stringify(b));cookies[who]=mergeCookies(cookies[who],r.headers.getSetCookie());return b;}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
const state=who=>request(who,'state');
await check('匿名不能直接清空共享数据',()=>request('anon','reset',{confirm:'RESET_ALL'},401));
for(const who of ['passenger01','passenger02','staffA','staffB','staffC','demoAdmin'])await request(who,'login',{username:who,password:'Route2026!'});
await check('体验管理员可使用预填密码登录并读取概览',async()=>{const a=await state('demoAdmin');assert.equal(a.account.role,'admin');assert.equal(a.account.id,'demoAdmin');await request('demoAdmin','insights');});
await check('公开体验密码不能登录私有维护账号',()=>request('private','login',{username:'admin',password:'Route2026!'},401));
await check('乘客仍不能修改设施或读取总体数据',async()=>{await request('passenger01','admin',{action:'facility',id:'A-E2',status:'healthy'},403);await request('passenger01','insights',undefined,403);});
await check('跨站请求不能重置',()=>request('passenger01','reset',{confirm:'RESET_ALL'},403,'https://invalid.example'));
await check('重置必须带有明确的场景操作标记',()=>request('passenger01','reset',{},400));
await request('demoAdmin','reset',{confirm:'RESET_ALL'});
const id=crypto.randomUUID(),second=crypto.randomUUID(),payload=id=>({id,location:'列车上',needs:['轮椅通行'],plan:'next',note:'重新开始验收'});
await request('passenger01','tasks',payload(id),201);await request('passenger02','tasks',payload(second),201);
async function act(who,action){const t=(await state(who)).tasks.find(t=>t.id===id);return request(who,'action',{id,version:t.version,action});}
for(const [who,action] of [['staffA','claim'],['staffA','depart'],['staffA','arrive'],['staffA','handoff'],['staffB','receive'],['staffB','finish'],['passenger01','confirm']])await act(who,action);
await check('重置前保留完成和进行中两类服务记录',async()=>{assert.equal((await state('passenger01')).tasks.find(t=>t.id===id).status,'completed');assert.equal((await state('passenger02')).tasks.find(t=>t.id===second).status,'pending');assert.equal((await request('demoAdmin','insights')).summary.requests,2);});
let marker;
await check('乘客一键重置可清空两端记录并恢复故障起始场景',async()=>{marker=(await request('passenger01','reset',{confirm:'RESET_ALL'})).resetVersion;assert(marker);for(const who of ['passenger01','passenger02','staffA','staffB','staffC','demoAdmin']){const s=await state(who);assert.equal(s.tasks.length,0);assert.equal(s.events.length,0);assert.equal(s.resetVersion,marker);assert.equal(s.account.id,who);assert.equal(s.facilities.find(f=>f.id==='A-E2').status,'fault');assert(s.facilities.filter(f=>f.id!=='A-E2').every(f=>f.status==='healthy'));}});
await check('重置后管理趋势和服务统计归零',async()=>{const d=await request('demoAdmin','insights?days=30');assert.equal(d.summary.requests,0);assert.equal(d.summary.completed,0);assert.equal(d.summary.archived,0);assert.equal(d.summary.active,0);assert(d.daily.every(x=>x.requested===0&&x.completed===0));});
await check('已删除记录无法继续执行旧操作',()=>request('staffA','action',{id,version:1,action:'claim'},404));
await check('乘客可以重新从头提交',async()=>{const n=crypto.randomUUID();await request('passenger01','tasks',payload(n),201);assert.equal((await state('staffA')).tasks.find(t=>t.id===n).status,'pending');});
await check('工作人员也可一键重新开始',async()=>{const r=await request('staffA','reset',{confirm:'RESET_ALL'});assert.notEqual(r.resetVersion,marker);assert.equal((await state('passenger01')).tasks.length,0);});
await check('管理员一键重置可用且刷新后持续为空',async()=>{await request('demoAdmin','reset',{confirm:'RESET_ALL'});const a=await state('demoAdmin'),b=await state('staffB');assert.equal(a.tasks.length,0);assert.equal(a.resetVersion,b.resetVersion);});
await check('连续成功登录不会被失败频率限制误拦截',async()=>{for(let i=0;i<17;i++)await request('demoAdmin','login',{username:'demoAdmin',password:'Route2026!'});});
await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/scene-reset-report.json',JSON.stringify({at:new Date().toISOString(),base,status:'PASS',checks},null,2));
