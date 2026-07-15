import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { trpc } from "@/lib/trpc";
import { BrainCircuit, Check, Coffee, Crosshair, Flame, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Target, TimerReset, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const presets = [25, 50, 90];
const iconMap = { BrainCircuit, ShieldCheck, Sparkles, Crosshair };

export default function FocusMode() {
  const utils = trpc.useUtils();
  const dashboard = trpc.dashboard.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [skillSlug, setSkillSlug] = useState("programming");
  const completionSent = useRef(false);
  const complete = trpc.focus.complete.useMutation({
    onSuccess: result => {
      toast.success(`SESSÃO CONCLUÍDA: +${result.xpReward} XP`);
      if (result.skillLevelUp) toast(`SKILL EVOLUÍDA: ${result.skillLevelUp.name} Nv. ${result.skillLevelUp.level}`);
      setRunning(false);
      utils.dashboard.get.invalidate();
    },
    onError: error => { toast.error(error.message); completionSent.current = false; },
  });

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0 && !completionSent.current) {
      completionSent.current = true;
      complete.mutate({ skillSlug, minutes });
    }
  }, [secondsLeft, skillSlug, minutes]);

  const changePreset = (value: number) => {
    setRunning(false);
    setMinutes(value);
    setSecondsLeft(value * 60);
    completionSent.current = false;
  };
  const reset = () => { setRunning(false); setSecondsLeft(minutes * 60); completionSent.current = false; };
  const progress = 1 - secondsLeft / (minutes * 60);
  const timeLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const reward = Math.max(10, Math.round(minutes * 2.2));
  const selectedSkill = dashboard.data?.skills.find(skill => skill.slug === skillSlug);
  const circumference = 2 * Math.PI * 145;

  if (dashboard.isLoading) return <LoadingSector label="PREPARANDO CÂMARA DE FOCO" />;
  if (dashboard.isError || !dashboard.data) return <ErrorSector retry={() => dashboard.refetch()} />;

  return (
    <>
      <PageHeader eyebrow="CÂMARA DE CONCENTRAÇÃO" title="Modo Foco" description="Isole distrações, vincule uma skill e conclua a sessão. O Sistema concede XP automaticamente ao término do ciclo." />
      <div className="focus-layout">
        <SystemCard className={`focus-chamber ${running ? "running" : ""}`} accent="#22d3ee">
          <div className="focus-scanlines" />
          <div className="focus-state"><span className={running ? "online" : ""}>{running ? "SESSÃO EM CURSO" : secondsLeft === 0 ? "SESSÃO CONCLUÍDA" : "CÂMARA PRONTA"}</span><strong>PROTOCOLO // CONCENTRAÇÃO PROFUNDA</strong></div>
          <div className="timer-orbit">
            <svg viewBox="0 0 330 330" aria-hidden="true"><circle cx="165" cy="165" r="145" className="timer-base" /><motion.circle cx="165" cy="165" r="145" className="timer-progress" strokeDasharray={circumference} animate={{ strokeDashoffset: circumference * (1 - progress) }} transition={{ duration: .5 }} /></svg>
            <div className="timer-core"><Crosshair size={22} /><span>{running ? "FOCO ATIVO" : "TEMPO RESTANTE"}</span><strong>{timeLabel}</strong><small>{Math.round(progress * 100)}% DO CICLO</small></div>
          </div>
          <div className="timer-actions">
            <button className="timer-secondary" onClick={reset} aria-label="Reiniciar"><RotateCcw size={18} /></button>
            <button className="timer-primary" disabled={secondsLeft === 0 || complete.isPending} onClick={() => setRunning(value => !value)}>{running ? <Pause size={23} /> : <Play size={23} />}{running ? "PAUSAR" : secondsLeft === 0 ? "CONCLUÍDO" : "INICIAR FOCO"}</button>
            <button className="timer-secondary" onClick={() => changePreset(25)} aria-label="Novo ciclo"><TimerReset size={18} /></button>
          </div>
        </SystemCard>

        <div className="focus-side">
          <SystemCard accent="#8b5cf6">
            <div className="card-head"><div><span>CONFIGURAÇÃO DO PROTOCOLO</span><h2>Parâmetros da sessão</h2></div><Target size={17} className="text-violet-300" /></div>
            <div className="focus-config">
              <label><span>DURAÇÃO</span><div className="preset-grid">{presets.map(value => <button key={value} className={minutes === value ? "active" : ""} onClick={() => changePreset(value)} disabled={running}><strong>{value}</strong><small>MIN</small></button>)}</div></label>
              <label><span>SKILL VINCULADA</span><div className="skill-select-wrap"><Sparkles size={16} /><select value={skillSlug} onChange={e => setSkillSlug(e.target.value)} disabled={running}>{dashboard.data.skills.map(skill => <option value={skill.slug} key={skill.id}>{skill.name} — Nv. {skill.level}</option>)}</select></div></label>
            </div>
          </SystemCard>

          <SystemCard accent="#fbbf24">
            <div className="card-head"><div><span>RECOMPENSA PROJETADA</span><h2>Resultado do ciclo</h2></div><Zap size={17} className="text-amber-300" /></div>
            <div className="focus-reward">
              <div className="reward-xp"><Zap size={22} /><span>XP AO CONCLUIR</span><strong>+{reward}</strong></div>
              <div className="reward-skill"><div className="skill-reward-icon">{selectedSkill ? (() => { const Icon = iconMap[selectedSkill.icon as keyof typeof iconMap] ?? Sparkles; return <Icon size={20} />; })() : <Sparkles size={20} />}</div><div><span>SKILL BENEFICIADA</span><strong>{selectedSkill?.name ?? "—"}</strong><small>{selectedSkill?.xp ?? 0} / {selectedSkill?.xpForNextLevel ?? 0} XP atual</small></div></div>
            </div>
          </SystemCard>

          <SystemCard accent="#34d399">
            <div className="focus-rules"><ShieldCheck size={19} /><div><span>REGRAS DA CÂMARA</span><p>O XP é concedido somente quando o cronômetro chega a zero. Pausas preservam o progresso; reiniciar cancela o ciclo atual.</p></div></div>
          </SystemCard>
        </div>
      </div>

      <div className="focus-tips">
        <div><BrainCircuit size={17} /><span>Prepare o ambiente antes de iniciar.</span></div><div><Coffee size={17} /><span>Use pausas conscientes entre ciclos.</span></div><div><Flame size={17} /><span>Sessões concluídas fortalecem sua sequência.</span></div><div><Check size={17} /><span>Uma tarefa por sessão.</span></div>
      </div>
    </>
  );
}
