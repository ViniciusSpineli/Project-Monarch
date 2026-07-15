import Database from "better-sqlite3";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  achievements,
  activities,
  attributeHistory,
  attributes,
  bosses,
  character,
  dailyActivity,
  focusSessions,
  journalEntries,
  missions,
  notifications,
  skills,
  users,
  type InsertUser,
} from "../drizzle/schema";
import {
  applySkillXp,
  applyXp,
  canCompleteMission,
  duplicateMissionTitle,
  focusXp,
  getLocalDateKey,
  getWeekKey,
  progressBoss,
  selectDailyMissionTemplate,
  skillXpRequired,
  xpRequiredForLevel,
} from "../shared/progression";
import { OWNER_OPEN_ID } from "@shared/const";

let _db: ReturnType<typeof drizzle> | null = null;

// Local SQLite file. Zero-config: created on first boot, no external DB server.
// Override the location with DATABASE_URL if you want (plain file path).
const DB_PATH = resolve(process.env.DATABASE_URL || "data/ascension.db");
const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle/migrations");

export async function getDb() {
  if (!_db) {
    try {
      const dir = dirname(DB_PATH);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const sqlite = new Database(DB_PATH);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
      _db = drizzle(sqlite);

      // Auto-create/upgrade the schema on boot so the app just works.
      if (existsSync(MIGRATIONS_DIR)) {
        migrate(_db, { migrationsFolder: MIGRATIONS_DIR });
      }
    } catch (error) {
      console.warn("[Database] Failed to open SQLite:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === OWNER_OPEN_ID ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

// Atributos base: as 6 categorias existem para o app renderizar, mas começam no piso (valor 1, sem progresso).
const attributeSeeds = [
  { key: "strength", label: "Força", value: 1, progress: 0, color: "#22d3ee", icon: "Dumbbell" },
  { key: "intelligence", label: "Inteligência", value: 1, progress: 0, color: "#818cf8", icon: "BrainCircuit" },
  { key: "discipline", label: "Disciplina", value: 1, progress: 0, color: "#a78bfa", icon: "ShieldCheck" },
  { key: "vitality", label: "Vitalidade", value: 1, progress: 0, color: "#34d399", icon: "HeartPulse" },
  { key: "agility", label: "Agilidade", value: 1, progress: 0, color: "#f59e0b", icon: "Gauge" },
  { key: "charisma", label: "Carisma", value: 1, progress: 0, color: "#f472b6", icon: "Sparkles" },
];

// Conquistas nascem travadas (progress 0, unlockedAt null): são metas a desbloquear, não histórico.
const achievementSeeds = [
  { code: "first-mission", title: "Primeiro Chamado", description: "Conclua sua primeira missão.", rarity: "common" as const, icon: "Flag", progress: 0, target: 1, unlockedAt: null },
  { code: "level-five", title: "Despertar", description: "Alcance o nível 5.", rarity: "rare" as const, icon: "Zap", progress: 0, target: 1, unlockedAt: null },
  { code: "seven-streak", title: "Ritmo Implacável", description: "Mantenha uma sequência de 7 dias.", rarity: "epic" as const, icon: "Flame", progress: 0, target: 7, unlockedAt: null },
  { code: "boss-week", title: "Algoz do Caos", description: "Derrote um Boss Semanal.", rarity: "epic" as const, icon: "Swords", progress: 0, target: 1, unlockedAt: null },
];

function daysAgoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getLocalDateKey(date);
}

export async function ensureSeedData() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  if (!(await db.select({ id: character.id }).from(character).limit(1)).length) {
    // Caçador começa do zero: nível 1, sem XP e sem sequência. Preenchido conforme o uso real.
    await db.insert(character).values({
      id: 1,
      name: "Caçador",
      level: 1,
      currentXp: 0,
      totalXp: 0,
      title: "Caçador Desperto",
      rank: "E",
      streak: 0,
      longestStreak: 0,
      lastActiveDate: getLocalDateKey(),
    });
  }
  if (!(await db.select({ id: attributes.id }).from(attributes).limit(1)).length) {
    await db.insert(attributes).values(attributeSeeds);
  }
  if (!(await db.select({ id: achievements.id }).from(achievements).limit(1)).length) {
    await db.insert(achievements).values(achievementSeeds);
  }
  // Skills, histórico de atividade (heatmap) e timeline começam vazios — vão se preenchendo com o uso.
  await ensureDailySystemMission();
  await ensureWeeklyBoss();
  await touchStreak();
}

export async function ensureDailySystemMission() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const today = getLocalDateKey();
  const existing = await db.select().from(missions).where(and(eq(missions.dueDate, today), eq(missions.isSystem, true))).limit(1);
  if (existing.length) return existing[0];

  const pool = [
    { title: "Tríade Antes do Meio-dia", description: "Conclua três pequenas tarefas antes das 12h.", category: "Disciplina", xpReward: 90, skillSlug: "programming" },
    { title: "Corpo em Movimento", description: "Realize 30 minutos de atividade física hoje.", category: "Força", xpReward: 110, skillSlug: "training" },
    { title: "Mente Afiada", description: "Complete 45 minutos de estudo sem distrações.", category: "Inteligência", xpReward: 100, skillSlug: "programming" },
    { title: "Silêncio do Caçador", description: "Medite por 15 minutos e registre um aprendizado.", category: "Disciplina", xpReward: 75, skillSlug: "meditation" },
    { title: "Capítulo do Despertar", description: "Leia por 30 minutos e anote uma ideia útil.", category: "Inteligência", xpReward: 80, skillSlug: "reading" },
  ];
  const dailyMission = selectDailyMissionTemplate(today, pool);
  const result = await db.insert(missions).values({
    ...dailyMission,
    type: "challenge",
    priority: "high",
    dueDate: today,
    isSystem: true,
    durationMinutes: 30,
  }).returning({ id: missions.id });
  const created = (await db.select().from(missions).where(eq(missions.id, result[0].id)).limit(1))[0];
  await db.insert(notifications).values({ type: "mission", title: "NOVA MISSÃO DO SISTEMA", message: created.title });
  return created;
}

export async function ensureWeeklyBoss() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const weekKey = getWeekKey();
  const existing = await db.select().from(bosses).where(eq(bosses.weekKey, weekKey)).limit(1);
  if (existing.length) return existing[0];
  const result = await db.insert(bosses).values({
    title: "Guardião da Procrastinação",
    description: "Rompa o ciclo de adiamento completando sete missões nesta semana.",
    metric: "missions",
    target: 7,
    current: 0,
    unit: "missões",
    xpReward: 500,
    weekKey,
    achievementCode: "boss-week",
  }).returning({ id: bosses.id });
  return (await db.select().from(bosses).where(eq(bosses.id, result[0].id)).limit(1))[0];
}

