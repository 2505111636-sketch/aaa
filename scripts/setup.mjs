import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
if (fs.existsSync('.env')) {
  console.log('.env already exists; current settings were preserved.');
} else {
  const password = randomBytes(24).toString('base64url');
  fs.writeFileSync(
    '.env',
    `DATABASE_DRIVER=sqlite\nDATABASE_PATH=data/route-rescue.sqlite\nADMIN_PASSWORD=${password}\nPORT=3000\nHOST=0.0.0.0\n`,
    { mode: 0o600 },
  );
  console.log('Created private .env. Application experience accounts are ready.');
}
