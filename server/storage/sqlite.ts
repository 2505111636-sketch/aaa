import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Database, Result, Statement, Value } from './types';

export function createLocalDatabase(filename: string): Database {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied INTEGER NOT NULL)',
  );
  for (const name of fs
    .readdirSync('database')
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (sqlite.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name)) continue;
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(fs.readFileSync(path.join('database', name), 'utf8'));
      sqlite.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(name, Date.now());
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  class Query implements Statement {
    constructor(
      readonly sql: string,
      readonly args: Value[] = [],
    ) {}
    bind(...args: Value[]) {
      return new Query(this.sql, args);
    }
    first<T>() {
      return (sqlite.prepare(this.sql).get(...this.args) || null) as T | null;
    }
    all<T = Record<string, unknown>>(): Result<T> {
      return {
        success: true,
        results: sqlite.prepare(this.sql).all(...this.args) as T[],
        meta: { changes: 0 },
      };
    }
    run(): Result {
      const result = sqlite.prepare(this.sql).run(...this.args);
      return { success: true, results: [], meta: { changes: Number(result.changes) } };
    }
  }
  return {
    prepare: (sql) => new Query(sql),
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map((statement) => {
          const query = new Query(statement.sql, statement.args);
          return /^SELECT\b/i.test(query.sql) ? query.all() : query.run();
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
