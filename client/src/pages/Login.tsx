import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, Swords, User2 } from "lucide-react";
import { useState } from "react";

type Mode = "login" | "register";

export default function Login() {
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
    },
    onError: err => setError(err.message || "Não foi possível entrar."),
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      setError(null);
      setInfo("Cadastro enviado! Aguarde a liberação do administrador para acessar.");
      setMode("login");
      setPassword("");
    },
    onError: err => setError(err.message || "Não foi possível criar a conta."),
  });

  const pending = login.isPending || register.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!username || !password) return;
    if (mode === "login") {
      login.mutate({ username, password });
    } else {
      register.mutate({ username, password, name: name || undefined });
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  return (
    <div className="system-root min-h-screen flex items-center justify-center px-4 text-foreground">
      <div className="system-grid" aria-hidden="true" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="brand-sigil mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Swords size={22} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">O sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Acesso restrito ao operador." : "Solicite acesso ao Sistema."}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/20 p-1 text-sm">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-md py-1.5 font-medium transition ${mode === "login" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-md py-1.5 font-medium transition ${mode === "register" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Criar conta
          </button>
        </div>

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Usuário
        </label>
        <div className="relative mb-4">
          <User2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="ex.: vinicius.spineli"
            className="focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary/60"
          />
        </div>

        {mode === "register" && (
          <>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nome de exibição (opcional)
            </label>
            <div className="relative mb-4">
              <User2 size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Como você quer ser chamado"
                className="focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary/60"
              />
            </div>
          </>
        )}

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Senha de acesso
        </label>
        <div className="relative">
          <KeyRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary/60"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {info && <p className="mt-3 text-sm text-emerald-400">{info}</p>}

        <button
          type="submit"
          disabled={pending || !username || !password}
          className="system-button mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {mode === "login"
            ? pending ? "Entrando..." : "Entrar no Sistema"
            : pending ? "Enviando..." : "Solicitar acesso"}
        </button>
      </form>
    </div>
  );
}
