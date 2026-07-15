import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Bike, BrainCircuit, CheckCircle2, Clock3, Dumbbell, Flame, Gauge, Target, TrendingUp, Zap } from "lucide-react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";
import { useMemo, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler);

const grid = "rgba(110, 133, 183, .10)";
const ticks = "#71809f";
const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" as const },
  plugins: {
    legend: { labels: { color: ticks, usePointStyle: true, pointStyle: "circle", boxWidth: 7, font: { size: 10 } } },
    tooltip: { backgroundColor: "rgba(10,13,29,.96)", borderColor: "rgba(103,232,249,.25)", borderWidth: 1, titleColor: "#e6faff", bodyColor: "#9baaca", padding: 12, displayColors: true },
  },
  scales: {
    x: { grid: { color: grid }, ticks: { color: ticks, maxRotation: 0, font: { size: 9 } } },
    y: { beginAtZero: true, grid: { color: grid }, ticks: { color: ticks, font: { size: 9 } } },
  },
};

type Period = "day" | "week" | "month";

export default function Statistics() {
  const query = trpc.statistics.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const [period, setPeriod] = useState<Period>("day");

  const aggregated = useMemo(() => {
    const days = query.data?.days ?? [];
    if (period === "day") return days.slice(-21).map(day => ({ key: day.date, label: new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), xp: day.xp, missions: day.missions, focus: day.focusMinutes }));
    const map = new Map<string, { key: string; label: string; xp: number; missions: number; focus: number }>();
    days.forEach(day => {
      const date = new Date(`${day.date}T12:00:00`);
      let key: string;
      let label: string;
      if (period === "week") {
        const start = new Date(date);
        start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        key = start.toISOString().slice(0, 10);
        label = `Sem. ${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
      } else {
        key = day.date.slice(0, 7);
        label = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      }
      const current = map.get(key) ?? { key, label, xp: 0, missions: 0, focus: 0 };
      current.xp += day.xp; current.missions += day.missions; current.focus += day.focusMinutes;
      map.set(key, current);
    });
    return Array.from(map.values()).slice(period === "week" ? -12 : -8);
  }, [query.data, period]);

  if (query.isLoading) return <LoadingSector label="PROCESSANDO TELEMETRIA" />;
  if (query.isError || !query.data) return <ErrorSector retry={() => query.refetch()} />;

  const { days, attributes, skills, completedMissions, focusSessions } = query.data;
  const recent = days.slice(-7);
  const weeklyXp = recent.reduce((sum, day) => sum + day.xp, 0);
  const weeklyMinutes = recent.reduce((sum, day) => sum + day.focusMinutes + day.studyMinutes, 0);
  const workouts = recent.reduce((sum, day) => sum + day.workouts, 0);
  const cardio = recent.reduce((sum, day) => sum + day.cardioMinutes, 0);
  const activeDays = days.filter(day => day.xp > 0).length;
  const currentStreak = calculateStreak(days.map(day => ({ date: day.date, active: day.xp > 0 })));

  const xpData = { labels: aggregated.map(item => item.label), datasets: [{ label: "XP conquistado", data: aggregated.map(item => item.xp), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.13)", pointBackgroundColor: "#a5f3fc", pointBorderColor: "#0e7490", pointRadius: 3, tension: .38, fill: true }] };
  const missionData = { labels: aggregated.map(item => item.label), datasets: [{ label: "Missões concluídas", data: aggregated.map(item => item.missions), backgroundColor: "rgba(139,92,246,.7)", borderColor: "#c4b5fd", borderWidth: 1, borderRadius: 5 }] };
  const attributeData = { labels: attributes.map(item => item.label), datasets: [{ label: "Atributos", data: attributes.map(item => item.value), borderColor: "#67e8f9", backgroundColor: "rgba(34,211,238,.12)", pointBackgroundColor: attributes.map(item => item.color), pointBorderColor: "#0b1022", pointRadius: 4 }] };
  const skillsData = { labels: skills.map(item => item.name), datasets: [{ label: "Nível", data: skills.map(item => item.level), backgroundColor: ["#8b5cf6", "#22d3ee", "#60a5fa", "#34d399", "#f59e0b"], borderColor: "#0c1023", borderWidth: 3 }] };
  const trainingData = { labels: recent.map(day => new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")), datasets: [{ label: "Estudo (min)", data: recent.map(day => day.studyMinutes + day.focusMinutes), backgroundColor: "rgba(96,165,250,.72)", borderRadius: 4 }, { label: "Cardio (min)", data: recent.map(day => day.cardioMinutes), backgroundColor: "rgba(52,211,153,.7)", borderRadius: 4 }, { label: "Treinos", data: recent.map(day => day.workouts * 15), backgroundColor: "rgba(251,146,60,.72)", borderRadius: 4 }] };

  return (
    <>
      <PageHeader eyebrow="TELEMETRIA DE EVOLUÇÃO" title="Estatísticas" description="Dados transformam esforço em estratégia. Analise seus ciclos, identifique padrões e escolha o próximo atributo a fortalecer." />
      <div className="stats-summary">
        <SystemCard accent="#22d3ee"><Zap size={18} /><div><span>XP NOS ÚLTIMOS 7 DIAS</span><strong>{weeklyXp.toLocaleString("pt-BR")}</strong><small><TrendingUp size={12} /> atividade recente</small></div></SystemCard>
        <SystemCard accent="#8b5cf6"><Target size={18} /><div><span>MISSÕES CONCLUÍDAS</span><strong>{completedMissions}</strong><small><CheckCircle2 size={12} /> registro total</small></div></SystemCard>
        <SystemCard accent="#34d399"><Clock3 size={18} /><div><span>HORAS PRODUTIVAS</span><strong>{(weeklyMinutes / 60).toFixed(1)}h</strong><small><BrainCircuit size={12} /> últimos 7 dias</small></div></SystemCard>
        <SystemCard accent="#f59e0b"><Flame size={18} /><div><span>SEQUÊNCIA ATUAL</span><strong>{currentStreak}d</strong><small><Activity size={12} /> {activeDays} dias ativos</small></div></SystemCard>
      </div>

      <div className="stats-grid">
        <SystemCard className="chart-card chart-wide" accent="#22d3ee">
          <div className="card-head"><div><span>CURVA DE EXPERIÊNCIA</span><h2>XP por período</h2></div><div className="period-tabs">{(["day","week","month"] as Period[]).map(value => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value === "day" ? "Dia" : value === "week" ? "Semana" : "Mês"}</button>)}</div></div>
          <div className="chart-area tall"><Line data={xpData} options={commonOptions} /></div>
        </SystemCard>
        <SystemCard className="chart-card" accent="#8b5cf6"><div className="card-head"><div><span>EXECUÇÃO</span><h2>Missões concluídas</h2></div><BarChart3 size={17} className="text-violet-300" /></div><div className="chart-area"><Bar data={missionData} options={commonOptions} /></div></SystemCard>
        <SystemCard className="chart-card" accent="#60a5fa"><div className="card-head"><div><span>NÚCLEO RPG</span><h2>Evolução de atributos</h2></div><Gauge size={17} className="text-blue-300" /></div><div className="chart-area"><Radar data={attributeData} options={{ responsive: true, maintainAspectRatio: false, plugins: commonOptions.plugins, scales: { r: { beginAtZero: true, grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: "#9aabc9", font: { size: 10 } }, ticks: { display: false } } } }} /></div></SystemCard>
        <SystemCard className="chart-card" accent="#a78bfa"><div className="card-head"><div><span>MAESTRIA</span><h2>Ranking de skills</h2></div><BrainCircuit size={17} className="text-violet-300" /></div><div className="chart-area"><Doughnut data={skillsData} options={{ responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: commonOptions.plugins }} /></div></SystemCard>
        <SystemCard className="chart-card chart-wide" accent="#34d399"><div className="card-head"><div><span>DESEMPENHO FÍSICO E MENTAL</span><h2>Estudo, treinos e cardio</h2></div><div className="training-badges"><span><Dumbbell size={13} /> {workouts} treinos</span><span><Bike size={13} /> {cardio} min cardio</span></div></div><div className="chart-area"><Bar data={trainingData} options={{ ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, stacked: false } } }} /></div></SystemCard>
      </div>

      <SystemCard className="stats-heatmap" accent="#34d399"><div className="card-head"><div><span>MAPA DE CALOR</span><h2>Consistência de atividade</h2></div><span className="section-counter">ÚLTIMOS {days.length} DIAS</span></div><StatsHeatmap days={days} /></SystemCard>

      <div className="session-records">
        <div className="group-heading"><div><span>REGISTRO RECENTE</span><h2>Sessões de Foco</h2></div><b>{focusSessions.length} SESSÕES</b></div>
        <SystemCard><div className="session-table"><div className="session-table-head"><span>SKILL</span><span>DURAÇÃO</span><span>RECOMPENSA</span><span>CONCLUÍDA EM</span></div>{focusSessions.length === 0 ? <div className="session-empty">Nenhuma sessão concluída. Inicie o Modo Foco para gerar telemetria.</div> : focusSessions.slice(0,8).map(session => <div className="session-table-row" key={session.id}><strong>{skills.find(skill => skill.slug === session.skillSlug)?.name ?? session.skillSlug}</strong><span>{session.actualMinutes} min</span><em>+{session.xpReward} XP</em><span>{new Date(session.completedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>)}</div></SystemCard>
      </div>
    </>
  );
}

function calculateStreak(days: Array<{ date: string; active: boolean }>) {
  const byDate = new Map(days.map(day => [day.date, day.active]));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (byDate.get(key)) streak += 1;
    else if (i > 0 || byDate.has(key)) break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatsHeatmap({ days }: { days: Array<{ id: number; date: string; xp: number; missions: number }> }) {
  const max = Math.max(1, ...days.map(day => day.xp));
  return <div className="stats-heatmap-body"><div className="stats-heatmap-grid">{days.map(day => { const level = day.xp === 0 ? 0 : Math.max(.15, day.xp / max); return <div key={day.id} style={{ background: day.xp ? `rgba(52,211,153,${level})` : "rgba(67,79,114,.14)" }} title={`${day.date}: ${day.xp} XP · ${day.missions} missões`}><span>{day.xp}</span></div>; })}</div><div className="heatmap-legend"><span>Baixa</span>{[.08,.22,.42,.68,.95].map(value => <i key={value} style={{ background: `rgba(52,211,153,${value})` }} />)}<span>Alta atividade</span></div></div>;
}
