import fs from 'node:fs';

// Local credentials are ignored by Git and uploads. FC receives them at runtime.
for (const name of ['.env.meoo.admin', '.env.meoo.local', '.dev.vars', '.env']) {
  if (fs.existsSync(name)) process.loadEnvFile(name);
}
const preview = process.argv.includes('--preview');
const option = name => { const i=process.argv.indexOf(name); return i<0?undefined:process.argv[i+1]; };
process.env.PORT = option('--port') || (preview ? '3015' : '9000');
process.env.HOST = option('--host') || '0.0.0.0';
process.env.APP_BUNDLE_DIR = 'dist-meoo';
if (preview) {
  delete process.env.PUBLIC_ORIGIN;
  process.env.APP_PREVIEW = '1';
}
else process.env.MEOO_REQUIRE_SECURE_ORIGIN='1';
if (!fs.existsSync('dist-meoo/server/handler.mjs')) {
  throw new Error('Run mise run build before starting the Meoo preview or service');
}
await import('../server/node.mjs');
