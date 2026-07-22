import { nextRankProgress } from "@shared/progression";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useState } from "react";

/**
 * Badge de nível clicável. Ao clicar, abre um popover mostrando quanto falta
 * (níveis e XP) para o próximo rank — o rank é derivado do nível.
 */
export function RankLevelBadge({ level, currentXp, rank }: { level: number; currentXp: number; rank: string }) {
  const [open, setOpen] = useState(false);
  const progress = nextRankProgress(level, currentXp);

  return (
    <div className="rank-level-badge-wrap">
      <button
        type="button"
        className="hero-level-badge rank-level-badge"
        aria-expanded={open}
        aria-label="Ver progresso para o próximo rank"
        title="Ver progresso para o próximo rank"
        onClick={() => setOpen(value => !value)}
      >
        <span>LV</span>
        <strong>{level}</strong>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="rank-progress-catch" onClick={() => setOpen(false)} />
            <motion.div
              className="rank-progress-pop"
              initial={{ opacity: 0, y: -6, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: .96 }}
              transition={{ duration: .16 }}
            >
              <div className="rank-progress-head"><ChevronUp size={13} /><span>PROGRESSO DE RANK</span></div>
              <div className="rank-progress-now"><small>RANK ATUAL</small><strong>{rank}</strong><em>Nível {level}</em></div>
              {progress ? (
                <>
                  <div className="rank-progress-next">
                    <span>Próximo rank</span>
                    <b>{progress.rank}</b>
                    <span>no nível {progress.targetLevel}</span>
                  </div>
                  <ul className="rank-progress-stats">
                    <li><span>Faltam</span><strong>{progress.levelsRemaining} {progress.levelsRemaining === 1 ? "nível" : "níveis"}</strong></li>
                    <li><span>XP restante</span><strong>≈ {Math.round(progress.xpRemaining).toLocaleString("pt-BR")} XP</strong></li>
                  </ul>
                </>
              ) : (
                <p className="rank-progress-max">Rank máximo alcançado — você é um Monarca.</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
