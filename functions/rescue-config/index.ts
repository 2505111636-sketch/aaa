export {};
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const response=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
Deno.serve(async(request:Request)=>{
  if(request.method!=='POST')return response({error:'Method not allowed'},405);
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /,'');
  if(!serviceKey||!bearer)return response({error:'Forbidden'},403);
  const a=await digest(serviceKey),b=await digest(bearer);let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  if(difference)return response({error:'Forbidden'},403);
  const password=Deno.env.get('ADMIN_PASSWORD'),origin=Deno.env.get('PUBLIC_ORIGIN');
  if(!password||!origin?.startsWith('https://'))return response({error:'Deployment configuration unavailable'},503);
  return response({admin_password_sha256:await digest(password),public_origin:origin});
});
