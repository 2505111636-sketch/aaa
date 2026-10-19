import {handle} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{kind:string}>}){const {kind}=await params;if(kind!=='state')return Response.json({error:'请求方法不支持'},{status:405});return handle(req,kind);}
export async function POST(req:Request,{params}:{params:Promise<{kind:string}>}){const {kind}=await params;if(!['login','logout','tasks','action','admin'].includes(kind))return Response.json({error:'接口不存在'},{status:404});return handle(req,kind);}
