import React, { useRef, useEffect, useState } from 'react';
import { X, Lock, Check, Sparkles, Coins } from 'lucide-react';
import { SkinId, Skin } from '../types';
import { AVAILABLE_SKINS } from '../game/constants';
import { renderCharacter } from '../game/characterRenderer';
import { sound } from '../services/audio';

interface CustomizeModalProps {
  currentSkin: SkinId;
  unlockedSkins: SkinId[];
  totalCoins: number;
  onSelectSkin: (id: SkinId) => void;
  onBuySkin: (id: SkinId, cost: number) => void;
  onClose: () => void;
}

export const CustomizeModal: React.FC<CustomizeModalProps> = ({
  currentSkin,
  unlockedSkins,
  totalCoins,
  onSelectSkin,
  onBuySkin,
  onClose,
}) => {
  const [previewSkin, setPreviewSkin] = useState<SkinId>(currentSkin);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Canvas Character Preview Loop
  useEffect(() => {
    let animId: number;
    let clock = 0;

    const render = () => {
      clock += 0.02;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw subtle platform
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(20, 110);
          ctx.lineTo(160, 110);
          ctx.stroke();

          // Render character scaled up for preview
          renderCharacter(ctx, 90, 85, 'run', previewSkin, clock, 1.4);
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [previewSkin]);

  const activeSkinData = AVAILABLE_SKINS.find((s) => s.id === previewSkin) || AVAILABLE_SKINS[0];
  const isUnlocked = unlockedSkins.includes(previewSkin);
  const isEquipped = currentSkin === previewSkin;
  const canAfford = totalCoins >= activeSkinData.cost;

  return (
    <div id="customize-modal" className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md z-30 select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-black text-white uppercase font-['Chakra_Petch'] tracking-wider">
              SKIN LOCKER
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-amber-500/40 text-amber-400">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-black font-['Chakra_Petch']">{totalCoins.toLocaleString()}</span>
            </div>

            <button
              id="btn-close-customize"
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
        </div>

        {/* Live Preview Display Card */}
        <div className="flex flex-col items-center my-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
          <canvas
            ref={canvasRef}
            width={180}
            height={130}
            className="w-[180px] h-[130px]"
          />

          <div className="text-center mt-1">
            <h3 className="text-lg font-black text-white tracking-wide font-['Chakra_Petch'] uppercase">
              {activeSkinData.name}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mt-0.5 leading-relaxed">
              {activeSkinData.description}
            </p>
          </div>

          {/* Action button for previewed skin */}
          <div className="mt-3 w-full max-w-xs">
            {isUnlocked ? (
              <button
                id="btn-equip-skin"
                type="button"
                disabled={isEquipped}
                onClick={() => {
                  sound.playClick();
                  onSelectSkin(previewSkin);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase font-['Chakra_Petch'] flex items-center justify-center gap-2 transition-all ${
                  isEquipped
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default'
                    : 'bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:from-cyan-400 hover:to-sky-400 shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isEquipped ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>EQUIPPED</span>
                  </>
                ) : (
                  <span>EQUIP SKIN</span>
                )}
              </button>
            ) : (
              <button
                id="btn-buy-skin"
                type="button"
                disabled={!canAfford}
                onClick={() => {
                  sound.playAchievement();
                  onBuySkin(previewSkin, activeSkinData.cost);
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-black text-sm tracking-wider uppercase font-['Chakra_Petch'] flex items-center justify-center gap-2 transition-all ${
                  canAfford
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>UNLOCK FOR {activeSkinData.cost} ORBS</span>
              </button>
            )}
          </div>
        </div>

        {/* Skins Grid */}
        <div className="overflow-y-auto pr-1 space-y-2 max-h-56">
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SKINS.map((skin: Skin) => {
              const unlocked = unlockedSkins.includes(skin.id);
              const equipped = currentSkin === skin.id;
              const isSelected = previewSkin === skin.id;

              return (
                <button
                  key={skin.id}
                  id={`skin-item-${skin.id}`}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPreviewSkin(skin.id);
                    if (unlocked) {
                      onSelectSkin(skin.id);
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: skin.colors.primary, boxShadow: `0 0 8px ${skin.colors.glow}` }}
                    />
                    {equipped ? (
                      <span className="text-[10px] font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        ACTIVE
                      </span>
                    ) : unlocked ? (
                      <span className="text-[10px] font-bold text-slate-400">
                        OWNED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {skin.cost}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="text-xs font-black text-white font-['Chakra_Petch']">
                      {skin.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-3">
          Skins are purely cosmetic and provide no gameplay advantage.
        </p>
      </div>
    </div>
  );
};
