import { describe, expect, it } from "vitest";
import { missionInput } from "./routers";
import {
  applySkillXp,
  applyXp,
  canCompleteMission,
  duplicateMissionTitle,
  focusXp,
  getLocalDateKey,
  getWeekKey,
  rankForLevel,
  progressBoss,
  selectDailyMissionTemplate,
  skillXpRequired,
  titleForLevel,
  xpRequiredForLevel,
} from "../shared/progression";

describe("progressão do personagem", () => {
  it("mantém o XP abaixo do limiar no nível atual", () => {
    const result = applyXp({ level: 1, currentXp: 20, totalXp: 20 }, 30);
    expect(result).toMatchObject({ level: 1, currentXp: 50, totalXp: 50, levelsGained: 0 });
    expect(result.xpForNextLevel).toBe(100);
  });

  it("sobe de nível no limiar e concede três pontos distribuídos", () => {
    const result = applyXp({ level: 1, currentXp: 90, totalXp: 90 }, 10);
    expect(result.level).toBe(2);
    expect(result.currentXp).toBe(0);
    expect(result.levelsGained).toBe(1);
    expect(Object.values(result.attributeGains).reduce((sum, value) => sum + value, 0)).toBe(3);
  });

  it("processa múltiplos level ups e nunca aceita XP negativo", () => {
    const multi = applyXp({ level: 1, currentXp: 0, totalXp: 0 }, 500);
    const ignored = applyXp({ level: 3, currentXp: 12, totalXp: 250 }, -100);
    expect(multi.levelsGained).toBeGreaterThan(1);
    expect(multi.totalXp).toBe(500);
    expect(ignored).toMatchObject({ level: 3, currentXp: 12, totalXp: 250 });
  });

  it("aumenta progressivamente o custo e desbloqueia títulos e ranks", () => {
    expect(xpRequiredForLevel(10)).toBeGreaterThan(xpRequiredForLevel(2));
    expect(titleForLevel(5)).toBe("Caçador Desperto");
    expect(titleForLevel(80)).toBe("Lenda Rank S");
    expect(rankForLevel(24)).toBe("D");
    expect(rankForLevel(80)).toBe("S");
  });
});

describe("progressão de skills e foco", () => {
  it("evolui a skill e conserva o excedente de XP", () => {
    const required = skillXpRequired(1);
    const result = applySkillXp(1, required - 5, 10);
    expect(result).toMatchObject({ level: 2, xp: 5, levelsGained: 1 });
  });

  it("converte minutos de foco em XP com recompensa mínima", () => {
    expect(focusXp(0)).toBe(5);
    expect(focusXp(25)).toBe(60);
    expect(focusXp(50)).toBe(120);
  });
});

describe("Bosses Semanais", () => {
  it("avança sem ultrapassar a meta", () => {
    expect(progressBoss(3, 7)).toEqual({ current: 4, target: 7, defeated: false, progressPercent: 57 });
    expect(progressBoss(6, 7, 5)).toEqual({ current: 7, target: 7, defeated: true, progressPercent: 100 });
  });

  it("normaliza valores inválidos sem gerar progresso negativo", () => {
    expect(progressBoss(-4, 0, -2)).toEqual({ current: 0, target: 1, defeated: false, progressPercent: 0 });
  });
});

describe("contrato de Missões", () => {
  const validMission = {
    title: "Treinar fundamentos",
    description: "Executar uma sessão focada de prática.",
    type: "daily" as const,
    category: "Disciplina",
    xpReward: 80,
    priority: "high" as const,
    durationMinutes: 25,
    dueDate: "2026-07-15",
  };

  it("aceita uma missão completa dentro dos limites do Sistema", () => {
    expect(missionInput.parse(validMission)).toMatchObject(validMission);
  });

  it("rejeita títulos curtos, XP abusivo e datas inválidas", () => {
    expect(missionInput.safeParse({ ...validMission, title: "X" }).success).toBe(false);
    expect(missionInput.safeParse({ ...validMission, xpReward: 5001 }).success).toBe(false);
    expect(missionInput.safeParse({ ...validMission, dueDate: "15/07/2026" }).success).toBe(false);
  });

  it("seleciona uma única missão do Sistema de forma estável para cada data", () => {
    const pool = ["Força", "Inteligência", "Disciplina"] as const;
    expect(selectDailyMissionTemplate("2026-07-15", pool)).toBe(selectDailyMissionTemplate("2026-07-15", pool));
    expect(pool).toContain(selectDailyMissionTemplate("2026-07-16", pool));
    expect(() => selectDailyMissionTemplate("2026-07-15", [])).toThrow(/não pode estar vazio/);
  });

  it("duplica o título sem alterar a origem e bloqueia reconclusão", () => {
    const original = "Treinar fundamentos";
    expect(duplicateMissionTitle(original)).toBe("Treinar fundamentos — Cópia");
    expect(original).toBe("Treinar fundamentos");
    expect(canCompleteMission("active")).toBe(true);
    expect(canCompleteMission("completed")).toBe(false);
    expect(canCompleteMission("expired")).toBe(false);
  });
});

describe("chaves de calendário do Sistema", () => {
  it("gera chave local de data estável", () => {
    expect(getLocalDateKey(new Date(2026, 6, 15, 23, 59))).toBe("2026-07-15");
  });

  it("agrupa datas da mesma semana ISO", () => {
    expect(getWeekKey(new Date(2026, 6, 13))).toBe(getWeekKey(new Date(2026, 6, 19)));
    expect(getWeekKey(new Date(2026, 6, 20))).not.toBe(getWeekKey(new Date(2026, 6, 19)));
  });
});
