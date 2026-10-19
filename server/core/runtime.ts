import fs from 'node:fs';
import { createCloudDatabase } from '../storage/postgres';
import { createLocalDatabase } from '../storage/sqlite';
import type { Database } from '../storage/types';

if (fs.existsSync('.env')) process.loadEnvFile('.env');
const driver = process.env.DATABASE_DRIVER || 'sqlite';
if (!['sqlite', 'postgres'].includes(driver))
  throw new Error('DATABASE_DRIVER must be sqlite or postgres');
if (!process.env.ADMIN_PASSWORD && !/^[a-f0-9]{64}$/.test(process.env.ADMIN_PASSWORD_HASH || '')) {
  throw new Error('Run npm run setup first, or configure a private ADMIN_PASSWORD.');
}
const DB: Database =
  driver === 'postgres'
    ? (createCloudDatabase({
        url: process.env.ROUTE_RESCUE_DB_URL,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        project: process.env.MEOO_PROJECT_URL_ID,
      }) as Database)
    : createLocalDatabase(process.env.DATABASE_PATH || 'data/route-rescue.sqlite');
export const env = {
  DB,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
};
