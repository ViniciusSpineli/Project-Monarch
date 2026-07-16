import Database from "better-sqlite3";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { nanoid } from "nanoid";
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
  rankForLevel,
  selectDailyMissionTemplate,
  skillXpRequired,
  titleForLevel,
  xpRequiredForLevel,
} from "../shared/progression";
import { ENV } from "./_core/env";
import { hashPassword } from "./_core/password";

let _db: ReturnType<typeof drizzle> | null = null;

// Local SQLite file. Zero-config: created on first boot, no external DB server.
// Override the location with DATABASE_URL if you want (plain file path).
const DB_PATH = resolve(process.env.DATABASE_URL || "data/ascension.db");
const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle/migrations");

// O dono do sistema. Nasce como admin aprovado e é o único a receber a rotina
// diária pessoal (as demais contas começam com o quadro próprio vazio).
const ADMIN_USERNAME = "vinicius.spineli";

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

      // Cria o admin (vinicius.spineli) uma única vez, no primeiro boot.
      try {
        await ensureAdminUser();
      } catch (error) {
        console.warn("[Database] admin bootstrap failed:", error);
      }
    } catch (error) {
      console.warn("[Database] Failed to open SQLite:", error);
      _db = null;
    }
  }
  return _db;
}

/* ==========================================================================
 * Usuários / autenticação
 * ========================================================================== */

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.username, username)).limit(1))[0];
}

export async function touchUserSignIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

type NewUser = {
  username: string;
  passwordHash: string;
  name?: string | null;
  role?: "user" | "admin";
  status?: "pending" | "approved" | "rejected";
};

export async function createUser(input: NewUser) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const status = input.status ?? "pending";
  const result = await db.insert(users).values({
    openId: `usr_${nanoid()}`,
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name ?? input.username,
    role: input.role ?? "user",
    status,
    loginMethod: "local",
    approvedAt: status === "approved" ? new Date() : null,
    lastSignedIn: new Date(),
  }).returning({ id: users.id });
  return (await db.select().from(users).where(eq(users.id, result[0].id)).limit(1))[0];
}

export async function setUserStatus(userId: number, status: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users)
    .set({ status, approvedAt: status === "approved" ? new Date() : null })
    .where(eq(users.id, userId));
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function listUsersByStatus(status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.status, status)).orderBy(desc(users.createdAt));
}

export async function listAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin"));
}

/** Cria o dono (vinicius.spineli) como admin aprovado e já semeia os dados dele. */
export async function ensureAdminUser() {
  const existing = await getUserByUsername(ADMIN_USERNAME);
  if (existing) return existing;
  const password = ENV.appPassword || "6971";
  const admin = await createUser({
    username: ADMIN_USERNAME,
    passwordHash: hashPassword(password),
    name: ENV.ownerName || ADMIN_USERNAME,
    role: "admin",
    status: "approved",
  });
  await ensureSeedData(admin.id);
  return admin;
}

/* ==========================================================================
 * Seeds do jogo (por usuário)
 * ========================================================================== */

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

// Rotina diária do operador: missões que "O Sistema" reemite todo dia (dueDate = hoje).
// weekdays segue getDay() do JS: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb. Ausente = todos os dias.
type DailyRoutineTemplate = {
  title: string;
  category: string;
  xpReward: number;
  durationMinutes: number;
  priority: "low" | "medium" | "high" | "critical";
  weekdays?: number[];
};

