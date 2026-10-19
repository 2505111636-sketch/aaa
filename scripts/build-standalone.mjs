import {build as viteBuild} from 'vite';
import react from '@vitejs/plugin-react';
import {build as esbuild} from 'esbuild';
import path from 'node:path';
await viteBuild({configFile:false,root:path.resolve('standalone'),publicDir:path.resolve('public'),plugins:[react()],build:{outDir:path.resolve('dist-standalone/client'),emptyOutDir:true}});
await esbuild({absWorkingDir:process.cwd(),entryPoints:[path.resolve('lib/server.ts')],outfile:'dist-standalone/server/handler.mjs',bundle:true,platform:'node',format:'esm',target:'node24',alias:{'cloudflare:workers':path.resolve('server/runtime-env.ts')}});
console.log('Standalone build complete; run node server/node.mjs with ADMIN_PASSWORD.');
