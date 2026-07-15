import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SystemShell from "@/components/SystemShell";
import Dashboard from "@/pages/Dashboard";
import Evolution from "@/pages/Evolution";
import FocusMode from "@/pages/FocusMode";
import Missions from "@/pages/Missions";
import NotFound from "@/pages/NotFound";
import Statistics from "@/pages/Statistics";
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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Router />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
