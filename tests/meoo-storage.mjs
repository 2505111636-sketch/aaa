import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:service,SUPABASE_ANON_KEY:anon}=process.env;
if(!url||!service||!anon)throw new Error('Set server-only Meoo database test credentials');
const checks=[];
async function rpc(key,statements){const r=await fetch(url+'/rest/v1/rpc/route_rescue_execute',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},body:JSON.stringify({statements}),signal:AbortSignal.timeout(30000)});return {status:r.status,body:await r.json()};}
const query=(sql,args=[])=>({sql,args});
const id='diagnostic-'+crypto.randomUUID(),rollbackId='rollback-'+crypto.randomUUID(),value="虚拟测试：O'Brien ? 请在车门处接应";
try{
 const denied=await rpc(anon,[query('SELECT 1')]);assert([401,403].includes(denied.status));checks.push('匿名角色不能执行数据库事务接口');
 let r=await rpc(service,[query('INSERT INTO route_rescue.audit VALUES (?,?,?,?)',[id,'integration-test',value,Date.now()]),query('SELECT action FROM route_rescue.audit WHERE id=?',[id])]);assert.equal(r.status,200);assert.equal(r.body[1].results[0].action,value);checks.push('引号、问号和中文作为数据正确保存');
 r=await rpc(service,[query('INSERT INTO route_rescue.audit VALUES (?,?,?,?)',[rollbackId,'integration-test','transaction rollback',Date.now()]),query('INSERT INTO route_rescue.audit VALUES (?,?,?,?)',[id,'integration-test','duplicate',Date.now()])]);assert.equal(r.status,409);checks.push('重复键使整个事务失败');
 r=await rpc(service,[query('SELECT count(*) AS count FROM route_rescue.audit WHERE id=?',[rollbackId])]);assert.equal(r.status,200);assert.equal(r.body[0].results[0].count,0);checks.push('事务中先前的写入完整回滚');
 r=await fetch(url+'/functions/v1/rescue-config',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+anon},signal:AbortSignal.timeout(30000)});assert.equal(r.status,403);checks.push('匿名角色不能读取运行时管理员校验值');
 const report={at:new Date().toISOString(),status:'PASS',checks};await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/meoo-storage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await rpc(service,[query('DELETE FROM route_rescue.audit WHERE id IN (?,?)',[id,rollbackId])]);}
