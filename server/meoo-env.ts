import {createCloudDatabase} from './supabase-db';
import deployment from '../meoo.config.json';
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
const url=process.env.ROUTE_RESCUE_DB_URL||deployment.databaseUrl;
const project=process.env.MEOO_PROJECT_URL_ID||deployment.projectId;
const DB=createCloudDatabase({url,serviceKey,project});
// Bootstrap comes from the authorized runtime Secret store, never a password
// file in the published image or an administrator verifier in the database.
if(!process.env.ADMIN_PASSWORD || (process.env.APP_PREVIEW!=='1'&&!process.env.PUBLIC_ORIGIN)){
  const response=await fetch(url+'/functions/v1/rescue-config',{method:'POST',headers:{apikey:serviceKey!,Authorization:'Bearer '+serviceKey,'OneDay-App-Id':project},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Meoo runtime configuration unavailable ('+response.status+')');
  const configuration=await response.json() as {admin_password_sha256:string;public_origin:string};
  if(!/^[a-f0-9]{64}$/.test(configuration.admin_password_sha256)||!configuration.public_origin?.startsWith('https://'))throw new Error('Invalid Meoo runtime configuration');
  if(!process.env.ADMIN_PASSWORD)process.env.ADMIN_PASSWORD_HASH=configuration.admin_password_sha256;
  if(process.env.APP_PREVIEW!=='1'&&!process.env.PUBLIC_ORIGIN)process.env.PUBLIC_ORIGIN=configuration.public_origin;
}
export const env={DB:DB as unknown as D1Database,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD,ADMIN_PASSWORD_HASH:process.env.ADMIN_PASSWORD_HASH};