async function touchStreak() {
  const db = await getDb();
  if (!db) return;
  const hero = (await db.select().from(character).where(eq(character.id, 1)).limit(1))[0];
  const today = getLocalDateKey();
  if (!hero || hero.lastActiveDate === today) return;
  const yesterday = daysAgoDate(1);
  const nextStreak = hero.lastActiveDate === yesterday ? hero.streak + 1 : 1;
  await db.update(character).set({ streak: nextStreak, longestStreak: Math.max(hero.longestStreak, nextStreak), lastActiveDate: today }).where(eq(character.id, 1));
  if (nextStreak > hero.streak) {
    await db.insert(notifications).values({ type: "streak", title: "SEQUÊNCIA AMPLIADA", message: `${nextStreak} dias de evolução contínua.` });
  }
}

export async function getDashboardData() {
  await ensureSeedData();
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const hero = (await db.select().from(character).where(eq(character.id, 1)).limit(1))[0];
  const today = getLocalDateKey();
  const [attributeRows, skillRows, missionRows, achievementRows, activityRows, heatmapRows, notificationRows, bossRows] = await Promise.all([
    db.select().from(attributes).orderBy(desc(attributes.value)),
    db.select().from(skills).orderBy(desc(skills.level)),
    db.select().from(missions).where(eq(missions.dueDate, today)).orderBy(desc(missions.isSystem), desc(missions.priority)),
    db.select().from(achievements).where(sql`${achievements.unlockedAt} IS NOT NULL`).orderBy(desc(achievements.unlockedAt)).limit(4),
    db.select().from(activities).orderBy(desc(activities.createdAt)).limit(8),
    db.select().from(dailyActivity).orderBy(asc(dailyActivity.date)).limit(84),
    db.select().from(notifications).where(eq(notifications.isRead, false)).orderBy(desc(notifications.createdAt)).limit(8),
    db.select().from(bosses).where(eq(bosses.weekKey, getWeekKey())).limit(1),
  ]);
  return {
    character: { ...hero, xpForNextLevel: xpRequiredForLevel(hero.level) },
    attributes: attributeRows,
    skills: skillRows.map(skill => ({ ...skill, xpForNextLevel: skillXpRequired(skill.level) })),
    missions: missionRows,
    achievements: achievementRows,
    activities: activityRows,
    heatmap: heatmapRows,
    notifications: notificationRows,
    boss: bossRows[0] ?? null,
  };
}

const categoryToAttribute: Record<string, string[]> = {
  Força: ["strength", "vitality"],
  Inteligência: ["intelligence", "discipline"],
  Disciplina: ["discipline", "vitality"],
  Vitalidade: ["vitality", "agility"],
  Carisma: ["charisma", "discipline"],
};

