import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const filename=process.env.DATABASE_PATH||'data/route-rescue.sqlite';
fs.mkdirSync(path.dirname(filename),{recursive:true});
const sqlite=new DatabaseSync(filename);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied INTEGER NOT NULL)');
for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
 if(!sqlite.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name)){
  sqlite.exec('BEGIN IMMEDIATE');
  try{sqlite.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));sqlite.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(name,Date.now());sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}
 }
}
type Value=string|number|null;
class Statement {
 constructor(readonly sql:string,readonly args:Value[]=[]){ }
 bind(...args:Value[]){return new Statement(this.sql,args);}
 first(){return sqlite.prepare(this.sql).get(...this.args)||null;}
 all(){return {success:true,results:sqlite.prepare(this.sql).all(...this.args)};}
 run(){const r=sqlite.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(r.changes)}};}
}
const DB={prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>{
 sqlite.exec('BEGIN IMMEDIATE');
 try{const results=statements.map(s=>s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}
}};
export const env={DB:DB as unknown as D1Database,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD};
