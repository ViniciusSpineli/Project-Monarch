import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const character = mysqlTable("character", {
  id: int("id").primaryKey().default(1),
  name: varchar("name", { length: 80 }).default("Caçador").notNull(),
  level: int("level").default(7).notNull(),
  currentXp: int("currentXp").default(420).notNull(),
  totalXp: int("totalXp").default(2140).notNull(),
  title: varchar("title", { length: 80 }).default("Caçador Desperto").notNull(),
  rank: varchar("rank", { length: 10 }).default("E").notNull(),
  streak: int("streak").default(6).notNull(),
  longestStreak: int("longestStreak").default(11).notNull(),
  lastActiveDate: varchar("lastActiveDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const attributes = mysqlTable("attributes", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 32 }).notNull(),
  label: varchar("label", { length: 48 }).notNull(),
  value: int("value").default(1).notNull(),
  progress: int("progress").default(0).notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  icon: varchar("icon", { length: 32 }).notNull(),
}, table => ({ keyUnique: uniqueIndex("attributes_key_unique").on(table.key) }));

export const attributeHistory = mysqlTable("attribute_history", {
  id: int("id").autoincrement().primaryKey(),
  attributeKey: varchar("attributeKey", { length: 32 }).notNull(),
  delta: int("delta").notNull(),
  reason: varchar("reason", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 48 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  level: int("level").default(1).notNull(),
  xp: int("xp").default(0).notNull(),
  totalMinutes: int("totalMinutes").default(0).notNull(),
  rank: varchar("rank", { length: 10 }).default("E").notNull(),
  icon: varchar("icon", { length: 32 }).notNull(),
  lastEvolvedAt: timestamp("lastEvolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ slugUnique: uniqueIndex("skills_slug_unique").on(table.slug) }));

export const missions = mysqlTable("missions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["daily", "weekly", "monthly", "unique", "epic", "challenge", "secret"]).default("daily").notNull(),
  category: varchar("category", { length: 48 }).default("Disciplina").notNull(),
  xpReward: int("xpReward").default(25).notNull(),
  durationMinutes: int("durationMinutes").default(0).notNull(),
  skillSlug: varchar("skillSlug", { length: 48 }),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("status", ["active", "completed", "expired"]).default("active").notNull(),
  dueDate: varchar("dueDate", { length: 10 }).notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).default("common").notNull(),
  icon: varchar("icon", { length: 32 }).default("Trophy").notNull(),
  unlockedAt: timestamp("unlockedAt"),
  progress: int("progress").default(0).notNull(),
  target: int("target").default(1).notNull(),
}, table => ({ codeUnique: uniqueIndex("achievements_code_unique").on(table.code) }));

export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["mission", "level", "attribute", "skill", "achievement", "focus", "boss", "journal"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  xp: int("xp").default(0).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const dailyActivity = mysqlTable("daily_activity", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  xp: int("xp").default(0).notNull(),
  missions: int("missions").default(0).notNull(),
  focusMinutes: int("focusMinutes").default(0).notNull(),
  studyMinutes: int("studyMinutes").default(0).notNull(),
  workouts: int("workouts").default(0).notNull(),
  cardioMinutes: int("cardioMinutes").default(0).notNull(),
}, table => ({ dateUnique: uniqueIndex("daily_activity_date_unique").on(table.date) }));

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["level", "skill", "achievement", "streak", "title", "mission", "system"]).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const focusSessions = mysqlTable("focus_sessions", {
  id: int("id").autoincrement().primaryKey(),
  skillSlug: varchar("skillSlug", { length: 48 }).notNull(),
  plannedMinutes: int("plannedMinutes").notNull(),
  actualMinutes: int("actualMinutes").notNull(),
  xpReward: int("xpReward").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export const bosses = mysqlTable("bosses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  metric: mysqlEnum("metric", ["missions", "focusMinutes", "studyMinutes", "workouts", "cardioMinutes"]).notNull(),
  target: int("target").notNull(),
  current: int("current").default(0).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(),
  xpReward: int("xpReward").notNull(),
  status: mysqlEnum("status", ["active", "defeated", "expired"]).default("active").notNull(),
  weekKey: varchar("weekKey", { length: 10 }).notNull(),
  achievementCode: varchar("achievementCode", { length: 64 }).notNull(),
  defeatedAt: timestamp("defeatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: text("content").notNull(),
  mood: mysqlEnum("mood", ["focused", "proud", "neutral", "tired", "challenged"]).default("neutral").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Mission = typeof missions.$inferSelect;
export type Character = typeof character.$inferSelect;
