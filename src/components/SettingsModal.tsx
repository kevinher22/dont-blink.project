import React, { useState } from 'react';
import { X, Volume2, VolumeX, Music, EyeOff, Shield, RotateCcw, Keyboard, HelpCircle } from 'lucide-react';
import { UserSettings } from '../types';
import { sound } from '../services/audio';
import { purchases } from '../services/purchase';

interface SettingsModalProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onClose,
}) => {
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleSupportPurchase = async () => {
    sound.playClick();
    const res = await purchases.purchase('remove_ads');
    setPurchaseStatus(res.message);
    setTimeout(() => setPurchaseStatus(null), 4000);
  };

  return (
    <div id="settings-modal" className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md z-30 select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h2 className="text-xl font-black text-white uppercase font-['Chakra_Petch'] tracking-wider">
            SETTINGS
          </h2>

          <button
            id="btn-close-settings"
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

        <div className="overflow-y-auto pr-1 my-3 space-y-4 max-h-[70vh]">
          {/* Audio Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              AUDIO PREFERENCES
            </span>

            {/* Sound FX */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-500" />
                )}
                <div>
                  <div className="text-sm font-bold text-white">Sound Effects (SFX)</div>
                  <div className="text-xs text-slate-400">Jumps, orbs, combo chimes</div>
                </div>
              </div>

              <button
                id="toggle-sound-fx"
                type="button"
                onClick={() => {
                  sound.playClick();
                  onUpdateSettings({ soundEnabled: !settings.soundEnabled });
                }}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                  settings.soundEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Music */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Music className={`w-5 h-5 ${settings.musicEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-bold text-white">Arcade Synth Music</div>
                  <div className="text-xs text-slate-400">Procedural 180BPM rhythm loop</div>
                </div>
              </div>

              <button
                id="toggle-music"
                type="button"
                onClick={() => {
                  sound.playClick();
                  const nextVal = !settings.musicEnabled;
                  onUpdateSettings({ musicEnabled: nextVal });
                  sound.toggleMusic(nextVal);
                }}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                  settings.musicEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.musicEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Accessibility */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              ACCESSIBILITY
            </span>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-sm font-bold text-white">Reduced Motion</div>
                  <div className="text-xs text-slate-400">Disable screen shake & heavy particles</div>
                </div>
              </div>

              <button
                id="toggle-reduced-motion"
                type="button"
                onClick={() => {
                  sound.playClick();
                  onUpdateSettings({ reducedMotion: !settings.reducedMotion });
                }}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                  settings.reducedMotion ? 'bg-purple-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Controls Quick Reference */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <Keyboard className="w-4 h-4" />
              <span>HOW TO PLAY & CONTROLS</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1 mt-1 leading-relaxed">
              <div className="flex justify-between">
                <span className="text-slate-400">Jump / Dodge:</span>
                <span className="font-bold text-cyan-300">TAP / CLICK / SPACE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pause / Menu:</span>
                <span className="font-bold text-cyan-300">ESC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restart (at Game Over):</span>
                <span className="font-bold text-cyan-300">SPACE or R</span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Tip: Passing close to obstacles triggers <span className="text-cyan-400 font-bold">Near Miss</span> bonuses! High laser drones can be run under without jumping.
              </div>
            </div>
          </div>

          {/* Supporter / Remove Ads (Monetization Architecture) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-black text-amber-300 font-['Chakra_Petch']">
                  REMOVE ADS & SUPPORTER
                </span>
              </div>
              <span className="text-xs font-black text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">
                $1.99
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Future support badge and zero ad interruptions when monetization goes live.
            </p>

            <button
              id="btn-remove-ads"
              type="button"
              onClick={handleSupportPurchase}
              className="mt-1 py-2 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              UPGRADE STATUS
            </button>

            {purchaseStatus && (
              <div className="text-[11px] text-cyan-300 bg-cyan-950/60 p-2 rounded-lg border border-cyan-500/30">
                {purchaseStatus}
              </div>
            )}
          </div>

          {/* Reset Save Data */}
          <div className="pt-2">
            {showConfirmReset ? (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/40 flex flex-col items-center text-center gap-2">
                <span className="text-xs text-red-300 font-bold">
                  Reset high score, coins, and records permanently?
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setShowConfirmReset(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    YES, RESET ALL
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="btn-reset-data"
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-500/30 text-xs font-bold tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RESET LOCAL PROGRESS</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
