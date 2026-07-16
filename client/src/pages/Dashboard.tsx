import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { rankImages } from "@/lib/rankImages";
import { trpc } from "@/lib/trpc";
import { isSkillProtocolMission } from "@shared/systemMissions";
import {
  Award,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Code2,
  Crown,
  Dumbbell,
  Flame,
  Gauge,
  HeartPulse,
  Orbit,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const iconMap = { Dumbbell, BrainCircuit, ShieldCheck, HeartPulse, Gauge, Sparkles, Code2, BookOpen, Orbit, Trophy, Swords, Award };
const motivation = [
  "A consistência é a habilidade secreta que nenhum inimigo consegue copiar.",
  "O Sistema não exige perfeição. Exige que você retorne ao campo de batalha.",
  "Cada missão concluída é uma prova de que sua próxima versão já começou.",
];

export default function Dashboard() {
  const utils = trpc.useUtils();
  const query = trpc.dashboard.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const [levelUp, setLevelUp] = useState<null | { level: number; title: string; gains: Record<string, number> }>(null);
  const complete = trpc.missions.complete.useMutation({
    onSuccess: result => {
      if (result.progression.levelsGained > 0) {
        setLevelUp({ level: result.progression.level, title: result.progression.title, gains: result.progression.attributeGains });
      } else {
        toast.success(`Missão concluída: +${result.mission.xpReward} XP`);
      }
      if (result.skillLevelUp) toast(`SKILL EVOLUÍDA: ${result.skillLevelUp.name} Nv. ${result.skillLevelUp.level}`);
      if (result.bossDefeated) toast.success(`BOSS DERROTADO: +${result.bossDefeated.xpReward} XP`);
      utils.dashboard.get.invalidate();
      utils.missions.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const uncomplete = trpc.missions.uncomplete.useMutation({
    onSuccess: () => {
      toast("Conclusão desfeita — XP e progresso revertidos.");
      utils.dashboard.get.invalidate();
      utils.missions.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingSector />;
  if (query.isError || !query.data) return <ErrorSector retry={() => query.refetch()} />;

  const { character, attributes, skills, missions, achievements, heatmap, boss } = query.data;
  const completedToday = missions.filter(item => item.status === "completed").length;
  const xpPercent = Math.min(100, Math.round((character.currentXp / character.xpForNextLevel) * 100));
  const quote = motivation[new Date().getDate() % motivation.length];

  return (
    <>
      <PageHeader eyebrow="VISÃO DO CAÇADOR" title="Painel de Ascensão" description="O Sistema registrou seus sinais vitais, progresso e objetivos prioritários. Continue avançando." action={<Link href="/missoes" className="system-button"><Target size={16} /> Abrir Missões</Link>} />

      <div className="dashboard-grid">
        <SystemCard className="hero-card" accent="#22d3ee">
          <div className="hero-scan" />
          <div className="hero-avatar-wrap">
            <div className="hero-rings"><i /><i /><i /></div>
            <div className="hero-avatar">
              {rankImages[character.rank] ? (
                <img src={rankImages[character.rank]} alt={`O mais forte do Rank ${character.rank}`} />
              ) : (
                <span>{character.rank?.[0]?.toUpperCase() ?? "C"}</span>
              )}
            </div>
            <div className="hero-level-badge"><span>LV</span><strong>{character.level}</strong></div>
          </div>
          <div className="hero-info">
            <div className="hero-id"><span>JOGADOR #0001</span><b>STATUS: DESPERTO</b></div>
            <h2>{character.name}</h2>
            <div className="hero-title"><Crown size={15} /> {character.title}</div>
            <div className="xp-block">
              <div className="xp-label"><span>EXPERIÊNCIA</span><strong>{character.currentXp.toLocaleString("pt-BR")} <small>/ {character.xpForNextLevel.toLocaleString("pt-BR")} XP</small></strong></div>
              <div className="xp-track"><motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .8, ease: [0.23,1,.32,1] }} /><div className="xp-flare" style={{ left: `${xpPercent}%` }} /></div>
              <div className="xp-meta"><span>{xpPercent}% para o próximo nível</span><span>{character.totalXp.toLocaleString("pt-BR")} XP total</span></div>
            </div>
            <div className="hero-stats"><div><span>RANK</span><strong>{character.rank}</strong></div><div><span>SEQUÊNCIA</span><strong>{character.streak}d</strong></div><div><span>RECORDE</span><strong>{character.longestStreak}d</strong></div></div>
          </div>
        </SystemCard>

        <SystemCard className="mission-overview" accent="#8b5cf6">
          <div className="card-head"><div><span>PROTOCOLO DIÁRIO</span><h2>Missões de hoje</h2></div><div className="mission-ring"><strong>{completedToday}</strong><span>/{missions.length}</span></div></div>
          <div className="dashboard-missions">
            {missions.length === 0 ? <div className="empty-state"><Check size={22} /><strong>SETOR LIMPO</strong><span>Nenhuma missão pendente.</span></div> : missions.slice(0, 5).map((mission, index) => (
              <motion.div className={`dashboard-mission ${mission.status === "completed" ? "completed" : ""} ${mission.isSystem ? "system" : ""}`} key={mission.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .05 }}>
                <button
                  aria-label={mission.status === "completed" ? `Desfazer conclusão de ${mission.title}` : `Concluir ${mission.title}`}
                  title={mission.status === "completed" ? "Desfazer conclusão" : "Concluir missão"}
                  disabled={mission.status === "expired" || complete.isPending || uncomplete.isPending}
                  onClick={() => mission.status === "completed" ? uncomplete.mutate({ id: mission.id }) : complete.mutate({ id: mission.id })}
                ><Check size={14} /></button>
                <div><div className="mission-tags">{isSkillProtocolMission(mission) ? <b className="system-mission-tag">MISSÃO DO SISTEMA</b> : mission.isSystem && <b>SISTEMA</b>}<span>{mission.category}</span></div><strong>{mission.title}</strong></div>
                <em>+{mission.xpReward} XP</em>
              </motion.div>
            ))}
          </div>
          <Link href="/missoes" className="card-link">GERENCIAR TODAS AS MISSÕES <ChevronRight size={14} /></Link>
        </SystemCard>
      </div>

      <div className="dashboard-sections">
        <SystemCard accent="#60a5fa">
          <div className="card-head"><div><span>NÚCLEO DO PERSONAGEM</span><h2>Atributos</h2></div><span className="section-counter">{attributes.reduce((sum, attr) => sum + attr.value, 0)} PTS</span></div>
          <div className="attribute-grid">
            {attributes.map((attribute, index) => {
              const Icon = iconMap[attribute.icon as keyof typeof iconMap] ?? Sparkles;
              return <motion.div className="attribute-row" key={attribute.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}><div className="attribute-icon" style={{ color: attribute.color, borderColor: `${attribute.color}45`, background: `${attribute.color}12` }}><Icon size={17} /></div><div className="attribute-main"><div><strong>{attribute.label}</strong><span>PROGRESSO {attribute.progress}%</span></div><div className="attribute-track"><motion.i style={{ background: attribute.color, boxShadow: `0 0 10px ${attribute.color}80` }} initial={{ width: 0 }} animate={{ width: `${attribute.progress}%` }} /></div></div><b>{attribute.value}</b></motion.div>;
            })}
          </div>
        </SystemCard>

        <SystemCard accent="#a78bfa">
          <div className="card-head"><div><span>ARSENAL DE HABILIDADES</span><h2>Skills dominantes</h2></div><Sparkles size={17} className="text-violet-300" /></div>
          <div className="skills-list">
            {skills.map((skill, index) => {
              const Icon = iconMap[skill.icon as keyof typeof iconMap] ?? Sparkles;
              const progress = Math.min(100, (skill.xp / skill.xpForNextLevel) * 100);
              return <motion.div className="skill-row" key={skill.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }}><div className="skill-icon"><Icon size={18} /></div><div className="skill-main"><div><strong>{skill.name}</strong><span>{Math.round(skill.totalMinutes / 60)}h investidas</span></div><div className="skill-track"><i style={{ width: `${progress}%` }} /></div><small>{skill.xp} / {skill.xpForNextLevel} XP</small></div><div className="skill-level"><span>NV.</span><strong>{skill.level}</strong><em>{skill.rank}</em></div></motion.div>;
            })}
          </div>
        </SystemCard>
      </div>

      <div className="lower-dashboard-grid">
        <SystemCard accent="#34d399">
          <div className="card-head"><div><span>REGISTRO DE CONSTÂNCIA</span><h2>Atividade recente</h2></div><div className="heatmap-streak"><Flame size={15} /><strong>{character.streak}</strong><span>dias</span></div></div>
          <ActivityHeatmap data={heatmap} />
        </SystemCard>

        <SystemCard accent="#fbbf24">
          <div className="card-head"><div><span>RECOMPENSAS DO SISTEMA</span><h2>Conquistas recentes</h2></div><Trophy size={17} className="text-amber-300" /></div>
          <div className="achievement-list">
            {achievements.map(item => { const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Trophy; return <div className={`achievement rarity-${item.rarity}`} key={item.id}><div><Icon size={18} /></div><section><strong>{item.title}</strong><p>{item.description}</p></section><span>{item.rarity}</span></div>; })}
          </div>
        </SystemCard>

        <SystemCard className="boss-card" accent="#f43f5e">
          <div className="boss-aura" />
          <div className="card-head"><div><span>AMEAÇA SEMANAL</span><h2>Boss ativo</h2></div><Swords size={18} className="text-rose-300" /></div>
          {boss ? <div className="boss-body"><div className="boss-emblem"><Swords size={31} /></div><div className="boss-state"><span>CLASSE: PREDADOR DE HÁBITOS</span><h3>{boss.title}</h3><p>{boss.description}</p><div className="boss-track"><i style={{ width: `${Math.min(100, boss.current / boss.target * 100)}%` }} /></div><div className="boss-meta"><span>{boss.current} / {boss.target} {boss.unit}</span><strong>RECOMPENSA +{boss.xpReward} XP</strong></div></div></div> : null}
          <Link href="/missoes" className="card-link">ENFRENTAR O BOSS <ChevronRight size={14} /></Link>
        </SystemCard>
      </div>

      <SystemCard className="motivation-card" accent="#22d3ee"><Zap size={18} /><div><span>TRANSMISSÃO DO SISTEMA</span><blockquote>“{quote}”</blockquote></div></SystemCard>
      <LevelUpOverlay data={levelUp} onClose={() => setLevelUp(null)} />
    </>
  );
}

function ActivityHeatmap({ data }: { data: Array<{ id: number; date: string; xp: number }> }) {
  const max = Math.max(1, ...data.map(day => day.xp));
  return <div className="heatmap-wrap"><div className="heatmap-grid">{data.map(day => { const intensity = day.xp === 0 ? 0 : Math.max(.18, day.xp / max); return <div key={day.id} title={`${new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR")}: ${day.xp} XP`} style={{ background: day.xp === 0 ? "rgba(72,85,122,.14)" : `rgba(52,211,153,${intensity})`, boxShadow: intensity > .7 ? "0 0 9px rgba(52,211,153,.32)" : "none" }} />; })}</div><div className="heatmap-legend"><span>Menos</span>{[.08,.2,.4,.65,.95].map(value => <i key={value} style={{ background: `rgba(52,211,153,${value})` }} />)}<span>Mais</span></div></div>;
}

function LevelUpOverlay({ data, onClose }: { data: null | { level: number; title: string; gains: Record<string, number> }; onClose: () => void }) {
  const particles = useMemo(() => Array.from({ length: 34 }, (_, index) => ({ id: index, x: (index * 37) % 100, delay: (index % 8) * .08, size: 2 + (index % 4) })), []);
  return <AnimatePresence>{data && <motion.div className="level-up-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="level-particles">{particles.map(p => <motion.i key={p.id} style={{ left: `${p.x}%`, width: p.size, height: p.size }} initial={{ y: 180, opacity: 0 }} animate={{ y: -260, opacity: [0,1,0] }} transition={{ duration: 1.8, delay: p.delay, repeat: Infinity }} />)}</div><motion.div className="level-up-dialog" initial={{ opacity: 0, scale: .95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .18, duration: .45, ease: [0.23,1,.32,1] }}><div className="level-crown"><Zap size={40} /></div><span>O SISTEMA RECONHECEU SUA EVOLUÇÃO</span><h2>LEVEL UP</h2><div className="new-level"><small>NOVO NÍVEL</small><strong>{data.level}</strong></div><h3>{data.title}</h3><div className="gain-list">{Object.entries(data.gains).map(([key,value]) => <div key={key}><span>{key.toUpperCase()}</span><strong>+{value}</strong></div>)}</div><button className="system-button" onClick={onClose}>ACEITAR EVOLUÇÃO <Zap size={15} /></button></motion.div></motion.div>}</AnimatePresence>;
}
