import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

const updatedAt = () =>
  integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date());

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .default("pending")
    .notNull(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const character = sqliteTable("character", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  name: text("name").default("Caçador").notNull(),
  level: integer("level").default(1).notNull(),
  currentXp: integer("currentXp").default(0).notNull(),
  totalXp: integer("totalXp").default(0).notNull(),
  title: text("title").default("Caçador Desperto").notNull(),
  rank: text("rank").default("E").notNull(),
  streak: integer("streak").default(0).notNull(),
  longestStreak: integer("longestStreak").default(0).notNull(),
  lastActiveDate: text("lastActiveDate"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const attributes = sqliteTable("attributes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  value: integer("value").default(1).notNull(),
  progress: integer("progress").default(0).notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
}, table => ({ keyUnique: uniqueIndex("attributes_user_key_unique").on(table.userId, table.key) }));

export const attributeHistory = sqliteTable("attribute_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  attributeKey: text("attributeKey").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: createdAt(),
});

export const skills = sqliteTable("skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  totalMinutes: integer("totalMinutes").default(0).notNull(),
  rank: text("rank").default("E").notNull(),
  icon: text("icon").notNull(),
  lastEvolvedAt: integer("lastEvolvedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
}, table => ({ slugUnique: uniqueIndex("skills_user_slug_unique").on(table.userId, table.slug) }));

export const missions = sqliteTable("missions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["daily", "weekly", "monthly", "unique", "epic", "challenge", "secret"] }).default("daily").notNull(),
  category: text("category").default("Disciplina").notNull(),
  xpReward: integer("xpReward").default(25).notNull(),
  durationMinutes: integer("durationMinutes").default(0).notNull(),
  skillSlug: text("skillSlug"),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).default("medium").notNull(),
  status: text("status", { enum: ["active", "completed", "expired"] }).default("active").notNull(),
  dueDate: text("dueDate").notNull(),
  isSystem: integer("isSystem", { mode: "boolean" }).default(false).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  rarity: text("rarity", { enum: ["common", "rare", "epic", "legendary"] }).default("common").notNull(),
  icon: text("icon").default("Trophy").notNull(),
  unlockedAt: integer("unlockedAt", { mode: "timestamp" }),
  progress: integer("progress").default(0).notNull(),
  target: integer("target").default(1).notNull(),
}, table => ({ codeUnique: uniqueIndex("achievements_user_code_unique").on(table.userId, table.code) }));

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  type: text("type", { enum: ["mission", "level", "attribute", "skill", "achievement", "focus", "boss", "journal"] }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  xp: integer("xp").default(0).notNull(),
  metadata: text("metadata", { mode: "json" }),
  createdAt: createdAt(),
});

export const dailyActivity = sqliteTable("daily_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: text("date").notNull(),
  xp: integer("xp").default(0).notNull(),
  missions: integer("missions").default(0).notNull(),
  focusMinutes: integer("focusMinutes").default(0).notNull(),
  studyMinutes: integer("studyMinutes").default(0).notNull(),
  workouts: integer("workouts").default(0).notNull(),
  cardioMinutes: integer("cardioMinutes").default(0).notNull(),
}, table => ({ dateUnique: uniqueIndex("daily_activity_user_date_unique").on(table.userId, table.date) }));

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  type: text("type", { enum: ["level", "skill", "achievement", "streak", "title", "mission", "system"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("isRead", { mode: "boolean" }).default(false).notNull(),
  createdAt: createdAt(),
});

export const focusSessions = sqliteTable("focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  skillSlug: text("skillSlug").notNull(),
  plannedMinutes: integer("plannedMinutes").notNull(),
  actualMinutes: integer("actualMinutes").notNull(),
  xpReward: integer("xpReward").notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const bosses = sqliteTable("bosses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metric: text("metric", { enum: ["missions", "focusMinutes", "studyMinutes", "workouts", "cardioMinutes"] }).notNull(),
  target: integer("target").notNull(),
  current: integer("current").default(0).notNull(),
  unit: text("unit").notNull(),
  xpReward: integer("xpReward").notNull(),
  status: text("status", { enum: ["active", "defeated", "expired"] }).default("active").notNull(),
  weekKey: text("weekKey").notNull(),
  achievementCode: text("achievementCode").notNull(),
  defeatedAt: integer("defeatedAt", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  mood: text("mood", { enum: ["focused", "proud", "neutral", "tired", "challenged"] }).default("neutral").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Mission = typeof missions.$inferSelect;
export type Character = typeof character.$inferSelect;