async function grantXp(xpReward: number, reason: string, skillSlug?: string | null, durationMinutes = 0) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const hero = (await db.select().from(character).where(eq(character.id, 1)).limit(1))[0];
  const progression = applyXp(hero, xpReward);
  await db.update(character).set({
    level: progression.level,
    currentXp: progression.currentXp,
    totalXp: progression.totalXp,
    title: progression.title,
    rank: progression.rank,
  }).where(eq(character.id, 1));

  for (const [key, delta] of Object.entries(progression.attributeGains)) {
    await db.update(attributes).set({ value: sql`${attributes.value} + ${delta}` }).where(eq(attributes.key, key));
    await db.insert(attributeHistory).values({ attributeKey: key, delta, reason });
  }

  let skillLevelUp = null as null | { name: string; level: number };
  if (skillSlug) {
    const skill = (await db.select().from(skills).where(eq(skills.slug, skillSlug)).limit(1))[0];
    if (skill) {
      const result = applySkillXp(skill.level, skill.xp, Math.max(10, Math.round(xpReward * 0.65)));
      await db.update(skills).set({ level: result.level, xp: result.xp, totalMinutes: skill.totalMinutes + durationMinutes, lastEvolvedAt: new Date() }).where(eq(skills.id, skill.id));
      if (result.levelsGained > 0) {
        skillLevelUp = { name: skill.name, level: result.level };
        await db.insert(notifications).values({ type: "skill", title: "SKILL EVOLUÍDA", message: `${skill.name} alcançou o nível ${result.level}.` });
      }
    }
  }

  if (progression.levelsGained > 0) {
    await db.insert(activities).values({ type: "level", title: `Nível ${progression.level} alcançado`, description: reason, metadata: progression.attributeGains });
    await db.insert(notifications).values({ type: "level", title: "LEVEL UP", message: `O Sistema elevou você ao nível ${progression.level}.` });
    if (progression.title !== hero.title) {
      await db.insert(notifications).values({ type: "title", title: "NOVO TÍTULO", message: progression.title });
    }
  }
  return { progression, skillLevelUp };
}

export async function listMissions() {
  await ensureSeedData();
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(missions).orderBy(asc(missions.status), desc(missions.isSystem), desc(missions.createdAt));
}

export type MissionInput = {
  title: string;
  description?: string;
  type: "daily" | "weekly" | "monthly" | "unique" | "epic" | "challenge" | "secret";
  category: string;
  xpReward: number;
  durationMinutes: number;
  skillSlug?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
};

export async function createMission(input: MissionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(missions).values({ ...input, description: input.description ?? null, skillSlug: input.skillSlug ?? null }).returning({ id: missions.id });
  await db.insert(notifications).values({ type: "mission", title: "NOVA MISSÃO", message: input.title });
  return (await db.select().from(missions).where(eq(missions.id, result[0].id)).limit(1))[0];
}

export async function updateMission(id: number, input: Partial<MissionInput>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(missions).set(input).where(eq(missions.id, id));
  return (await db.select().from(missions).where(eq(missions.id, id)).limit(1))[0];
}

export async function deleteMission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(missions).where(eq(missions.id, id));
  return { success: true };
}

export async function duplicateMission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const source = (await db.select().from(missions).where(eq(missions.id, id)).limit(1))[0];
  if (!source) throw new Error("Missão não encontrada");
  return createMission({
    title: duplicateMissionTitle(source.title), description: source.description ?? undefined, type: source.type,
    category: source.category, xpReward: source.xpReward, durationMinutes: source.durationMinutes,
    skillSlug: source.skillSlug, priority: source.priority, dueDate: source.dueDate,
  });
}

