import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { trpc } from "@/lib/trpc";
import { Award, BookOpenText, BrainCircuit, CalendarDays, Check, ChevronRight, Clock3, Crown, Dumbbell, Flame, Frown, Medal, Orbit, PenLine, Plus, ShieldCheck, Sparkles, Swords, Target, Trophy, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const activityIcons = { mission: Target, level: Zap, attribute: Dumbbell, skill: BrainCircuit, achievement: Trophy, focus: Orbit, boss: Swords, journal: BookOpenText };
const moodMeta = {
  focused: { label: "Focado", icon: Target, color: "#22d3ee" },
  proud: { label: "Orgulhoso", icon: Crown, color: "#fbbf24" },
  neutral: { label: "Neutro", icon: Orbit, color: "#94a3b8" },
  tired: { label: "Cansado", icon: Frown, color: "#818cf8" },
  challenged: { label: "Desafiado", icon: Flame, color: "#fb7185" },
} as const;

export default function Evolution() {
  const utils = trpc.useUtils();
  const query = trpc.evolution.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const [tab, setTab] = useState<"timeline" | "journal" | "records">("timeline");
  const [journalOpen, setJournalOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0,10), title: "", content: "", mood: "focused" as keyof typeof moodMeta });
  const createEntry = trpc.evolution.createJournalEntry.useMutation({
    onSuccess: () => { toast.success("Reflexão adicionada ao grimório."); setJournalOpen(false); setForm({ date: new Date().toISOString().slice(0,10), title: "", content: "", mood: "focused" }); utils.evolution.get.invalidate(); },
    onError: error => toast.error(error.message),
  });

  if (query.isLoading) return <LoadingSector label="RECUPERANDO MEMÓRIAS DO SISTEMA" />;
  if (query.isError || !query.data) return <ErrorSector retry={() => query.refetch()} />;

  const { timeline, entries, attributeHistory, achievements } = query.data;
  const unlocked = achievements.filter(item => item.unlockedAt);
  const totalXp = timeline.reduce((sum, item) => sum + item.xp, 0);
  const attributePoints = attributeHistory.reduce((sum, item) => sum + item.delta, 0);
  const groupedTimeline = groupTimeline(timeline);

  return (
    <>
      <PageHeader eyebrow="ARQUIVO DA ASCENSÃO" title="Evolução" description="Cada missão, recorde e reflexão deixa uma marca. Consulte a linha do tempo para reconhecer o caminho percorrido." action={<button className="system-button" onClick={() => setJournalOpen(true)}><PenLine size={16} /> Novo Registro</button>} />

      <div className="evolution-summary">
        <SystemCard accent="#22d3ee"><Clock3 size={18} /><div><span>EVENTOS REGISTRADOS</span><strong>{timeline.length}</strong></div></SystemCard>
        <SystemCard accent="#8b5cf6"><Zap size={18} /><div><span>XP DOCUMENTADO</span><strong>{totalXp.toLocaleString("pt-BR")}</strong></div></SystemCard>
        <SystemCard accent="#fbbf24"><Trophy size={18} /><div><span>CONQUISTAS</span><strong>{unlocked.length}</strong></div></SystemCard>
        <SystemCard accent="#34d399"><ShieldCheck size={18} /><div><span>PONTOS DE ATRIBUTO</span><strong>+{attributePoints}</strong></div></SystemCard>
      </div>

      <div className="evolution-tabs" role="tablist">
        <button className={tab === "timeline" ? "active" : ""} onClick={() => setTab("timeline")}><Clock3 size={15} /> Timeline</button>
        <button className={tab === "journal" ? "active" : ""} onClick={() => setTab("journal")}><BookOpenText size={15} /> Diário</button>
        <button className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}><Medal size={15} /> Recordes</button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "timeline" && <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <SystemCard className="timeline-panel" accent="#22d3ee">
            <div className="card-head"><div><span>LINHA DE EVENTOS</span><h2>Crônicas da sua evolução</h2></div><span className="section-counter">MAIS RECENTE PRIMEIRO</span></div>
            <div className="timeline-body">
              {timeline.length === 0 ? <div className="timeline-empty"><Clock3 size={28} /><strong>NENHUM EVENTO REGISTRADO</strong><p>Conclua missões e sessões de foco para escrever sua história.</p></div> : groupedTimeline.map(([date, items]) => <section className="timeline-day" key={date}><div className="timeline-date"><strong>{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span></div><div className="timeline-events">{items.map((item,index) => { const Icon = activityIcons[item.type]; return <motion.article key={item.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .05 }} className={`timeline-event event-${item.type}`}><div className="timeline-icon"><Icon size={17} /></div><div><span>{item.type.toUpperCase()}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}<small>{new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></div>{item.xp > 0 && <strong>+{item.xp} XP</strong>}</motion.article>; })}</div></section>)}
            </div>
          </SystemCard>
        </motion.div>}

        {tab === "journal" && <motion.div key="journal" className="journal-grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <SystemCard className="journal-intro" accent="#8b5cf6"><Sparkles size={25} /><span>DIÁRIO DE EVOLUÇÃO</span><h2>Transforme experiência em consciência.</h2><p>Registre o que funcionou, o que precisa mudar e qual será sua próxima decisão. Reflexão também é treinamento.</p><button className="system-button" onClick={() => setJournalOpen(true)}><Plus size={15} /> Escrever reflexão</button></SystemCard>
          <div className="journal-list">
            {entries.length === 0 ? <SystemCard className="journal-empty"><BookOpenText size={27} /><strong>O GRIMÓRIO ESTÁ VAZIO</strong><p>Seu primeiro registro pode começar com uma pequena vitória de hoje.</p></SystemCard> : entries.map((entry,index) => { const meta = moodMeta[entry.mood]; const Icon = meta.icon; return <motion.article className="journal-entry" key={entry.id} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .04,.3) }}><div className="journal-date"><strong>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong><span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}</span></div><div className="journal-copy"><div className="journal-meta"><span style={{ color: meta.color }}><Icon size={13} /> {meta.label}</span><small>{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small></div><h3>{entry.title}</h3><p>{entry.content}</p></div><ChevronRight size={17} /></motion.article>; })}
          </div>
        </motion.div>}

        {tab === "records" && <motion.div key="records" className="records-grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <SystemCard accent="#fbbf24"><div className="card-head"><div><span>TROFÉUS DO SISTEMA</span><h2>Conquistas desbloqueadas</h2></div><Trophy size={17} className="text-amber-300" /></div><div className="records-list">{achievements.map(item => <div className={`record-achievement ${item.unlockedAt ? "unlocked" : "locked"}`} key={item.id}><div><Award size={19} /></div><section><span>{item.rarity.toUpperCase()}</span><strong>{item.title}</strong><p>{item.description}</p><div><i style={{ width: `${Math.min(100,item.progress/item.target*100)}%` }} /></div><small>{item.progress} / {item.target}</small></section>{item.unlockedAt ? <Check size={17} /> : <span>{Math.round(item.progress/item.target*100)}%</span>}</div>)}</div></SystemCard>
          <SystemCard accent="#60a5fa"><div className="card-head"><div><span>ALTERAÇÕES DO NÚCLEO</span><h2>Histórico de atributos</h2></div><ShieldCheck size={17} className="text-blue-300" /></div><div className="attribute-history">{attributeHistory.length === 0 ? <div className="timeline-empty"><ShieldCheck size={25} /><strong>SEM ALTERAÇÕES</strong></div> : attributeHistory.map(item => <div key={item.id}><div className="history-symbol">+{item.delta}</div><section><strong>{item.attributeKey.toUpperCase()}</strong><p>{item.reason}</p></section><time>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</time></div>)}</div></SystemCard>
        </motion.div>}
      </AnimatePresence>

      <AnimatePresence>{journalOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && setJournalOpen(false)}><motion.form className="journal-modal" initial={{ opacity: 0, scale: .95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} onSubmit={e => { e.preventDefault(); createEntry.mutate(form); }}><div className="modal-head"><div><span>NOVO REGISTRO</span><h2>Diário de Evolução</h2></div><button type="button" onClick={() => setJournalOpen(false)}><X size={19} /></button></div><div className="journal-form"><label><span>DATA</span><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label><label><span>ESTADO</span><select value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value as keyof typeof moodMeta })}>{Object.entries(moodMeta).map(([value,meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label><label className="wide"><span>TÍTULO DA REFLEXÃO</span><input required minLength={3} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: O que aprendi hoje" /></label><label className="wide"><span>APRENDIZADOS E REFLEXÕES</span><textarea required minLength={5} rows={9} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Registre vitórias, dificuldades, decisões e o próximo passo..." /></label></div><div className="modal-actions"><button type="button" className="system-button secondary" onClick={() => setJournalOpen(false)}>Cancelar</button><button className="system-button" disabled={createEntry.isPending || form.title.trim().length < 3 || form.content.trim().length < 5}>{createEntry.isPending ? "Registrando..." : "Salvar no grimório"}</button></div></motion.form></motion.div>}</AnimatePresence>
    </>
  );
}

function groupTimeline<T extends { createdAt: Date }>(items: T[]) {
  const map = new Map<string, T[]>();
  items.forEach(item => {
    const key = new Date(item.createdAt).toISOString().slice(0,10);
    map.set(key, [...(map.get(key) ?? []), item]);
  });
  return Array.from(map.entries());
}