const dailyRoutineTemplates: DailyRoutineTemplate[] = [
  { title: "Missão do resgate a cada 20 min", category: "Disciplina", xpReward: 30, durationMinutes: 20, priority: "medium" },
  { title: "120 min de vídeo normal", category: "Inteligência", xpReward: 60, durationMinutes: 120, priority: "medium" },
  { title: "60 min de vídeo de drama", category: "Inteligência", xpReward: 40, durationMinutes: 60, priority: "medium" },
  { title: "30 anúncios 15 sec", category: "Disciplina", xpReward: 25, durationMinutes: 8, priority: "low" },
  { title: "1000 Likes comentários “Bora monetizar”", category: "Carisma", xpReward: 50, durationMinutes: 30, priority: "medium" },
  { title: "10 min ou até acabar a energia duolingo", category: "Inteligência", xpReward: 40, durationMinutes: 10, priority: "medium" },
  { title: "1 hora de bike", category: "Vitalidade", xpReward: 80, durationMinutes: 60, priority: "high" },
  { title: "5 páginas de um livro", category: "Inteligência", xpReward: 40, durationMinutes: 20, priority: "medium" },
  { title: "4.5 L de água no dia", category: "Vitalidade", xpReward: 30, durationMinutes: 0, priority: "high" },
  { title: "Procurar e mandar algo romântico pra Steffany", category: "Carisma", xpReward: 40, durationMinutes: 10, priority: "medium" },
  { title: "Dar um abraço e um beijo na dona Rose", category: "Carisma", xpReward: 30, durationMinutes: 5, priority: "medium" },
  { title: "Arrumar a cama e o quarto", category: "Disciplina", xpReward: 30, durationMinutes: 15, priority: "medium" },
  { title: "Calistenia", category: "Força", xpReward: 90, durationMinutes: 30, priority: "high", weekdays: [1, 3, 5] },
  { title: "Musculação", category: "Força", xpReward: 90, durationMinutes: 45, priority: "high" },
];

function daysAgoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getLocalDateKey(date);
}

export async function ensureSeedData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");

  if (!(await db.select({ id: character.id }).from(character).where(eq(character.userId, userId)).limit(1)).length) {
    // Caçador começa do zero: nível 1, sem XP e sem sequência. Preenchido conforme o uso real.
    await db.insert(character).values({
      userId,
      name: "Caçador",
      level: 1,
      currentXp: 0,
      totalXp: 0,
      // Título/rank vêm das funções oficiais de progressão para nunca divergirem do XP.
      title: titleForLevel(1),
      rank: rankForLevel(1),
      streak: 0,
      longestStreak: 0,
      lastActiveDate: getLocalDateKey(),
    });
  }
  if (!(await db.select({ id: attributes.id }).from(attributes).where(eq(attributes.userId, userId)).limit(1)).length) {
    await db.insert(attributes).values(attributeSeeds.map(item => ({ ...item, userId })));
  }
  if (!(await db.select({ id: achievements.id }).from(achievements).where(eq(achievements.userId, userId)).limit(1)).length) {
    await db.insert(achievements).values(achievementSeeds.map(item => ({ ...item, userId })));
  }
  // Skills, histórico de atividade (heatmap) e timeline começam vazios — vão se preenchendo com o uso.
  await ensureDailySystemMission(userId);
  await ensureDailyRoutineMissions(userId);
  await ensureWeeklyBoss(userId);
  await touchStreak(userId);
}

export async function ensureDailySystemMission(userId: number, dateKey = getLocalDateKey()) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.dueDate, dateKey), eq(missions.isSystem, true))).limit(1);
  if (existing.length) return existing[0];

  const pool = [
    { title: "Tríade Antes do Meio-dia", description: "Conclua três pequenas tarefas antes das 12h.", category: "Disciplina", xpReward: 90, skillSlug: "programming" },
    { title: "Corpo em Movimento", description: "Realize 30 minutos de atividade física hoje.", category: "Força", xpReward: 110, skillSlug: "training" },
    { title: "Mente Afiada", description: "Complete 45 minutos de estudo sem distrações.", category: "Inteligência", xpReward: 100, skillSlug: "programming" },
    { title: "Silêncio do Caçador", description: "Medite por 15 minutos e registre um aprendizado.", category: "Disciplina", xpReward: 75, skillSlug: "meditation" },
    { title: "Capítulo do Despertar", description: "Leia por 30 minutos e anote uma ideia útil.", category: "Inteligência", xpReward: 80, skillSlug: "reading" },
  ];
  const dailyMission = selectDailyMissionTemplate(dateKey, pool);
  const result = await db.insert(missions).values({
    ...dailyMission,
    userId,
    type: "challenge",
    priority: "high",
    dueDate: dateKey,
    isSystem: true,
    durationMinutes: 30,
  }).returning({ id: missions.id });
  const created = (await db.select().from(missions).where(eq(missions.id, result[0].id)).limit(1))[0];
  // Notifica apenas para o dia corrente — preenchimento retroativo não gera alerta.
  if (dateKey === getLocalDateKey()) {
    await db.insert(notifications).values({ userId, type: "mission", title: "NOVA MISSÃO DO SISTEMA", message: created.title });
  }
  return created;
}