export async function completeMission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const mission = (await db.select().from(missions).where(eq(missions.id, id)).limit(1))[0];
  if (!mission) throw new Error("Missão não encontrada");
  if (!canCompleteMission(mission.status)) throw new Error("Missão já concluída ou arquivada");

  await db.update(missions).set({ status: "completed", completedAt: new Date() }).where(eq(missions.id, id));
  const reward = await grantXp(mission.xpReward, `Missão concluída: ${mission.title}`, mission.skillSlug, mission.durationMinutes);
  for (const key of categoryToAttribute[mission.category] ?? ["discipline"]) {
    await db.update(attributes).set({ progress: sql`MIN(99, ${attributes.progress} + 3)` }).where(eq(attributes.key, key));
  }
  const today = getLocalDateKey();
  await db.insert(dailyActivity).values({ date: today, xp: mission.xpReward, missions: 1, studyMinutes: mission.category === "Inteligência" ? mission.durationMinutes : 0, workouts: mission.category === "Força" ? 1 : 0, cardioMinutes: mission.category === "Vitalidade" ? mission.durationMinutes : 0 }).onConflictDoUpdate({ target: dailyActivity.date, set: { xp: sql`${dailyActivity.xp} + ${mission.xpReward}`, missions: sql`${dailyActivity.missions} + 1`, studyMinutes: sql`${dailyActivity.studyMinutes} + ${mission.category === "Inteligência" ? mission.durationMinutes : 0}`, workouts: sql`${dailyActivity.workouts} + ${mission.category === "Força" ? 1 : 0}`, cardioMinutes: sql`${dailyActivity.cardioMinutes} + ${mission.category === "Vitalidade" ? mission.durationMinutes : 0}` } });
  await db.insert(activities).values({ type: "mission", title: mission.title, description: "Missão concluída. O Sistema registrou sua evolução.", xp: mission.xpReward });

  const boss = (await db.select().from(bosses).where(and(eq(bosses.weekKey, getWeekKey()), eq(bosses.status, "active"))).limit(1))[0];
  let bossDefeated = null as null | { title: string; xpReward: number };
  if (boss && boss.metric === "missions") {
    const bossProgress = progressBoss(boss.current, boss.target);
    await db.update(bosses).set({ current: bossProgress.current }).where(eq(bosses.id, boss.id));
    if (bossProgress.defeated) {
      await db.update(bosses).set({ status: "defeated", defeatedAt: new Date() }).where(eq(bosses.id, boss.id));
      await grantXp(boss.xpReward, `Boss derrotado: ${boss.title}`);
      await db.update(achievements).set({ progress: 1, unlockedAt: new Date() }).where(eq(achievements.code, boss.achievementCode));
      await db.insert(notifications).values({ type: "achievement", title: "BOSS DERROTADO", message: `${boss.title}: +${boss.xpReward} XP.` });
      await db.insert(activities).values({ type: "boss", title: `Boss derrotado: ${boss.title}`, xp: boss.xpReward });
      bossDefeated = { title: boss.title, xpReward: boss.xpReward };
    }
  }
  return { mission, ...reward, bossDefeated };
}

export async function completeFocusSession(skillSlug: string, minutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const xpReward = focusXp(minutes);
  await db.insert(focusSessions).values({ skillSlug, plannedMinutes: minutes, actualMinutes: minutes, xpReward });
  const reward = await grantXp(xpReward, `Sessão de foco de ${minutes} minutos`, skillSlug, minutes);
  const today = getLocalDateKey();
  await db.insert(dailyActivity).values({ date: today, xp: xpReward, focusMinutes: minutes, studyMinutes: minutes }).onConflictDoUpdate({ target: dailyActivity.date, set: { xp: sql`${dailyActivity.xp} + ${xpReward}`, focusMinutes: sql`${dailyActivity.focusMinutes} + ${minutes}`, studyMinutes: sql`${dailyActivity.studyMinutes} + ${minutes}` } });
  await db.insert(activities).values({ type: "focus", title: `Foco concluído: ${minutes} min`, description: "Concentração convertida em poder.", xp: xpReward });
  return { xpReward, ...reward };
}

export async function getStatistics() {
  await ensureSeedData();
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const since = daysAgoDate(83);
  const [days, attributeRows, skillRows, completed, focusRows] = await Promise.all([
    db.select().from(dailyActivity).where(gte(dailyActivity.date, since)).orderBy(asc(dailyActivity.date)),
    db.select().from(attributes).orderBy(desc(attributes.value)),
    db.select().from(skills).orderBy(desc(skills.level)),
    db.select().from(missions).where(eq(missions.status, "completed")),
    db.select().from(focusSessions).orderBy(desc(focusSessions.completedAt)).limit(30),
  ]);
  return { days, attributes: attributeRows, skills: skillRows, completedMissions: completed.length, focusSessions: focusRows };
}

export async function getEvolution() {
  await ensureSeedData();
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [timeline, entries, history, achievementRows] = await Promise.all([
    db.select().from(activities).orderBy(desc(activities.createdAt)).limit(50),
    db.select().from(journalEntries).orderBy(desc(journalEntries.date), desc(journalEntries.createdAt)),
    db.select().from(attributeHistory).orderBy(desc(attributeHistory.createdAt)).limit(50),
    db.select().from(achievements).orderBy(desc(achievements.unlockedAt)),
  ]);
  return { timeline, entries, attributeHistory: history, achievements: achievementRows };
}

export async function createJournalEntry(input: { date: string; title: string; content: string; mood: "focused" | "proud" | "neutral" | "tired" | "challenged" }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(journalEntries).values(input).returning({ id: journalEntries.id });
  await db.insert(activities).values({ type: "journal", title: `Registro: ${input.title}`, description: "Reflexão adicionada ao Diário de Evolução." });
  return (await db.select().from(journalEntries).where(eq(journalEntries.id, result[0].id)).limit(1))[0];
}

export async function markNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
  return { success: true };
}
