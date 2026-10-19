CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`created` integer NOT NULL
);

CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`actor` text NOT NULL,
	`label` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`task`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `facilities` (
	`id` text PRIMARY KEY NOT NULL,
	`station` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`updated` integer NOT NULL
);

CREATE TABLE `login_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`until` integer NOT NULL
);

CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`expires` integer NOT NULL
);

CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`passenger` text NOT NULL,
	`location` text NOT NULL,
	`needs` text NOT NULL,
	`note` text NOT NULL,
	`plan` text NOT NULL,
	`origin` text NOT NULL,
	`target` text NOT NULL,
	`status` text NOT NULL,
	`assigned` text,
	`receiver` text,
	`escalated` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`last_event` text NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);

CREATE UNIQUE INDEX `one_active_task_per_passenger` ON `tasks` (`passenger`) WHERE "tasks"."archived"=0 AND "tasks"."status" NOT IN ('completed','cancelled');