// Garante as missões da rotina diária para hoje, sem duplicar (idempotente por título + dueDate).
// Rotina pessoal: só o dono (vinicius.spineli) recebe. Calistenia e afins com `weekdays` só entram nos dias configurados.
export async function ensureDailyRoutineMissions(userId: number, dateKey = getLocalDateKey()) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user || user.username !== ADMIN_USERNAME) return;

  // Dia da semana do dia-alvo (meio-dia evita surpresas de fuso).
  const weekday = new Date(`${dateKey}T12:00:00`).getDay();
  const dueToday = dailyRoutineTemplates.filter(item => !item.weekdays || item.weekdays.includes(weekday));
  const existing = await db.select({ title: missions.title }).from(missions).where(and(eq(missions.userId, userId), eq(missions.dueDate, dateKey)));
  const existingTitles = new Set(existing.map(row => row.title));
  const toCreate = dueToday.filter(item => !existingTitles.has(item.title));
  if (!toCreate.length) return;
  await db.insert(missions).values(toCreate.map(item => ({
    userId,
    title: item.title,
    description: null,
    type: "daily" as const,
    category: item.category,
    xpReward: item.xpReward,
    durationMinutes: item.durationMinutes,
    skillSlug: null,
    priority: item.priority,
    status: "active" as const,
    dueDate: dateKey,
    isSystem: true,
  })));
}

// Gera retroativamente as missões de um dia passado (desafio do Sistema + rotina),
// para o operador preencher o que fez quando o app não estava disponível.
export async function backfillDayMissions(userId: number, dateKey: string) {
  const today = getLocalDateKey();
  if (dateKey > today) throw new Error("Não é possível gerar missões para uma data futura.");
  if (dateKey < daysAgoDate(60)) throw new Error("Data muito antiga — o limite é 60 dias atrás.");
  await ensureDailySystemMission(userId, dateKey);
  await ensureDailyRoutineMissions(userId, dateKey);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.dueDate, dateKey))).orderBy(desc(missions.isSystem), desc(missions.priority));
}

