import { trpc } from "@/lib/trpc";
import { KeyRound, Loader2, Swords } from "lucide-react";
import { useState } from "react";

export default function Login() {
  const utils = trpc.useUtils();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
    },
    onError: err => {
      setError(
        err.data?.code === "UNAUTHORIZED"
          ? "Senha incorreta. Tente novamente."
          : err.message || "Não foi possível entrar."
      );
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    login.mutate({ password });
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
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito ao operador.</p>
        </div>

        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Senha de acesso
        </label>
        <div className="relative">
          <KeyRound
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="focus-ring w-full rounded-lg border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-primary/60"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={login.isPending || !password}
          className="system-button mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {login.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
          {login.isPending ? "Entrando..." : "Entrar no Sistema"}
        </button>
      </form>
    </div>
  );
}
