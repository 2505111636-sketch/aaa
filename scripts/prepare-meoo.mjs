import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Export only Git-tracked and non-ignored sources. The Meoo sandbox uploader
// does not honor .dockerignore and must never see local D1/SQLite or .dev.vars.
const root=process.cwd();
const destination=path.resolve(process.argv[2]||'../meoo-publish');
if(destination===root||destination.startsWith(root+path.sep)||fs.existsSync(destination)){
  throw new Error('Choose a new output directory outside the source checkout');
}
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
fs.mkdirSync(destination,{recursive:true});
for(const file of files){
  const source=path.join(root,file);
  if(!fs.statSync(source).isFile())throw new Error('Only ordinary source files may be exported');
  if(file.split(/[\\/]/).some(x=>x.startsWith('.dev.vars')||x.endsWith('.sqlite')||x.endsWith('.pem')||x==='.env'||(x.startsWith('.env.')&&x!=='.env.example')))throw new Error('Private source path refused');
  const target=path.join(destination,file);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
const project=fs.readFileSync('.env','utf8').match(/^MEOO_PROJECT_URL_ID=([A-Za-z0-9_-]+)$/m)?.[1];
if(!project)throw new Error('Bind the source checkout to a Meoo project first');
fs.writeFileSync(path.join(destination,'.env'),`MEOO_PROJECT_URL_ID=${project}\n`);
console.log(JSON.stringify({destination,files:files.length,project,privateDataExcluded:true}));