export async function ensureWeeklyBoss(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const weekKey = getWeekKey();
  const existing = await db.select().from(bosses).where(and(eq(bosses.userId, userId), eq(bosses.weekKey, weekKey))).limit(1);
  if (existing.length) return existing[0];
  const result = await db.insert(bosses).values({
    userId,
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

async function touchStreak(userId: number) {
  const db = await getDb();
  if (!db) return;
  const hero = (await db.select().from(character).where(eq(character.userId, userId)).limit(1))[0];
  const today = getLocalDateKey();
  if (!hero || hero.lastActiveDate === today) return;
  const yesterday = daysAgoDate(1);
  const nextStreak = hero.lastActiveDate === yesterday ? hero.streak + 1 : 1;
  await db.update(character).set({ streak: nextStreak, longestStreak: Math.max(hero.longestStreak, nextStreak), lastActiveDate: today }).where(eq(character.userId, userId));
  if (nextStreak > hero.streak) {
    await db.insert(notifications).values({ userId, type: "streak", title: "SEQUÊNCIA AMPLIADA", message: `${nextStreak} dias de evolução contínua.` });
  }
}

/* ==========================================================================
 * Leituras / ações do jogo (todas escopadas por userId)
 * ========================================================================== */

export async function getDashboardData(userId: number) {
  await ensureSeedData(userId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const hero = (await db.select().from(character).where(eq(character.userId, userId)).limit(1))[0];
  const today = getLocalDateKey();
  const [attributeRows, skillRows, missionRows, achievementRows, activityRows, heatmapRows, notificationRows, bossRows] = await Promise.all([
    db.select().from(attributes).where(eq(attributes.userId, userId)).orderBy(desc(attributes.value)),
    db.select().from(skills).where(eq(skills.userId, userId)).orderBy(desc(skills.level)),
    db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.dueDate, today))).orderBy(desc(missions.isSystem), desc(missions.priority)),
    db.select().from(achievements).where(and(eq(achievements.userId, userId), sql`${achievements.unlockedAt} IS NOT NULL`)).orderBy(desc(achievements.unlockedAt)).limit(4),
    db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt)).limit(8),
    db.select().from(dailyActivity).where(eq(dailyActivity.userId, userId)).orderBy(asc(dailyActivity.date)).limit(84),
    db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))).orderBy(desc(notifications.createdAt)).limit(8),
    db.select().from(bosses).where(and(eq(bosses.userId, userId), eq(bosses.weekKey, getWeekKey()))).limit(1),
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

async function grantXp(userId: number, xpReward: number, reason: string, skillSlug?: string | null, durationMinutes = 0) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const hero = (await db.select().from(character).where(eq(character.userId, userId)).limit(1))[0];
  const progression = applyXp(hero, xpReward);
  await db.update(character).set({
    level: progression.level,
    currentXp: progression.currentXp,
    totalXp: progression.totalXp,
    title: progression.title,
    rank: progression.rank,
  }).where(eq(character.userId, userId));

  for (const [key, delta] of Object.entries(progression.attributeGains)) {
    await db.update(attributes).set({ value: sql`${attributes.value} + ${delta}` }).where(and(eq(attributes.userId, userId), eq(attributes.key, key)));
    await db.insert(attributeHistory).values({ userId, attributeKey: key, delta, reason });
  }

  let skillLevelUp = null as null | { name: string; level: number };
  if (skillSlug) {
    const skill = (await db.select().from(skills).where(and(eq(skills.userId, userId), eq(skills.slug, skillSlug))).limit(1))[0];
    if (skill) {
      const result = applySkillXp(skill.level, skill.xp, Math.max(10, Math.round(xpReward * 0.65)));
      await db.update(skills).set({ level: result.level, xp: result.xp, totalMinutes: skill.totalMinutes + durationMinutes, lastEvolvedAt: new Date() }).where(eq(skills.id, skill.id));
      if (result.levelsGained > 0) {
        skillLevelUp = { name: skill.name, level: result.level };
        await db.insert(notifications).values({ userId, type: "skill", title: "SKILL EVOLUÍDA", message: `${skill.name} alcançou o nível ${result.level}.` });
      }
    }
  }

  if (progression.levelsGained > 0) {
    await db.insert(activities).values({ userId, type: "level", title: `Nível ${progression.level} alcançado`, description: reason, metadata: progression.attributeGains });
    await db.insert(notifications).values({ userId, type: "level", title: "LEVEL UP", message: `O Sistema elevou você ao nível ${progression.level}.` });
    if (progression.title !== hero.title) {
      await db.insert(notifications).values({ userId, type: "title", title: "NOVO TÍTULO", message: progression.title });
    }
  }
  return { progression, skillLevelUp };
}

