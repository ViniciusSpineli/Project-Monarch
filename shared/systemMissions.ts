// Protocolos diários por skill: as missões que O SISTEMA envia todos os dias
// para instigar a evolução de cada habilidade. Compartilhado entre servidor
// (criação diária) e cliente (selo vermelho "MISSÃO DO SISTEMA").
export const dailySkillMissionTemplates = [
  { skillSlug: "programming", title: "Protocolo de Produção", description: "Realize 90 minutos de trabalho focado, sem distrações.", category: "Disciplina", xpReward: 60, durationMinutes: 90 },
  { skillSlug: "strength", title: "Forja do Corpo", description: "Complete 15 minutos de treino (musculação, calistenia ou alongamento).", category: "Força", xpReward: 50, durationMinutes: 15 },
  { skillSlug: "reading", title: "Códice do Caçador", description: "Leia 10 páginas de qualquer livro.", category: "Inteligência", xpReward: 40, durationMinutes: 20 },
  { skillSlug: "meditation", title: "Silêncio Interior", description: "Medite ou faça respiração consciente por 10 minutos.", category: "Disciplina", xpReward: 35, durationMinutes: 10 },
  { skillSlug: "cardio", title: "Ritmo de Caça", description: "Faça 20 minutos de caminhada, bike ou corrida.", category: "Vitalidade", xpReward: 50, durationMinutes: 20 },
  { skillSlug: "learning", title: "Absorção de Conhecimento", description: "Estude algo novo por 30 minutos (curso, vídeo-aula, idioma).", category: "Inteligência", xpReward: 50, durationMinutes: 30 },
  { skillSlug: "screen-time", title: "Desintoxicação Digital", description: "Fique 2 horas longe de telas fora do trabalho (celular incluso).", category: "Disciplina", xpReward: 45, durationMinutes: 0 },
  { skillSlug: "self-care", title: "Manutenção do Caçador", description: "Faça algo por você: skincare, banho relaxante ou dormir antes das 23h.", category: "Vitalidade", xpReward: 40, durationMinutes: 15 },
] as const;

const skillProtocolTitles = new Set<string>(dailySkillMissionTemplates.map(item => item.title));

/** Identifica os protocolos diários de skill (e só eles) para o selo "MISSÃO DO SISTEMA". */
export function isSkillProtocolMission(mission: { isSystem: boolean; title: string }) {
  return mission.isSystem && skillProtocolTitles.has(mission.title);
}
