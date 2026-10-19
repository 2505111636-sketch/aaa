import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const sessions = sqliteTable('sessions', { token: text('token').primaryKey(), account: text('account').notNull(), expires: integer('expires').notNull() });
export const facilities = sqliteTable('facilities', { id: text('id').primaryKey(), station: text('station').notNull(), name: text('name').notNull(), status: text('status').notNull(), updated: integer('updated').notNull() });
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), passenger: text('passenger').notNull(), location: text('location').notNull(), needs: text('needs').notNull(), note: text('note').notNull(), plan: text('plan').notNull(),
  origin: text('origin').notNull(), target: text('target').notNull(), status: text('status').notNull(), assigned: text('assigned'), receiver: text('receiver'),
  escalated: integer('escalated').notNull().default(0), archived: integer('archived').notNull().default(0), version: integer('version').notNull().default(1), lastEvent: text('last_event').notNull(), created: integer('created').notNull(), updated: integer('updated').notNull()
}, t => [uniqueIndex('one_active_task_per_passenger').on(t.passenger).where(sql`${t.archived}=0 AND ${t.status} NOT IN ('completed','cancelled')`)]);
export const events = sqliteTable('events', { id: text('id').primaryKey(), task: text('task').notNull().references(()=>tasks.id), actor: text('actor').notNull(), label: text('label').notNull(), created: integer('created').notNull() });
export const loginLimits = sqliteTable('login_limits', { key:text('key').primaryKey(), count:integer('count').notNull(), until:integer('until').notNull() });
export const audit = sqliteTable('audit', { id:text('id').primaryKey(), actor:text('actor').notNull(), action:text('action').notNull(), created:integer('created').notNull() });
