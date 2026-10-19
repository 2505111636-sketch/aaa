import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {handle} from '../dist-standalone/server/handler.mjs';
if(!process.env.ADMIN_PASSWORD){console.error('ADMIN_PASSWORD is required; set a private admin password.');process.exit(1);}
const publicDir=path.resolve('dist-standalone/client');
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  const origin=process.env.PUBLIC_ORIGIN?new URL(process.env.PUBLIC_ORIGIN).origin:`http://${req.headers.host}`;
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/')){
   const kind=url.pathname.slice(5);
   if(req.method==='GET'&&kind!=='state'||!['GET','POST'].includes(req.method)||!['login','logout','state','tasks','action','admin'].includes(kind)||req.method==='POST'&&kind==='state'){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'接口不存在'}));return;}
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'提交内容过长'}));return;}chunks.push(chunk);}
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value);
   const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const response=await handle(request,kind);res.statusCode=response.status;for(const [key,value] of response.headers)if(key!=='set-cookie')res.setHeader(key,value);const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const name=decodeURIComponent(url.pathname);let file=path.resolve(publicDir,'.'+name);
  if(file!==publicDir&&!file.startsWith(publicDir+path.sep)){res.writeHead(403);res.end();return;}
  let exists=false;try{exists=(await fsp.stat(file)).isFile();}catch{}
  if(!exists){if(path.extname(name)){res.writeHead(404);res.end();return;}file=path.join(publicDir,'index.html');}
  res.writeHead(200,{'Content-Type':mimes[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':file.endsWith('.html')?'no-cache':'public, max-age=86400','Referrer-Policy':'same-origin'});
  if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
 }catch(e){console.error('Node server error',e.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'服务暂不可用，请稍后重试'}));}
});
const port=Number(process.env.PORT||3000);server.listen(port,'0.0.0.0',()=>console.log(`Route Rescue standalone: http://127.0.0.1:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
