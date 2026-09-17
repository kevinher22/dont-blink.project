import React, { useState } from 'react';
import { RotateCcw, Share2, Sparkles, Trophy, Home, Check, Flame, Coins } from 'lucide-react';
import { sound } from '../services/audio';

interface GameOverModalProps {
  score: number;
  bestScore: number;
  combo: number;
  coinsEarned: number;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onOpenCustomize: () => void;
  onOpenAchievements: () => void;
  onBackToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  bestScore,
  combo,
  coinsEarned,
  isNewRecord,
  onPlayAgain,
  onOpenCustomize,
  onOpenAchievements,
  onBackToMenu,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    sound.playClick();
    const shareText = `⚡ I just scored ${score.toLocaleString()} with a x${combo} combo in DON'T BLINK! Can you beat me?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "DON'T BLINK Arcade Record",
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard if user dismissed share dialog
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div id="game-over-modal" className="absolute inset-0 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md z-30 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center text-center">
        {/* Record Badge or Game Over Header */}
        {isNewRecord ? (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/50 text-amber-400 text-xs font-black tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>NEW RECORD!</span>
          </div>
        ) : (
          <div className="text-xs font-bold tracking-widest text-red-400/90 uppercase mb-2">
            RUN COMPLETE
          </div>
        )}

        <h2 className="text-4xl font-black tracking-tight text-white font-['Chakra_Petch'] uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
          GAME OVER
        </h2>

        <p className="text-xs text-slate-400 font-medium mt-1">
          CAN YOU BEAT THIS?
        </p>

        {/* Score Breakdown Card */}
        <div className="w-full my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-3">
          {/* Main Run Score */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase">
              FINAL SCORE
            </span>
            <span className="text-4xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
            {/* Best Score */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">BEST</span>
              <span className="text-base font-extrabold text-amber-400 font-['Chakra_Petch']">
                {bestScore.toLocaleString()}
              </span>
            </div>

            {/* Max Combo */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">MAX COMBO</span>
              <span className="text-base font-extrabold text-cyan-300 font-['Chakra_Petch']">
                x{combo}
              </span>
            </div>

            {/* Coins Earned */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ORBS</span>
              <span className="text-base font-extrabold text-emerald-400 font-['Chakra_Petch'] flex items-center gap-0.5">
                <Coins className="w-3.5 h-3.5 text-amber-400 inline" />
                +{coinsEarned}
              </span>
            </div>
          </div>
        </div>

        {/* Primary 1-Tap Play Again Action */}
        <button
          id="btn-play-again"
          type="button"
          onClick={() => {
            sound.playClick();
            onPlayAgain();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-white font-black text-lg tracking-wider font-['Chakra_Petch'] shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:shadow-[0_0_35px_rgba(6,182,212,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer uppercase"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
          <span>PLAY AGAIN</span>
          <span className="text-xs px-2 py-0.5 rounded bg-black/25 text-white/90 border border-white/20">
            SPACE
          </span>
        </button>

        {/* Share Score Button */}
        <button
          id="btn-share-score"
          type="button"
          onClick={handleShare}
          className="w-full mt-2.5 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">COPIED TO CLIPBOARD!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>SHARE SCORE</span>
            </>
          )}
        </button>

        {/* Secondary Navigation Row */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            id="btn-result-customize"
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenCustomize();
            }}
            className="flex flex-col items-center py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 mb-0.5" />
            <span className="text-[10px] font-bold">Skins</span>
          </button>

          <button
            id="btn-result-achievements"
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenAchievements();
            }}
            className="flex flex-col items-center py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Trophy className="w-4 h-4 text-purple-400 mb-0.5" />
            <span className="text-[10px] font-bold">Badges</span>
          </button>

          <button
            id="btn-result-menu"
            type="button"
            onClick={() => {
              sound.playClick();
              onBackToMenu();
            }}
            className="flex flex-col items-center py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400 mb-0.5" />
            <span className="text-[10px] font-bold">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