export async function listMissions(userId: number) {
  await ensureSeedData(userId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(missions).where(eq(missions.userId, userId)).orderBy(asc(missions.status), desc(missions.isSystem), desc(missions.createdAt));
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

export async function createMission(userId: number, input: MissionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(missions).values({ ...input, userId, description: input.description ?? null, skillSlug: input.skillSlug ?? null }).returning({ id: missions.id });
  await db.insert(notifications).values({ userId, type: "mission", title: "NOVA MISSÃO", message: input.title });
  return (await db.select().from(missions).where(eq(missions.id, result[0].id)).limit(1))[0];
}

export async function updateMission(userId: number, id: number, input: Partial<MissionInput>) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(missions).set(input).where(and(eq(missions.userId, userId), eq(missions.id, id)));
  return (await db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.id, id))).limit(1))[0];
}

export async function deleteMission(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(missions).where(and(eq(missions.userId, userId), eq(missions.id, id)));
  return { success: true };
}

export async function duplicateMission(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const source = (await db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.id, id))).limit(1))[0];
  if (!source) throw new Error("Missão não encontrada");
  return createMission(userId, {
    title: duplicateMissionTitle(source.title), description: source.description ?? undefined, type: source.type,
    category: source.category, xpReward: source.xpReward, durationMinutes: source.durationMinutes,
    skillSlug: source.skillSlug, priority: source.priority, dueDate: source.dueDate,
  });
}

export async function completeMission(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const mission = (await db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.id, id))).limit(1))[0];
  if (!mission) throw new Error("Missão não encontrada");
  if (!canCompleteMission(mission.status)) throw new Error("Missão já concluída ou arquivada");

  await db.update(missions).set({ status: "completed", completedAt: new Date() }).where(and(eq(missions.userId, userId), eq(missions.id, id)));
  const reward = await grantXp(userId, mission.xpReward, `Missão concluída: ${mission.title}`, mission.skillSlug, mission.durationMinutes);
  for (const key of categoryToAttribute[mission.category] ?? ["discipline"]) {
    await db.update(attributes).set({ progress: sql`MIN(99, ${attributes.progress} + 3)` }).where(and(eq(attributes.userId, userId), eq(attributes.key, key)));
  }
  // Missão retroativa (dueDate no passado): o heatmap/estatísticas contam no dia da missão, não em hoje.
  const today = getLocalDateKey();
  const activityDate = mission.dueDate < today ? mission.dueDate : today;
  await db.insert(dailyActivity).values({ userId, date: activityDate, xp: mission.xpReward, missions: 1, studyMinutes: mission.category === "Inteligência" ? mission.durationMinutes : 0, workouts: mission.category === "Força" ? 1 : 0, cardioMinutes: mission.category === "Vitalidade" ? mission.durationMinutes : 0 }).onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.date], set: { xp: sql`${dailyActivity.xp} + ${mission.xpReward}`, missions: sql`${dailyActivity.missions} + 1`, studyMinutes: sql`${dailyActivity.studyMinutes} + ${mission.category === "Inteligência" ? mission.durationMinutes : 0}`, workouts: sql`${dailyActivity.workouts} + ${mission.category === "Força" ? 1 : 0}`, cardioMinutes: sql`${dailyActivity.cardioMinutes} + ${mission.category === "Vitalidade" ? mission.durationMinutes : 0}` } });
  await db.insert(activities).values({ userId, type: "mission", title: mission.title, description: "Missão concluída. O Sistema registrou sua evolução.", xp: mission.xpReward });

  const boss = (await db.select().from(bosses).where(and(eq(bosses.userId, userId), eq(bosses.weekKey, getWeekKey()), eq(bosses.status, "active"))).limit(1))[0];
  let bossDefeated = null as null | { title: string; xpReward: number };
  if (boss && boss.metric === "missions") {
    const bossProgress = progressBoss(boss.current, boss.target);
    await db.update(bosses).set({ current: bossProgress.current }).where(eq(bosses.id, boss.id));
    if (bossProgress.defeated) {
      await db.update(bosses).set({ status: "defeated", defeatedAt: new Date() }).where(eq(bosses.id, boss.id));
      await grantXp(userId, boss.xpReward, `Boss derrotado: ${boss.title}`);
      await db.update(achievements).set({ progress: 1, unlockedAt: new Date() }).where(and(eq(achievements.userId, userId), eq(achievements.code, boss.achievementCode)));
      await db.insert(notifications).values({ userId, type: "achievement", title: "BOSS DERROTADO", message: `${boss.title}: +${boss.xpReward} XP.` });
      await db.insert(activities).values({ userId, type: "boss", title: `Boss derrotado: ${boss.title}`, xp: boss.xpReward });
      bossDefeated = { title: boss.title, xpReward: boss.xpReward };
    }
  }
  return { mission, ...reward, bossDefeated };
}

