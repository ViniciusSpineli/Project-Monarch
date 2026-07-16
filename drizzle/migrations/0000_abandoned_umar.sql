CREATE TABLE `achievements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`rarity` text DEFAULT 'common' NOT NULL,
	`icon` text DEFAULT 'Trophy' NOT NULL,
	`unlockedAt` integer,
	`progress` integer DEFAULT 0 NOT NULL,
	`target` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_user_code_unique` ON `achievements` (`userId`,`code`);--> statement-breakpoint
CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`xp` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attribute_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`attributeKey` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attributes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`value` integer DEFAULT 1 NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`color` text NOT NULL,
	`icon` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attributes_user_key_unique` ON `attributes` (`userId`,`key`);--> statement-breakpoint
CREATE TABLE `bosses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`metric` text NOT NULL,
	`target` integer NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`xpReward` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`weekKey` text NOT NULL,
	`achievementCode` text NOT NULL,
	`defeatedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `character` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`name` text DEFAULT 'Caçador' NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`currentXp` integer DEFAULT 0 NOT NULL,
	`totalXp` integer DEFAULT 0 NOT NULL,
	`title` text DEFAULT 'Caçador Desperto' NOT NULL,
	`rank` text DEFAULT 'E' NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`longestStreak` integer DEFAULT 0 NOT NULL,
	`lastActiveDate` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_userId_unique` ON `character` (`userId`);--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`missions` integer DEFAULT 0 NOT NULL,
	`focusMinutes` integer DEFAULT 0 NOT NULL,
	`studyMinutes` integer DEFAULT 0 NOT NULL,
	`workouts` integer DEFAULT 0 NOT NULL,
	`cardioMinutes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_activity_user_date_unique` ON `daily_activity` (`userId`,`date`);--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`skillSlug` text NOT NULL,
	`plannedMinutes` integer NOT NULL,
	`actualMinutes` integer NOT NULL,
	`xpReward` integer NOT NULL,
	`completedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`mood` text DEFAULT 'neutral' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'daily' NOT NULL,
	`category` text DEFAULT 'Disciplina' NOT NULL,
	`xpReward` integer DEFAULT 25 NOT NULL,
	`durationMinutes` integer DEFAULT 0 NOT NULL,
	`skillSlug` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`dueDate` text NOT NULL,
	`isSystem` integer DEFAULT false NOT NULL,
	`completedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`isRead` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`totalMinutes` integer DEFAULT 0 NOT NULL,
	`rank` text DEFAULT 'E' NOT NULL,
	`icon` text NOT NULL,
	`lastEvolvedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_user_slug_unique` ON `skills` (`userId`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`username` text NOT NULL,
	`passwordHash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`approvedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);