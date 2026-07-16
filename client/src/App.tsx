import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SystemShell from "@/components/SystemShell";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Evolution from "@/pages/Evolution";
import FocusMode from "@/pages/FocusMode";
import Login from "@/pages/Login";
import Missions from "@/pages/Missions";
import NotFound from "@/pages/NotFound";
import Statistics from "@/pages/Statistics";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

function Router() {
  return (
    <SystemShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/missoes" component={Missions} />
        <Route path="/foco" component={FocusMode} />
        <Route path="/estatisticas" component={Statistics} />
        <Route path="/evolucao" component={Evolution} />
        <Route component={NotFound} />
      </Switch>
    </SystemShell>
  );
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="system-root min-h-screen flex items-center justify-center text-foreground">
        <div className="system-grid" aria-hidden="true" />
        <Loader2 className="relative z-10 animate-spin text-primary" size={28} />
      </div>
    );
  }

  return isAuthenticated ? <Router /> : <Login />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <AuthGate />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
