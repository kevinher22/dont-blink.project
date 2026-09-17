import React from 'react';
import { Pause, Volume2, VolumeX, Music, Coins } from 'lucide-react';
import { sound } from '../services/audio';

interface HUDProps {
  score: number;
  combo: number;
  multiplier: number;
  bestScore: number;
  coinsEarned: number;
  isPaused: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  showTutorialHint: boolean;
  onPauseToggle: () => void;
  onSoundToggle: () => void;
  onMusicToggle: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  multiplier,
  bestScore,
  coinsEarned,
  soundEnabled,
  musicEnabled,
  showTutorialHint,
  onPauseToggle,
  onSoundToggle,
  onMusicToggle,
}) => {
  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Score & Multiplier */}
        <div className="flex flex-col">
          <div className="text-[11px] font-bold tracking-widest text-cyan-400/80 uppercase">
            Score
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-white tracking-wider font-['Chakra_Petch'] drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
            {score.toLocaleString()}
          </div>

          {/* Combo Multiplier Badge */}
          {multiplier > 1 && (
            <div
              id="combo-badge"
              className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-lg ${
                multiplier >= 5
                  ? 'bg-gradient-to-r from-amber-500 to-red-500 text-white shadow-red-500/40 animate-pulse'
                  : multiplier >= 3
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-cyan-500/30'
                  : 'bg-cyan-900/70 border border-cyan-400/40 text-cyan-300'
              }`}
            >
              <span>COMBO</span>
              <span className="text-sm font-black">x{multiplier}</span>
            </div>
          )}
        </div>

        {/* Center: Best Score */}
        <div className="hidden sm:flex flex-col items-center bg-slate-900/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Best Record
          </div>
          <div className="text-base font-bold text-amber-400 font-['Chakra_Petch']">
            {Math.max(score, bestScore).toLocaleString()}
          </div>
        </div>

        {/* Right: Coins & Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Run coins */}
          <div className="flex items-center gap-1.5 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-400 shadow-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold font-['Chakra_Petch']">+{coinsEarned}</span>
          </div>

          {/* Audio Quick Toggles */}
          <button
            id="btn-quick-sound"
            type="button"
            onClick={() => {
              sound.playClick();
              onSoundToggle();
            }}
            className="p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>

          <button
            id="btn-quick-music"
            type="button"
            onClick={() => {
              sound.playClick();
              onMusicToggle();
            }}
            className={`p-2 rounded-xl bg-slate-900/70 backdrop-blur-md border border-slate-700/60 transition-colors ${
              musicEnabled ? 'text-cyan-400 border-cyan-500/40' : 'text-slate-500'
            }`}
            title={musicEnabled ? 'Stop Music' : 'Start Music'}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Pause Button */}
          <button
            id="btn-pause"
            type="button"
            onClick={() => {
              sound.playClick();
              onPauseToggle();
            }}
            className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white hover:bg-slate-800 transition-colors"
            title="Pause Game (ESC)"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Brief Natural Tutorial Hint (Section 31: TAP TO DODGE, disappears quickly) */}
      {showTutorialHint && (
        <div className="self-center mb-16 flex flex-col items-center animate-bounce duration-700 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-sm md:text-base font-black tracking-wider text-cyan-300 font-['Chakra_Petch'] uppercase">
              TAP OR PRESS SPACE TO JUMP
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
