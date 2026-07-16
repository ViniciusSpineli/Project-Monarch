export type ProgressionState = {
  level: number;
  currentXp: number;
  totalXp: number;
};

export type ProgressionResult = ProgressionState & {
  levelsGained: number;
  xpForNextLevel: number;
  previousLevel: number;
  title: string;
  rank: string;
  attributeGains: Record<string, number>;
};

export const ATTRIBUTE_ROTATION = [
  "strength",
  "intelligence",
  "discipline",
  "vitality",
  "agility",
  "charisma",
] as const;

export function xpRequiredForLevel(level: number) {
  return Math.round(100 * Math.pow(1.18, Math.max(0, level - 1)));
}

// Hierarquia oficial do Sistema:
// Humano Comum → Rank E → D → C → B → A → S → Rank Nacional → Monarca
export function titleForLevel(level: number) {
  if (level >= 100) return "Monarca";
  if (level >= 90) return "Caçador Rank Nacional";
  if (level >= 80) return "Caçador Rank S";
  if (level >= 60) return "Caçador Rank A";
  if (level >= 40) return "Caçador Rank B";
  if (level >= 25) return "Caçador Rank C";
  if (level >= 15) return "Caçador Rank D";
  if (level >= 8) return "Caçador Rank E";
  return "Humano Comum";
}

export function rankForLevel(level: number) {
  if (level >= 100) return "Monarca";
  if (level >= 90) return "Nacional";
  if (level >= 80) return "S";
  if (level >= 60) return "A";
  if (level >= 40) return "B";
  if (level >= 25) return "C";
  if (level >= 15) return "D";
  if (level >= 8) return "E";
  return "Humano";
}

export function applyXp(state: ProgressionState, earnedXp: number): ProgressionResult {
  const previousLevel = state.level;
  let level = state.level;
  let currentXp = state.currentXp + Math.max(0, earnedXp);
  const attributeGains: Record<string, number> = {};

  while (currentXp >= xpRequiredForLevel(level)) {
    currentXp -= xpRequiredForLevel(level);
    level += 1;
    const primary = ATTRIBUTE_ROTATION[(level - 1) % ATTRIBUTE_ROTATION.length];
    const secondary = ATTRIBUTE_ROTATION[(level + 1) % ATTRIBUTE_ROTATION.length];
    attributeGains[primary] = (attributeGains[primary] ?? 0) + 2;
    attributeGains[secondary] = (attributeGains[secondary] ?? 0) + 1;
  }

  return {
    level,
    currentXp,
    totalXp: state.totalXp + Math.max(0, earnedXp),
    levelsGained: level - previousLevel,
    xpForNextLevel: xpRequiredForLevel(level),
    previousLevel,
    title: titleForLevel(level),
    rank: rankForLevel(level),
    attributeGains,
  };
}

export function skillXpRequired(level: number) {
  return Math.round(80 * Math.pow(1.16, Math.max(0, level - 1)));
}

export function applySkillXp(level: number, xp: number, earnedXp: number) {
  const previousLevel = level;
  let nextLevel = level;
  let nextXp = xp + Math.max(0, earnedXp);
  while (nextXp >= skillXpRequired(nextLevel)) {
    nextXp -= skillXpRequired(nextLevel);
    nextLevel += 1;
  }
  return {
    level: nextLevel,
    xp: nextXp,
    levelsGained: nextLevel - previousLevel,
    xpForNextLevel: skillXpRequired(nextLevel),
  };
}

export function focusXp(minutes: number) {
  return Math.max(5, Math.round(minutes * 2.4));
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekKey(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() + 4 - day);
  const yearStart = new Date(current.getFullYear(), 0, 1);
  const week = Math.ceil((((current.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${current.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function progressBoss(current: number, target: number, increment = 1) {
  const safeTarget = Math.max(1, Math.round(target));
  const next = Math.min(safeTarget, Math.max(0, Math.round(current)) + Math.max(0, Math.round(increment)));
  return {
    current: next,
    target: safeTarget,
    defeated: next >= safeTarget,
    progressPercent: Math.round((next / safeTarget) * 100),
  };
}

export type MissionStatus = "active" | "completed" | "expired";

export function selectDailyMissionTemplate<T>(dateKey: string, pool: readonly T[]): T {
  if (pool.length === 0) throw new Error("O conjunto de missões diárias não pode estar vazio");
  const index = dateKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  return pool[index];
}

export function canCompleteMission(status: MissionStatus) {
  return status === "active";
}

export function duplicateMissionTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) throw new Error("A missão precisa de um título");
  return `${normalized} — Cópia`;
}
