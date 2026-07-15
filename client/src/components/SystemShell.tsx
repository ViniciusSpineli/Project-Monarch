import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenText,
  Check,
  ChevronRight,
  Crosshair,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Target,
  TimerReset,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navItems = [
  { path: "/", label: "Painel", icon: LayoutDashboard, exact: true },
  { path: "/missoes", label: "Missões", icon: ScrollText },
  { path: "/foco", label: "Modo Foco", icon: Crosshair },
  { path: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { path: "/evolucao", label: "Evolução", icon: BookOpenText },
];

const notificationIcons = {
  level: Zap,
  skill: Sparkles,
  achievement: Shield,
  streak: Flame,
  title: Swords,
  mission: Target,
  system: Activity,
} as const;

export default function SystemShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { logout, loggingOut } = useAuth();
  const dashboard = trpc.dashboard.get.useQuery(undefined, { staleTime: 20_000, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const hero = dashboard.data?.character;
  const notifications = dashboard.data?.notifications ?? [];
  const activeLabel = navItems.find(item => item.exact ? location === item.path : location.startsWith(item.path))?.label ?? "Sistema";

  return (
    <div className="system-root min-h-screen text-foreground">
      <div className="system-grid" aria-hidden="true" />
      <aside className="system-sidebar hidden lg:flex">
        <Link href="/" className="system-brand focus-ring">
          <div className="brand-sigil"><Swords size={18} /></div>
          <div>
            <strong>O SISTEMA</strong>
            <span>v.07</span>
          </div>
        </Link>
        <div className="sidebar-rank">
          <span>RANK ATUAL</span>
          <strong>{hero?.rank ?? "—"}</strong>
          <div><i style={{ width: `${hero ? Math.min(100, (hero.level / 15) * 100) : 0}%` }} /></div>
        </div>
        <nav className="system-nav" aria-label="Navegação principal">
          {navItems.map(item => {
            const active = item.exact ? location === item.path : location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path} className={`nav-item focus-ring ${active ? "active" : ""}`}>
                <item.icon size={18} />
                <span>{item.label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <div className="status-dot" />
          <div><span>SISTEMA</span><strong>ONLINE</strong></div>
          <button
            className="icon-btn ml-auto"
            onClick={() => logout()}
            disabled={loggingOut}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="lg:pl-[260px] min-h-screen">
        <header className="system-topbar">
          <button className="icon-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className="topbar-context">
            <span>SETOR ATIVO</span>
            <strong>{activeLabel.toUpperCase()}</strong>
          </div>
          <div className="topbar-actions">
            <div className="hidden sm:flex system-chip"><Flame size={15} /><span>{hero?.streak ?? 0} dias</span></div>
            <div className="hidden sm:flex system-chip xp-chip"><Zap size={15} /><span>{hero?.totalXp?.toLocaleString("pt-BR") ?? "—"} XP</span></div>
            <div className="relative">
              <button className="icon-btn" onClick={() => setNotificationsOpen(value => !value)} aria-label="Notificações">
                <Bell size={19} />
                {notifications.length > 0 && <b className="notification-count">{notifications.length}</b>}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div className="notification-panel" initial={{ opacity: 0, y: -8, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .97 }} transition={{ duration: .18 }}>
                    <div className="panel-heading"><div><span>TRANSMISSÕES</span><strong>Notificações do Sistema</strong></div><button onClick={() => setNotificationsOpen(false)} aria-label="Fechar"><X size={17} /></button></div>
                    <div className="notification-list">
                      {notifications.length === 0 ? <div className="empty-mini"><Check size={20} /><span>Nenhum alerta pendente.</span></div> : notifications.map(note => {
                        const Icon = notificationIcons[note.type];
                        return <div className={`notification-item note-${note.type}`} key={note.id}><div className="note-icon"><Icon size={16} /></div><div><strong>{note.title}</strong><p>{note.message}</p><span>{new Date(note.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div></div>;
                      })}
                    </div>
                    {notifications.length > 0 && <button className="panel-action" onClick={() => markRead.mutate()} disabled={markRead.isPending}><Check size={15} /> Marcar transmissões como lidas</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="hero-mini"><div className="hero-mini-avatar">C</div><div className="hidden md:block"><span>NÍVEL {hero?.level ?? "—"}</span><strong>{hero?.title ?? "Sincronizando..."}</strong></div></div>
          </div>
        </header>
        <main className="system-content">{children}</main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button className="mobile-overlay lg:hidden" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="mobile-drawer lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: .24, ease: [0.23, 1, 0.32, 1] }}>
              <div className="drawer-head"><Link href="/" className="system-brand" onClick={() => setMobileOpen(false)}><div className="brand-sigil"><Swords size={18} /></div><div><strong>O SISTEMA</strong><span>MOBILE</span></div></Link><button className="icon-btn" onClick={() => setMobileOpen(false)}><X size={19} /></button></div>
              <nav className="system-nav">
                {navItems.map(item => <Link key={item.path} href={item.path} onClick={() => setMobileOpen(false)} className={`nav-item ${location === item.path ? "active" : ""}`}><item.icon size={18} /><span>{item.label}</span><ChevronRight size={14} /></Link>)}
                <button className="nav-item" onClick={() => { setMobileOpen(false); logout(); }} disabled={loggingOut}><LogOut size={18} /><span>Sair</span></button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <nav className="mobile-bottom-nav lg:hidden" aria-label="Navegação móvel">
        {navItems.map(item => {
          const active = item.exact ? location === item.path : location.startsWith(item.path);
          return <Link key={item.path} href={item.path} className={active ? "active" : ""}><item.icon size={19} /><span>{item.label === "Estatísticas" ? "Stats" : item.label === "Modo Foco" ? "Foco" : item.label}</span></Link>;
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-header"><div><span className="eyebrow"><TimerReset size={13} /> {eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function SystemCard({ children, className = "", accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  return <section className={`system-card ${className}`} style={accent ? { "--card-accent": accent } as React.CSSProperties : undefined}>{children}</section>;
}

export function LoadingSector({ label = "SINCRONIZANDO SETOR" }: { label?: string }) {
  return <div className="loading-sector"><div className="loading-rings"><span /><span /><span /></div><strong>{label}</strong><p>Aguarde a resposta do Sistema.</p></div>;
}

export function ErrorSector({ retry }: { retry: () => void }) {
  return <div className="loading-sector error-sector"><Shield size={28} /><strong>FALHA DE SINCRONIZAÇÃO</strong><p>O setor não respondeu ao chamado.</p><button className="system-button" onClick={retry}>Tentar novamente</button></div>;
}
