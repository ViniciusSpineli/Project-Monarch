import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenText,
  Check,
  ChevronRight,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Target,
  TimerReset,
  UserCheck,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const navItems = [
  { path: "/", label: "Painel", icon: LayoutDashboard, exact: true },
  { path: "/missoes", label: "Missões", icon: ScrollText },
  { path: "/foco", label: "Caçador", icon: Swords },
  { path: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { path: "/evolucao", label: "Evolução", icon: BookOpenText },
];

// Trilha ambiente do Sistema (DARK ARIA <LV2>). Coloque o MP3 em client/public/audio/.
const AMBIENT_TRACK = "/audio/dark-aria.wav";
const MUSIC_MUTED_KEY = "system-music-muted";

function useAmbientMusic() {
  const [muted, setMuted] = useState(() => localStorage.getItem(MUSIC_MUTED_KEY) === "1");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const audio = new Audio(AMBIENT_TRACK);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = "auto";
    audioRef.current = audio;

    const tryPlay = () => {
      if (!mutedRef.current) audio.play().catch(() => {});
    };
    // Navegadores bloqueiam autoplay com som: tenta já e destrava na primeira interação.
    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { once: true });
    window.addEventListener("keydown", tryPlay, { once: true });

    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const toggleMuted = () => {
    setMuted(previous => {
      const next = !previous;
      localStorage.setItem(MUSIC_MUTED_KEY, next ? "1" : "0");
      const audio = audioRef.current;
      if (audio) {
        if (next) audio.pause();
        else audio.play().catch(() => {});
      }
      return next;
    });
  };

  return { muted, toggleMuted };
}

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const { user, logout, loggingOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { muted, toggleMuted } = useAmbientMusic();
  const dashboard = trpc.dashboard.get.useQuery(undefined, { staleTime: 20_000, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const markRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.dashboard.get.invalidate(),
  });
  const isAdmin = user?.role === "admin";
  const pendingUsers = trpc.admin.pendingUsers.useQuery(undefined, { enabled: isAdmin, refetchOnWindowFocus: false });
  const pendingCount = pendingUsers.data?.length ?? 0;
  const setUserStatus = trpc.admin.setUserStatus.useMutation({
    onSuccess: updated => {
      toast.success(updated?.status === "approved" ? `Acesso liberado para ${updated?.username}.` : "Cadastro negado.");
      utils.admin.pendingUsers.invalidate();
      utils.dashboard.get.invalidate();
    },
    onError: e => toast.error(e.message),
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
            <button
              className={`icon-btn ${muted ? "music-off" : "music-on"}`}
              onClick={toggleMuted}
              aria-label={muted ? "Ativar trilha do Sistema" : "Silenciar trilha do Sistema"}
              title={muted ? "Ativar trilha do Sistema" : "Silenciar trilha do Sistema"}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
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
            <div className="relative">
              <button className="hero-mini profile-trigger" onClick={() => setProfileOpen(value => !value)} aria-label="Menu do operador">
                <div className="hero-mini-avatar">{(user?.username?.[0] ?? "C").toUpperCase()}</div>
                <div className="hidden md:block"><span>NÍVEL {hero?.level ?? "—"}</span><strong>Caçador {user?.username ?? "—"}</strong></div>
                {isAdmin && pendingCount > 0 && <b className="notification-count">{pendingCount}</b>}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div className="profile-menu" initial={{ opacity: 0, y: -8, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .97 }} transition={{ duration: .16 }}>
                    {isAdmin && (
                      <button className="profile-item" onClick={() => { setApprovalsOpen(true); setProfileOpen(false); }}>
                        <UserCheck size={16} /><span>Aprovações pendentes</span>{pendingCount > 0 && <b>{pendingCount}</b>}
                      </button>
                    )}
                    <button className="profile-item" onClick={() => toggleTheme?.()}>
                      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                      <span>{theme === "dark" ? "Modo branco" : "Modo noturno"}</span>
                    </button>
                    <button className="profile-item danger" onClick={() => { setProfileOpen(false); logout(); }} disabled={loggingOut}>
                      <LogOut size={16} /><span>Sair do SISTEMA</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
          return <Link key={item.path} href={item.path} className={active ? "active" : ""}><item.icon size={19} /><span>{item.label === "Estatísticas" ? "Stats" : item.label}</span></Link>;
        })}
      </nav>

      <AnimatePresence>
        {approvalsOpen && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && setApprovalsOpen(false)}>
            <motion.div className="approvals-modal" initial={{ opacity: 0, scale: .96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 8 }} transition={{ duration: .2 }}>
              <div className="modal-head"><div><span>CONTROLE DE ACESSO</span><h2>Aprovações pendentes</h2></div><button type="button" onClick={() => setApprovalsOpen(false)}><X size={19} /></button></div>
              <div className="approvals-list">
                {pendingUsers.isLoading ? (
                  <div className="empty-mini"><Activity size={20} /><span>Carregando cadastros...</span></div>
                ) : pendingCount === 0 ? (
                  <div className="empty-mini"><Check size={20} /><span>Nenhum cadastro pendente.</span></div>
                ) : (
                  (pendingUsers.data ?? []).map(candidate => candidate && (
                    <div className="approval-item" key={candidate.id}>
                      <div className="approval-info"><strong>{candidate.username}</strong>{candidate.name && candidate.name !== candidate.username && <span>{candidate.name}</span>}</div>
                      <div className="approval-actions">
                        <button className="approve" disabled={setUserStatus.isPending} onClick={() => setUserStatus.mutate({ userId: candidate.id, status: "approved" })}><Check size={15} /> Aprovar</button>
                        <button className="reject" disabled={setUserStatus.isPending} onClick={() => setUserStatus.mutate({ userId: candidate.id, status: "rejected" })}><X size={15} /> Negar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