// Desfaz a conclusão de uma missão (clique errado, por exemplo), revertendo os efeitos:
// XP/nível/título/rank do personagem (recomputados do total, que é determinístico),
// ganhos de atributo de level-ups desfeitos, progresso de categoria, atividade diária
// do dia em que contou, XP da skill vinculada, progresso do boss e o registro da timeline.
export async function uncompleteMission(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const mission = (await db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.id, id))).limit(1))[0];
  if (!mission) throw new Error("Missão não encontrada");
  if (mission.status !== "completed") throw new Error("A missão não está concluída");

  const completedAtDate = mission.completedAt ? new Date(mission.completedAt) : new Date();
  const completedKey = getLocalDateKey(completedAtDate);
  // Mesma regra usada na conclusão: missão retroativa conta no dueDate.
  const activityDate = mission.dueDate < completedKey ? mission.dueDate : completedKey;

  await db.update(missions).set({ status: "active", completedAt: null }).where(and(eq(missions.userId, userId), eq(missions.id, id)));

  // Boss da semana em que a conclusão contou. Se esta missão foi a que derrotou o boss,
  // a derrota também é desfeita (XP do boss, conquista e registro na timeline).
  let bossXpToRevert = 0;
  const boss = (await db.select().from(bosses).where(and(eq(bosses.userId, userId), eq(bosses.weekKey, getWeekKey(completedAtDate)))).limit(1))[0];
  if (boss && boss.metric === "missions") {
    const newCurrent = Math.max(0, boss.current - 1);
    if (boss.status === "defeated" && newCurrent < boss.target) {
      bossXpToRevert = boss.xpReward;
      await db.update(bosses).set({ current: newCurrent, status: "active", defeatedAt: null }).where(eq(bosses.id, boss.id));
      await db.update(achievements).set({ progress: 0, unlockedAt: null }).where(and(eq(achievements.userId, userId), eq(achievements.code, boss.achievementCode)));
      const bossActivity = (await db.select().from(activities).where(and(eq(activities.userId, userId), eq(activities.type, "boss"), eq(activities.title, `Boss derrotado: ${boss.title}`))).orderBy(desc(activities.createdAt)).limit(1))[0];
      if (bossActivity) await db.delete(activities).where(eq(activities.id, bossActivity.id));
    } else if (boss.status === "active") {
      await db.update(bosses).set({ current: newCurrent }).where(eq(bosses.id, boss.id));
    }
  }

  // Personagem: recomputa do zero com o total sem o XP da missão (e do boss, se a derrota foi desfeita).
  const hero = (await db.select().from(character).where(eq(character.userId, userId)).limit(1))[0];
  if (hero) {
    const base = { level: 1, currentXp: 0, totalXp: 0 };
    const before = applyXp(base, hero.totalXp);
    const newTotal = Math.max(0, hero.totalXp - mission.xpReward - bossXpToRevert);
    const after = applyXp(base, newTotal);
    await db.update(character).set({
      level: after.level,
      currentXp: after.currentXp,
      totalXp: newTotal,
      title: after.title,
      rank: after.rank,
    }).where(eq(character.userId, userId));
    for (const key of Object.keys(before.attributeGains)) {
      const delta = (before.attributeGains[key] ?? 0) - (after.attributeGains[key] ?? 0);
      if (delta > 0) {
        await db.update(attributes).set({ value: sql`MAX(1, ${attributes.value} - ${delta})` }).where(and(eq(attributes.userId, userId), eq(attributes.key, key)));
        await db.insert(attributeHistory).values({ userId, attributeKey: key, delta: -delta, reason: `Conclusão desfeita: ${mission.title}` });
      }
    }
    // Limpa da timeline os "Nível X alcançado" dos níveis desfeitos.
    for (let level = after.level + 1; level <= before.level; level++) {
      const levelActivity = (await db.select().from(activities).where(and(eq(activities.userId, userId), eq(activities.type, "level"), eq(activities.title, `Nível ${level} alcançado`))).orderBy(desc(activities.createdAt)).limit(1))[0];
      if (levelActivity) await db.delete(activities).where(eq(activities.id, levelActivity.id));
    }
  }

  // Progresso de categoria (o +3 aplicado na conclusão).
  for (const key of categoryToAttribute[mission.category] ?? ["discipline"]) {
    await db.update(attributes).set({ progress: sql`MAX(0, ${attributes.progress} - 3)` }).where(and(eq(attributes.userId, userId), eq(attributes.key, key)));
  }

  // Atividade diária do dia em que a conclusão contou.
  await db.update(dailyActivity).set({
    xp: sql`MAX(0, ${dailyActivity.xp} - ${mission.xpReward})`,
    missions: sql`MAX(0, ${dailyActivity.missions} - 1)`,
    studyMinutes: sql`MAX(0, ${dailyActivity.studyMinutes} - ${mission.category === "Inteligência" ? mission.durationMinutes : 0})`,
    workouts: sql`MAX(0, ${dailyActivity.workouts} - ${mission.category === "Força" ? 1 : 0})`,
    cardioMinutes: sql`MAX(0, ${dailyActivity.cardioMinutes} - ${mission.category === "Vitalidade" ? mission.durationMinutes : 0})`,
  }).where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, activityDate)));
  // Se o dia zerou por completo, remove a linha (deixa o heatmap idêntico ao estado anterior).
  await db.delete(dailyActivity).where(and(
    eq(dailyActivity.userId, userId),
    eq(dailyActivity.date, activityDate),
    eq(dailyActivity.xp, 0),
    eq(dailyActivity.missions, 0),
    eq(dailyActivity.focusMinutes, 0),
    eq(dailyActivity.studyMinutes, 0),
    eq(dailyActivity.workouts, 0),
    eq(dailyActivity.cardioMinutes, 0),
  ));

  // Skill vinculada: desfaz o XP ganho (recomputa nível/xp do total acumulado).
  if (mission.skillSlug) {
    const skill = (await db.select().from(skills).where(and(eq(skills.userId, userId), eq(skills.slug, mission.skillSlug))).limit(1))[0];
    if (skill) {
      const gained = Math.max(10, Math.round(mission.xpReward * 0.65));
      let totalSkillXp = skill.xp;
      for (let lv = 1; lv < skill.level; lv++) totalSkillXp += skillXpRequired(lv);
      const recomputed = applySkillXp(1, 0, Math.max(0, totalSkillXp - gained));
      await db.update(skills).set({
        level: recomputed.level,
        xp: recomputed.xp,
        totalMinutes: Math.max(0, skill.totalMinutes - mission.durationMinutes),
      }).where(eq(skills.id, skill.id));
    }
  }

  // Remove o registro mais recente desta conclusão na timeline.
  const lastActivity = (await db.select().from(activities).where(and(eq(activities.userId, userId), eq(activities.type, "mission"), eq(activities.title, mission.title))).orderBy(desc(activities.createdAt)).limit(1))[0];
  if (lastActivity) await db.delete(activities).where(eq(activities.id, lastActivity.id));

  return (await db.select().from(missions).where(eq(missions.id, id)).limit(1))[0];
}

