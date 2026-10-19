import {build as viteBuild} from 'vite';
import react from '@vitejs/plugin-react';
import {build as esbuild} from 'esbuild';
import path from 'node:path';
const meoo=process.argv.includes('--meoo');
const output=meoo?'dist-meoo':'dist-standalone';
await viteBuild({configFile:false,root:path.resolve('standalone'),publicDir:path.resolve('public'),plugins:[react()],build:{outDir:path.resolve(output,'client'),emptyOutDir:true}});
await esbuild({absWorkingDir:process.cwd(),entryPoints:[path.resolve('lib/server.ts')],outfile:output+'/server/handler.mjs',bundle:true,platform:'node',format:'esm',target:'node24',alias:{'cloudflare:workers':path.resolve(meoo?'server/meoo-env.ts':'server/runtime-env.ts')}});
console.log(meoo?'Meoo build complete; run mise run dev or mise run start.':'Standalone build complete; run node server/node.mjs with ADMIN_PASSWORD.');
