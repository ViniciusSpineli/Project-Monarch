import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { RankLevelBadge } from "@/components/RankLevelBadge";
import { rankImages } from "@/lib/rankImages";
import { trpc } from "@/lib/trpc";
import { Crown, Flame, Gauge, Swords, Zap } from "lucide-react";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// Card holográfico: inclina em 3D seguindo o cursor/dedo, com brilho refletindo.
function TiltCard({ children }: { children: React.ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-16, 16]), { stiffness: 170, damping: 20 });
  const rotateX = useSpring(useTransform(py, [0, 1], [11, -11]), { stiffness: 170, damping: 20 });
  const glareX = useTransform(px, value => `${value * 100}%`);
  const glareY = useTransform(py, value => `${value * 100}%`);
  const glareOpacity = useSpring(useMotionValue(0), { stiffness: 200, damping: 26 });
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(190,242,255,.32), rgba(139,92,246,.08) 38%, transparent 62%)`;

  const handleMove = (event: React.PointerEvent) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    px.set(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
    py.set(Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)));
    glareOpacity.set(1);
  };
  const reset = () => { px.set(0.5); py.set(0.5); glareOpacity.set(0); };

  return (
    <div className="tilt-scene" ref={sceneRef} onPointerMove={handleMove} onPointerLeave={reset} onPointerCancel={reset}>
      <motion.div className="tilt-card" style={{ rotateX, rotateY }}>
        {children}
        <motion.div className="tilt-glare" style={{ background: glareBackground, opacity: glareOpacity }} />
      </motion.div>
    </div>
  );
}

export default function FocusMode() {
  const dashboard = trpc.dashboard.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const statistics = trpc.statistics.get.useQuery(undefined, { refetchOnWindowFocus: false });

  if (dashboard.isLoading || statistics.isLoading) return <LoadingSector label="INVOCANDO O CAÇADOR" />;
  if (dashboard.isError || !dashboard.data) return <ErrorSector retry={() => dashboard.refetch()} />;
  if (statistics.isError || !statistics.data) return <ErrorSector retry={() => statistics.refetch()} />;

  const character = dashboard.data.character;
  const attributes = statistics.data.attributes;
  const portrait = rankImages[character.rank];
  const xpPercent = Math.min(100, Math.round((character.currentXp / character.xpForNextLevel) * 100));
  const maxAttribute = Math.max(10, ...attributes.map(item => item.value));

  const radarData = {
    labels: attributes.map(item => item.label),
    datasets: [
      {
        label: "Atributos",
        data: attributes.map(item => item.value),
        borderColor: "#67e8f9",
        backgroundColor: "rgba(34,211,238,.14)",
        pointBackgroundColor: attributes.map(item => item.color),
        pointBorderColor: "#0b1022",
        pointRadius: 4,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "rgba(10,13,29,.96)", borderColor: "rgba(103,232,249,.25)", borderWidth: 1, titleColor: "#e6faff", bodyColor: "#9baaca", padding: 12 },
    },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMax: maxAttribute,
        grid: { color: "rgba(110,133,183,.14)" },
        angleLines: { color: "rgba(110,133,183,.14)" },
        pointLabels: { color: "#9baaca", font: { size: 11, weight: 700 as const } },
        ticks: { display: false },
      },
    },
  };

  return (
    <>
      <PageHeader eyebrow="CÂMARA DO CAÇADOR" title="Sala de Evolução" description="O Sistema projeta o mais forte do seu rank atual. Evolua seus atributos para reivindicar o próximo trono." />
      <div className="hunter-layout">
        <SystemCard className="hunter-portrait-card" accent="#22d3ee">
          <div className="focus-scanlines" />
          <TiltCard>
            <div className="hunter-portrait">
              {portrait ? (
                <motion.img
                  key={character.rank}
                  src={portrait}
                  alt={`O mais forte do Rank ${character.rank}`}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: .6, ease: [0.23, 1, 0.32, 1] }}
                />
              ) : (
                <div className="hunter-portrait-fallback"><span>{character.rank?.[0]?.toUpperCase() ?? "?"}</span></div>
              )}
              <div className="hunter-portrait-glow" />
              <div className="hunter-rank-tag"><span>RANK</span><strong>{character.rank}</strong></div>
              <RankLevelBadge level={character.level} currentXp={character.currentXp} rank={character.rank} />
            </div>
          </TiltCard>
          <div className="hunter-portrait-info">
            <div className="hero-title"><Crown size={15} /> {character.title}</div>
            <div className="xp-block">
              <div className="xp-label"><span>EXPERIÊNCIA</span><strong>{character.currentXp.toLocaleString("pt-BR")} <small>/ {character.xpForNextLevel.toLocaleString("pt-BR")} XP</small></strong></div>
              <div className="xp-track"><motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .8, ease: [0.23, 1, 0.32, 1] }} /><div className="xp-flare" style={{ left: `${xpPercent}%` }} /></div>
              <div className="xp-meta"><span>{xpPercent}% para o próximo nível</span><span>{character.totalXp.toLocaleString("pt-BR")} XP total</span></div>
            </div>
            <div className="hero-stats"><div><span>SEQUÊNCIA</span><strong><Flame size={13} /> {character.streak}d</strong></div><div><span>RECORDE</span><strong>{character.longestStreak}d</strong></div><div><span>XP TOTAL</span><strong><Zap size={13} /> {character.totalXp.toLocaleString("pt-BR")}</strong></div></div>
          </div>
        </SystemCard>

        <div className="hunter-side">
          <SystemCard className="hunter-radar-card" accent="#8b5cf6">
            <div className="card-head"><div><span>LEITURA DO SISTEMA</span><h2>Radar de atributos</h2></div><Gauge size={17} className="text-violet-300" /></div>
            <div className="hunter-radar-area"><Radar data={radarData} options={radarOptions} /></div>
          </SystemCard>

          <SystemCard className="hunter-attributes-card" accent="#34d399">
            <div className="card-head"><div><span>NÚCLEO VITAL</span><h2>Atributos</h2></div><Swords size={17} className="text-emerald-300" /></div>
            <div className="hunter-attribute-list">
              {attributes.map((attribute, index) => (
                <motion.div className="hunter-attribute" key={attribute.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .05 }}>
                  <span style={{ color: attribute.color }}>{attribute.label}</span>
                  <div className="hunter-attribute-track"><i style={{ width: `${Math.round((attribute.value / maxAttribute) * 100)}%`, background: attribute.color }} /></div>
                  <strong>{attribute.value}</strong>
                </motion.div>
              ))}
            </div>
          </SystemCard>
        </div>
      </div>
    </>
  );
}
