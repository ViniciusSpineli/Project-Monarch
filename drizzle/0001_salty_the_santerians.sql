CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text,
	`rarity` enum('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`icon` varchar(32) NOT NULL DEFAULT 'Trophy',
	`unlockedAt` timestamp,
	`progress` int NOT NULL DEFAULT 0,
	`target` int NOT NULL DEFAULT 1,
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `achievements_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('mission','level','attribute','skill','achievement','focus','boss','journal') NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`xp` int NOT NULL DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attribute_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attributeKey` varchar(32) NOT NULL,
	`delta` int NOT NULL,
	`reason` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attribute_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(32) NOT NULL,
	`label` varchar(48) NOT NULL,
	`value` int NOT NULL DEFAULT 1,
	`progress` int NOT NULL DEFAULT 0,
	`color` varchar(16) NOT NULL,
	`icon` varchar(32) NOT NULL,
	CONSTRAINT `attributes_id` PRIMARY KEY(`id`),
	CONSTRAINT `attributes_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `bosses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`metric` enum('missions','focusMinutes','studyMinutes','workouts','cardioMinutes') NOT NULL,
	`target` int NOT NULL,
	`current` int NOT NULL DEFAULT 0,
	`unit` varchar(32) NOT NULL,
	`xpReward` int NOT NULL,
	`status` enum('active','defeated','expired') NOT NULL DEFAULT 'active',
	`weekKey` varchar(10) NOT NULL,
	`achievementCode` varchar(64) NOT NULL,
	`defeatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bosses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character` (
	`id` int NOT NULL DEFAULT 1,
	`name` varchar(80) NOT NULL DEFAULT 'Caçador',
	`level` int NOT NULL DEFAULT 7,
	`currentXp` int NOT NULL DEFAULT 420,
	`totalXp` int NOT NULL DEFAULT 2140,
	`title` varchar(80) NOT NULL DEFAULT 'Caçador Desperto',
	`rank` varchar(10) NOT NULL DEFAULT 'E',
	`streak` int NOT NULL DEFAULT 6,
	`longestStreak` int NOT NULL DEFAULT 11,
	`lastActiveDate` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `character_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`missions` int NOT NULL DEFAULT 0,
	`focusMinutes` int NOT NULL DEFAULT 0,
	`studyMinutes` int NOT NULL DEFAULT 0,
	`workouts` int NOT NULL DEFAULT 0,
	`cardioMinutes` int NOT NULL DEFAULT 0,
	CONSTRAINT `daily_activity_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_activity_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `focus_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skillSlug` varchar(48) NOT NULL,
	`plannedMinutes` int NOT NULL,
	`actualMinutes` int NOT NULL,
	`xpReward` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `focus_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`mood` enum('focused','proud','neutral','tired','challenged') NOT NULL DEFAULT 'neutral',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `missions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`type` enum('daily','weekly','monthly','unique','epic','challenge','secret') NOT NULL DEFAULT 'daily',
	`category` varchar(48) NOT NULL DEFAULT 'Disciplina',
	`xpReward` int NOT NULL DEFAULT 25,
	`durationMinutes` int NOT NULL DEFAULT 0,
	`skillSlug` varchar(48),
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('active','completed','expired') NOT NULL DEFAULT 'active',
	`dueDate` varchar(10) NOT NULL,
	`isSystem` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `missions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('level','skill','achievement','streak','title','mission','system') NOT NULL,
	`title` varchar(120) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(48) NOT NULL,
	`name` varchar(80) NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`xp` int NOT NULL DEFAULT 0,
	`totalMinutes` int NOT NULL DEFAULT 0,
	`rank` varchar(10) NOT NULL DEFAULT 'E',
	`icon` varchar(32) NOT NULL,
	`lastEvolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`),
	CONSTRAINT `skills_slug_unique` UNIQUE(`slug`)
);