export async function completeFocusSession(userId: number, skillSlug: string, minutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const xpReward = focusXp(minutes);
  await db.insert(focusSessions).values({ userId, skillSlug, plannedMinutes: minutes, actualMinutes: minutes, xpReward });
  const reward = await grantXp(userId, xpReward, `Sessão de foco de ${minutes} minutos`, skillSlug, minutes);
  const today = getLocalDateKey();
  await db.insert(dailyActivity).values({ userId, date: today, xp: xpReward, focusMinutes: minutes, studyMinutes: minutes }).onConflictDoUpdate({ target: [dailyActivity.userId, dailyActivity.date], set: { xp: sql`${dailyActivity.xp} + ${xpReward}`, focusMinutes: sql`${dailyActivity.focusMinutes} + ${minutes}`, studyMinutes: sql`${dailyActivity.studyMinutes} + ${minutes}` } });
  await db.insert(activities).values({ userId, type: "focus", title: `Foco concluído: ${minutes} min`, description: "Concentração convertida em poder.", xp: xpReward });
  return { xpReward, ...reward };
}

export async function getStatistics(userId: number) {
  await ensureSeedData(userId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const since = daysAgoDate(83);
  const [days, attributeRows, skillRows, completed, focusRows] = await Promise.all([
    db.select().from(dailyActivity).where(and(eq(dailyActivity.userId, userId), gte(dailyActivity.date, since))).orderBy(asc(dailyActivity.date)),
    db.select().from(attributes).where(eq(attributes.userId, userId)).orderBy(desc(attributes.value)),
    db.select().from(skills).where(eq(skills.userId, userId)).orderBy(desc(skills.level)),
    db.select().from(missions).where(and(eq(missions.userId, userId), eq(missions.status, "completed"))),
    db.select().from(focusSessions).where(eq(focusSessions.userId, userId)).orderBy(desc(focusSessions.completedAt)).limit(30),
  ]);
  return { days, attributes: attributeRows, skills: skillRows, completedMissions: completed.length, focusSessions: focusRows };
}

export async function getEvolution(userId: number) {
  await ensureSeedData(userId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [timeline, entries, history, achievementRows] = await Promise.all([
    db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt)).limit(50),
    db.select().from(journalEntries).where(eq(journalEntries.userId, userId)).orderBy(desc(journalEntries.date), desc(journalEntries.createdAt)),
    db.select().from(attributeHistory).where(eq(attributeHistory.userId, userId)).orderBy(desc(attributeHistory.createdAt)).limit(50),
    db.select().from(achievements).where(eq(achievements.userId, userId)).orderBy(desc(achievements.unlockedAt)),
  ]);
  return { timeline, entries, attributeHistory: history, achievements: achievementRows };
}

export async function createJournalEntry(userId: number, input: { date: string; title: string; content: string; mood: "focused" | "proud" | "neutral" | "tired" | "challenged" }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(journalEntries).values({ ...input, userId }).returning({ id: journalEntries.id });
  await db.insert(activities).values({ userId, type: "journal", title: `Registro: ${input.title}`, description: "Reflexão adicionada ao Diário de Evolução." });
  return (await db.select().from(journalEntries).where(eq(journalEntries.id, result[0].id)).limit(1))[0];
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return { success: true };
}

/** Cria uma notificação para cada admin (ex.: novo cadastro aguardando liberação). */
export async function notifyAdmins(title: string, message: string) {
  const db = await getDb();
  if (!db) return;
  const admins = await listAdmins();
  if (!admins.length) return;
  await db.insert(notifications).values(admins.map(admin => ({ userId: admin.id, type: "system" as const, title, message })));
}
