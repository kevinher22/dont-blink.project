import React from 'react';
import { Play, Sparkles, Calendar, Trophy, Settings, BarChart2, Coins } from 'lucide-react';
import { sound } from '../services/audio';

interface MainMenuProps {
  bestScore: number;
  totalCoins: number;
  onPlay: () => void;
  onOpenCustomize: () => void;
  onOpenDaily: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  hasDailyRewardReady: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  bestScore,
  totalCoins,
  onPlay,
  onOpenCustomize,
  onOpenDaily,
  onOpenAchievements,
  onOpenSettings,
  onOpenLeaderboard,
  hasDailyRewardReady,
}) => {
  return (
    <div id="main-menu" className="absolute inset-0 flex flex-col justify-between items-center p-6 select-none bg-gradient-to-b from-[#090b14]/75 via-[#0b0e1a]/60 to-[#090b14]/85 backdrop-blur-[2px] z-10">
      {/* Top Bar: Currency & Stats */}
      <div className="w-full max-w-md flex justify-between items-center">
        {/* Total Banked Coins */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/30 shadow-lg">
          <Coins className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <span className="text-base font-extrabold text-amber-300 font-['Chakra_Petch']">
            {totalCoins.toLocaleString()}
          </span>
        </div>

        {/* Settings button */}
        <button
          id="btn-menu-settings"
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenSettings();
          }}
          className="p-2.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 hover:scale-105 active:scale-95 transition-all shadow-lg"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Title & Best Score */}
      <div className="flex flex-col items-center text-center my-auto">
        <div className="inline-block mb-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-bold tracking-widest uppercase">
          ARCADE TIMING SURVIVAL
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white font-['Chakra_Petch'] drop-shadow-[0_0_25px_rgba(6,182,212,0.45)] uppercase">
          DON'T <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">BLINK</span>
        </h1>

        <p className="mt-1 text-sm sm:text-base font-medium tracking-wide text-slate-400">
          HOW LONG CAN YOU LAST?
        </p>

        {/* High Score Badge */}
        <div className="mt-6 inline-flex flex-col items-center px-6 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/60 shadow-xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            BEST SCORE
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-['Chakra_Petch'] tracking-wide">
            {bestScore > 0 ? bestScore.toLocaleString() : '0'}
          </span>
        </div>

        {/* Primary Play Button */}
        <button
          id="btn-menu-play"
          type="button"
          onClick={() => {
            sound.playClick();
            onPlay();
          }}
          className="group relative mt-8 px-12 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 text-white font-black text-xl tracking-wider uppercase font-['Chakra_Petch'] shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white text-white group-hover:translate-x-0.5 transition-transform" />
          <span>PLAY NOW</span>
          <span className="hidden sm:inline-block ml-1 px-2 py-0.5 text-xs bg-black/20 rounded-md border border-white/20 text-white/80">
            SPACE
          </span>
        </button>
      </div>

      {/* Secondary Action Grid */}
      <div className="w-full max-w-md grid grid-cols-4 gap-2 sm:gap-3">
        {/* Customize */}
        <button
          id="btn-menu-customize"
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenCustomize();
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-300 hover:text-white transition-all shadow-md group"
        >
          <Sparkles className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-tight">Skins</span>
        </button>

        {/* Daily Challenge */}
        <button
          id="btn-menu-daily"
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenDaily();
          }}
          className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-300 hover:text-white transition-all shadow-md group"
        >
          {hasDailyRewardReady && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          )}
          <Calendar className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-tight">Daily</span>
        </button>

        {/* Achievements */}
        <button
          id="btn-menu-achievements"
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenAchievements();
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 text-slate-300 hover:text-white transition-all shadow-md group"
        >
          <Trophy className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-tight">Badges</span>
        </button>

        {/* Leaderboard / Personal Hall */}
        <button
          id="btn-menu-leaderboard"
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenLeaderboard();
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-slate-300 hover:text-white transition-all shadow-md group"
        >
          <BarChart2 className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-tight">Records</span>
        </button>
      </div>
    </div>
  );
};
