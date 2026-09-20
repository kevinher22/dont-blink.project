import React, { useEffect, useState } from 'react';
import { X, BarChart2, Award, Clock, Flame, Coins } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { leaderboardService } from '../services/leaderboard';
import { sound } from '../services/audio';

interface LeaderboardModalProps {
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    leaderboardService.getTopScores().then(setEntries);
  }, []);

  return (
    <div id="leaderboard-modal" className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md z-30 select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-xl font-black text-white uppercase font-['Chakra_Petch'] tracking-wider">
                PERSONAL HALL OF FAME
              </h2>
              <span className="text-[10px] text-emerald-400/90 font-bold uppercase tracking-wider block">
                LOCAL RECORDS
              </span>
            </div>
          </div>

          <button
            id="btn-close-leaderboard"
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice of local architecture ready for online switch */}
        <div className="my-3 px-3.5 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
          Showing your top personal runs saved on this device. Ready for global online leaderboard sync in v2!
        </div>

        {/* Top 5 list */}
        <div className="overflow-y-auto pr-1 space-y-2 max-h-[58vh]">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No runs recorded yet. Jump into a game to claim your first record!
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const dateStr = new Date(entry.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={entry.id}
                  id={`record-entry-${rank}`}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    rank === 1
                      ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm font-['Chakra_Petch'] ${
                        rank === 1
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{rank}
                    </div>

                    <div>
                      <div className="text-base font-extrabold text-white font-['Chakra_Petch']">
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-cyan-400" /> x{entry.combo}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-slate-500" /> {Math.round(entry.durationSeconds)}s
                        </span>
                        <span>•</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                    <Coins className="w-3 h-3" />
                    <span>+{entry.coinsEarned}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
