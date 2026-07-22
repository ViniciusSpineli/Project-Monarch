import { ErrorSector, LoadingSector, PageHeader, SystemCard } from "@/components/SystemShell";
import { trpc } from "@/lib/trpc";
import { isSkillProtocolMission } from "@shared/systemMissions";
import { CalendarDays, CalendarPlus, Check, ChevronDown, ChevronUp, Clock3, Copy, Edit3, Filter, Plus, Search, ShieldAlert, Sparkles, Target, Trash2, X, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type MissionForm = {
  title: string;
  description: string;
  type: "daily" | "weekly" | "monthly" | "unique" | "epic" | "challenge" | "secret";
  category: string;
  xpReward: number;
  durationMinutes: number;
  skillSlug: string | null;
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string;
};

const today = () => new Date().toISOString().slice(0, 10);
// Data local (evita o shift de fuso do toISOString) com deslocamento de dias.
const localDateKey = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const emptyMission: MissionForm = { title: "", description: "", type: "daily", category: "Disciplina", xpReward: 50, durationMinutes: 30, skillSlug: null, priority: "medium", dueDate: today() };
const typeLabels: Record<string, string> = { daily: "Diária", weekly: "Semanal", monthly: "Mensal", unique: "Única", epic: "Épica", challenge: "Desafio", secret: "Secreta" };

export default function Missions() {
  const utils = trpc.useUtils();
  const query = trpc.missions.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [group, setGroup] = useState<"none" | "type" | "category" | "status">("none");
  const [sort, setSort] = useState<"newest" | "xp" | "priority" | "due">("newest");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; id?: number; data: MissionForm } | null>(null);
  // Clonar missão para outra data: guarda a missão alvo e o dia escolhido (padrão: amanhã).
  const [cloneTarget, setCloneTarget] = useState<{ id: number; title: string } | null>(null);
  const [cloneDate, setCloneDate] = useState(() => localDateKey(1));
  // Filtro de dia do quadro: abre já no dia atual; vazio = todas as datas.
  // Também é a data usada para gerar rotina retroativa.
  const [dayFilter, setDayFilter] = useState(() => localDateKey());
  // Card de filtros recolhível: aberto por padrão, minimizável pela setinha.
  const [filtersOpen, setFiltersOpen] = useState(true);

  const invalidate = () => { utils.missions.list.invalidate(); utils.dashboard.get.invalidate(); };
  const backfill = trpc.missions.backfillDay.useMutation({
    onSuccess: rows => {
      toast.success(`Missões de ${new Date(`${dayFilter}T12:00:00`).toLocaleDateString("pt-BR")} prontas (${rows.length}). Marque as que você concluiu!`);
      invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const create = trpc.missions.create.useMutation({ onSuccess: () => { toast.success("Nova missão registrada."); setModal(null); invalidate(); }, onError: e => toast.error(e.message) });
  const update = trpc.missions.update.useMutation({ onSuccess: () => { toast.success("Missão recalibrada."); setModal(null); invalidate(); }, onError: e => toast.error(e.message) });
  const remove = trpc.missions.delete.useMutation({ onSuccess: () => { toast.success("Missão removida do registro."); invalidate(); }, onError: e => toast.error(e.message) });
  const duplicate = trpc.missions.duplicate.useMutation({ onSuccess: () => { toast.success("Missão duplicada."); invalidate(); }, onError: e => toast.error(e.message) });
  const clone = trpc.missions.duplicate.useMutation({
    onSuccess: mission => { toast.success(`Missão clonada para ${new Date(`${mission.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}.`); setCloneTarget(null); invalidate(); },
    onError: e => toast.error(e.message),
  });
  const complete = trpc.missions.complete.useMutation({ onSuccess: result => { toast.success(`Missão concluída: +${result.mission.xpReward} XP`); invalidate(); }, onError: e => toast.error(e.message) });
  const uncomplete = trpc.missions.uncomplete.useMutation({ onSuccess: () => { toast("Conclusão desfeita — XP e progresso revertidos."); invalidate(); }, onError: e => toast.error(e.message) });

  const missions = useMemo(() => {
    const source = [...(query.data ?? [])];
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return source.filter(item => {
      const matchesSearch = `${item.title} ${item.description ?? ""} ${item.category}`.toLowerCase().includes(search.toLowerCase());
      const matchesDay = !dayFilter || item.dueDate === dayFilter;
      return matchesSearch && matchesDay && (status === "all" || item.status === status) && (type === "all" || item.type === type);
    }).sort((a, b) => {
      // Missões do Sistema sempre no topo, independente da ordenação escolhida.
      const systemFirst = Number(b.isSystem) - Number(a.isSystem);
      if (systemFirst) return systemFirst;
      if (sort === "xp") return b.xpReward - a.xpReward;
      if (sort === "priority") return priorityOrder[b.priority] - priorityOrder[a.priority];
      if (sort === "due") return a.dueDate.localeCompare(b.dueDate);
      return b.id - a.id;
    });
  }, [query.data, search, status, type, sort, dayFilter]);

  const groups = useMemo(() => {
    if (group === "none") return [["Todas as missões", missions]] as const;
    const map = new Map<string, typeof missions>();
    missions.forEach(item => {
      const key = group === "type" ? typeLabels[item.type] : group === "category" ? item.category : item.status === "completed" ? "Concluídas" : item.status === "expired" ? "Expiradas" : "Ativas";
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries());
  }, [missions, group]);

  if (query.isLoading) return <LoadingSector label="CARREGANDO QUADRO DE MISSÕES" />;
  if (query.isError) return <ErrorSector retry={() => query.refetch()} />;

  const active = query.data?.filter(item => item.status === "active").length ?? 0;
  const completed = query.data?.filter(item => item.status === "completed").length ?? 0;
  const totalXp = query.data?.filter(item => item.status === "completed").reduce((sum, item) => sum + item.xpReward, 0) ?? 0;

  return (
    <>
      <PageHeader eyebrow="QUADRO DE OPERAÇÕES" title="Missões" description="Crie, organize e conclua objetivos. O Sistema converte execução real em experiência mensurável." action={<button className="system-button" onClick={() => setModal({ mode: "create", data: { ...emptyMission, dueDate: today() } })}><Plus size={16} /> Nova Missão</button>} />

      <div className="mission-stat-grid">
        <SystemCard><Target size={18} /><div><span>MISSÕES ATIVAS</span><strong>{active}</strong></div></SystemCard>
        <SystemCard accent="#34d399"><Check size={18} /><div><span>CONCLUÍDAS</span><strong>{completed}</strong></div></SystemCard>
        <SystemCard accent="#8b5cf6"><Zap size={18} /><div><span>XP CONQUISTADO</span><strong>{totalXp.toLocaleString("pt-BR")}</strong></div></SystemCard>
        <SystemCard accent="#f59e0b"><Sparkles size={18} /><div><span>TAXA DE CONCLUSÃO</span><strong>{active + completed ? Math.round(completed / (active + completed) * 100) : 0}%</strong></div></SystemCard>
      </div>

      <SystemCard className={`mission-control-card${filtersOpen ? "" : " collapsed"}`}>
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div className="mission-controls" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .22 }}>
              <label className="search-field"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar missões, categorias..." /></label>
              <label className="select-field"><Filter size={14} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos os status</option><option value="active">Ativas</option><option value="completed">Concluídas</option><option value="expired">Expiradas</option></select><ChevronDown size={13} /></label>
              <label className="select-field"><select value={type} onChange={e => setType(e.target.value)}><option value="all">Todos os tipos</option>{Object.entries(typeLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={13} /></label>
              <label className="select-field"><select value={group} onChange={e => setGroup(e.target.value as typeof group)}><option value="none">Sem agrupamento</option><option value="type">Agrupar por tipo</option><option value="category">Agrupar por categoria</option><option value="status">Agrupar por status</option></select><ChevronDown size={13} /></label>
              <label className="select-field"><select value={sort} onChange={e => setSort(e.target.value as typeof sort)}><option value="newest">Mais recentes</option><option value="xp">Maior XP</option><option value="priority">Prioridade</option><option value="due">Prazo</option></select><ChevronDown size={13} /></label>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="backfill-row">
          <CalendarDays size={15} />
          <span>
            {dayFilter
              ? <>Mostrando as missões de <b>{new Date(`${dayFilter}T12:00:00`).toLocaleDateString("pt-BR")}</b>. Marque o que concluiu — o XP conta nesse dia.</>
              : <>Escolha uma data para ver e preencher as missões daquele dia (o XP conta na data escolhida). Sem data, o quadro mostra todas.</>}
          </span>
          <input type="date" value={dayFilter} max={localDateKey()} onChange={e => setDayFilter(e.target.value)} aria-label="Filtrar missões por data" />
          {dayFilter && (
            <button type="button" className="system-button secondary" onClick={() => setDayFilter("")}>
              Todas as datas
            </button>
          )}
          <button type="button" className="system-button" disabled={backfill.isPending || !dayFilter} onClick={() => backfill.mutate({ date: dayFilter })}>
            {backfill.isPending ? "Gerando..." : "Gerar missões do dia"}
          </button>
          <button
            type="button"
            className="filters-toggle"
            aria-expanded={filtersOpen}
            aria-label={filtersOpen ? "Minimizar filtros" : "Expandir filtros"}
            title={filtersOpen ? "Minimizar filtros" : "Expandir filtros"}
            onClick={() => setFiltersOpen(open => !open)}
          >
            {filtersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </SystemCard>

      <div className="mission-groups">
        {groups.map(([label, items]) => <section className="mission-group" key={label}>
          <div className="group-heading"><div><span>SETOR</span><h2>{label}</h2></div><b>{items.length} REGISTROS</b></div>
          <div className="mission-list-full">
            {items.length === 0 ? <SystemCard className="missions-empty"><Target size={27} /><strong>NENHUM SINAL ENCONTRADO</strong><p>Ajuste os filtros ou registre uma nova missão.</p></SystemCard> : items.map((mission, index) => <motion.article className={`mission-card-full status-${mission.status} priority-${mission.priority}`} key={mission.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .03, .25) }}>
              <button
                className="mission-check"
                aria-label={mission.status === "completed" ? `Desfazer conclusão de ${mission.title}` : `Concluir ${mission.title}`}
                title={mission.status === "completed" ? "Desfazer conclusão" : "Concluir missão"}
                disabled={mission.status === "expired" || complete.isPending || uncomplete.isPending}
                onClick={() => mission.status === "completed" ? uncomplete.mutate({ id: mission.id }) : complete.mutate({ id: mission.id })}
              ><Check size={16} /></button>
              <div className="mission-content-full">
                <div className="mission-labels"><span>{typeLabels[mission.type]}</span><span>{mission.category}</span><em>{mission.priority}</em>{isSkillProtocolMission(mission) ? <b className="system-mission-tag">MISSÃO DO SISTEMA</b> : mission.isSystem && <b>SISTEMA</b>}</div>
                <h3>{mission.title}</h3>
                {mission.description && <p>{mission.description}</p>}
                <div className="mission-metadata"><span><Clock3 size={13} /> {mission.durationMinutes} min</span><span><Target size={13} /> {new Date(`${mission.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</span><strong><Zap size={13} /> +{mission.xpReward} XP</strong></div>
              </div>
              <div className="mission-actions">
                <button title="Duplicar" onClick={() => duplicate.mutate({ id: mission.id })}><Copy size={15} /></button>
                <button title="Clonar para outro dia" onClick={() => { setCloneDate(localDateKey(1)); setCloneTarget({ id: mission.id, title: mission.title }); }}><CalendarPlus size={15} /></button>
                <button title="Editar" onClick={() => setModal({ mode: "edit", id: mission.id, data: { title: mission.title, description: mission.description ?? "", type: mission.type, category: mission.category, xpReward: mission.xpReward, durationMinutes: mission.durationMinutes, skillSlug: mission.skillSlug, priority: mission.priority, dueDate: mission.dueDate } })}><Edit3 size={15} /></button>
                {!mission.isSystem && <button title="Excluir" className="delete" onClick={() => { if (window.confirm("Remover esta missão do registro?")) remove.mutate({ id: mission.id }); }}><Trash2 size={15} /></button>}
              </div>
            </motion.article>)}
          </div>
        </section>)}
      </div>
      <MissionModal modal={modal} setModal={setModal} onSubmit={data => modal?.mode === "edit" && modal.id ? update.mutate({ id: modal.id, data }) : create.mutate(data)} pending={create.isPending || update.isPending} />

      <AnimatePresence>
        {cloneTarget && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && setCloneTarget(null)}>
            <motion.form className="mission-modal clone-modal" initial={{ opacity: 0, scale: .95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 8 }} transition={{ duration: .2 }} onSubmit={e => { e.preventDefault(); clone.mutate({ id: cloneTarget.id, dueDate: cloneDate }); }}>
              <div className="modal-head"><div><span>REPLICAR CONTRATO</span><h2>Clonar missão</h2></div><button type="button" onClick={() => setCloneTarget(null)}><X size={19} /></button></div>
              <div className="modal-fields">
                <p className="clone-mission-name"><Copy size={14} /> {cloneTarget.title}</p>
                <label className="field-wide"><span>CLONAR PARA O DIA</span><input type="date" required value={cloneDate} onChange={e => setCloneDate(e.target.value)} /></label>
              </div>
              <div className="modal-actions"><button type="button" className="system-button secondary" onClick={() => setCloneTarget(null)}>Cancelar</button><button className="system-button" disabled={clone.isPending || !cloneDate}>{clone.isPending ? "Clonando..." : "Clonar missão"}</button></div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MissionModal({ modal, setModal, onSubmit, pending }: { modal: { mode: "create" | "edit"; id?: number; data: MissionForm } | null; setModal: (value: null | { mode: "create" | "edit"; id?: number; data: MissionForm }) => void; onSubmit: (data: MissionForm) => void; pending: boolean }) {
  const [form, setForm] = useState<MissionForm>(emptyMission);
  // Skills reais do usuário para o vínculo (cacheadas pelo dashboard).
  const dashboard = trpc.dashboard.get.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false });
  const skillOptions = dashboard.data?.skills ?? [];
  const activeKey = modal ? `${modal.mode}-${modal.id ?? "new"}` : "closed";
  return <AnimatePresence>{modal && <motion.div key={activeKey} className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && setModal(null)}><motion.form className="mission-modal" initial={{ opacity: 0, scale: .95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 8 }} transition={{ duration: .22 }} onSubmit={e => { e.preventDefault(); onSubmit(form === emptyMission ? modal.data : form); }} onAnimationStart={() => setForm(modal.data)}>
    <div className="modal-head"><div><span>{modal.mode === "create" ? "NOVO CONTRATO" : "RECALIBRAR CONTRATO"}</span><h2>{modal.mode === "create" ? "Criar missão" : "Editar missão"}</h2></div><button type="button" onClick={() => setModal(null)}><X size={19} /></button></div>
    <div className="modal-fields">
      <label className="field-wide"><span>NOME DA MISSÃO</span><input required minLength={3} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Dominar o primeiro capítulo" /></label>
      <label className="field-wide"><span>DESCRIÇÃO</span><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Defina o objetivo e a condição de vitória." /></label>
      <label><span>TIPO</span><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as MissionForm["type"] })}>{Object.entries(typeLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>CATEGORIA</span><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
      <label><span>PRIORIDADE</span><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as MissionForm["priority"] })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
      <label><span>DATA LIMITE</span><input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></label>
      <label><span>RECOMPENSA XP</span><input type="number" min={5} max={5000} value={form.xpReward} onChange={e => setForm({ ...form, xpReward: Number(e.target.value) })} /></label>
      <label><span>DURAÇÃO (MIN)</span><input type="number" min={0} max={1440} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></label>
      <label className="field-wide"><span>SKILL VINCULADA</span><select value={form.skillSlug ?? "none"} onChange={e => setForm({ ...form, skillSlug: e.target.value === "none" ? null : e.target.value })}><option value="none">Nenhuma skill</option>{skillOptions.map(skill => <option value={skill.slug} key={skill.id}>{skill.name} — Nv. {skill.level}</option>)}</select></label>
    </div>
    <div className="modal-actions"><button type="button" className="system-button secondary" onClick={() => setModal(null)}>Cancelar</button><button className="system-button" disabled={pending || form.title.trim().length < 3}>{pending ? "Sincronizando..." : modal.mode === "create" ? "Registrar missão" : "Salvar alterações"}</button></div>
  </motion.form></motion.div>}</AnimatePresence>;
}
