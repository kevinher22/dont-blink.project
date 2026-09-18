import { SkinId } from '../types';
import { AVAILABLE_SKINS } from './constants';
import { drawRoundRect } from '../utils/canvasHelper';

export type CharacterAction = 'idle' | 'run' | 'jump' | 'hit' | 'celebrate' | 'look_back';

export function renderCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  action: CharacterAction,
  skinId: SkinId,
  animTime: number,
  scale: number = 1
) {
  const skin = AVAILABLE_SKINS.find((s) => s.id === skinId) || AVAILABLE_SKINS[0];
  const { primary, secondary, accent, glow } = skin.colors;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Apply hit, look_back, or celebration transform
  let tilt = 0;
  let bounce = 0;
  let alpha = 1;

  if (action === 'run') {
    bounce = Math.sin(animTime * 14) * 3;
    tilt = 0.08;
  } else if (action === 'jump') {
    tilt = -0.22;
    bounce = 0;
  } else if (action === 'look_back') {
    tilt = -0.05;
    bounce = Math.sin(animTime * 6) * 1.5;
  } else if (action === 'hit') {
    tilt = (animTime * 12) % (Math.PI * 2);
    alpha = 0.7 + Math.sin(animTime * 20) * 0.3;
  } else if (action === 'celebrate') {
    bounce = Math.abs(Math.sin(animTime * 8)) * -10;
    tilt = Math.sin(animTime * 6) * 0.1;
  } else {
    // idle
    bounce = Math.sin(animTime * 3) * 1.5;
  }

  if (skinId === 'ghost') {
    ctx.globalAlpha = 0.85 * alpha;
  } else {
    ctx.globalAlpha = alpha;
  }

  ctx.translate(0, bounce);
  ctx.rotate(tilt);

  // --- Glow shadow ---
  ctx.shadowColor = glow;
  ctx.shadowBlur = skinId === 'neon' || skinId === 'golden' ? 16 : 8;

  // --- Back Thruster / Cape / Trail ---
  if (action === 'run' || action === 'jump') {
    ctx.save();
    ctx.fillStyle = accent;
    ctx.beginPath();
    const trailLen = action === 'jump' ? 18 : 10 + Math.sin(animTime * 20) * 4;
    ctx.moveTo(-12, 6);
    ctx.lineTo(-12 - trailLen, 10);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Torso / Chassis ---
  ctx.fillStyle = primary;
  if (skinId === 'pixel') {
    ctx.fillRect(-12, -4, 24, 28);
    ctx.fillStyle = secondary;
    ctx.fillRect(-10, -2, 20, 10);
  } else {
    ctx.beginPath();
    drawRoundRect(ctx, -12, -4, 24, 28, 8);
    ctx.fill();

    // Chest emblem / plate
    ctx.fillStyle = secondary;
    ctx.beginPath();
    drawRoundRect(ctx, -8, 0, 16, 16, 4);
    ctx.fill();
  }

  // --- Head & Visor ---
  ctx.fillStyle = primary;
  if (skinId === 'pixel') {
    ctx.fillRect(-10, -24, 20, 18);
  } else {
    ctx.beginPath();
    drawRoundRect(ctx, -10, -24, 20, 18, 6);
    ctx.fill();
  }

  // Robot antenna or Golden Crown
  if (skinId === 'robot') {
    ctx.fillStyle = secondary;
    ctx.fillRect(-2, -30, 4, 6);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -32, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (skinId === 'golden') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-8, -24);
    ctx.lineTo(-10, -32);
    ctx.lineTo(-4, -28);
    ctx.lineTo(0, -34);
    ctx.lineTo(4, -28);
    ctx.lineTo(10, -32);
    ctx.lineTo(8, -24);
    ctx.closePath();
    ctx.fill();
  }

  // Visor (The "Eye")
  const visorColor = action === 'look_back' ? '#ef4444' : accent;
  ctx.fillStyle = visorColor;
  ctx.shadowColor = visorColor;
  ctx.shadowBlur = action === 'look_back' ? 14 : 10;

  if (action === 'look_back') {
    // Eye swivels to stare backwards into the darkness behind
    ctx.beginPath();
    drawRoundRect(ctx, -9, -18, 10, 6, 3);
    ctx.fill();

    // Pupil looking behind
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-6, -15, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (skinId === 'pixel') {
    ctx.fillRect(0, -18, 8, 5);
  } else if (skinId === 'ghost') {
    // Ethereal dual eyes
    ctx.beginPath();
    ctx.arc(1, -16, 3, 0, Math.PI * 2);
    ctx.arc(6, -16, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Futuristic cyber visor
    ctx.beginPath();
    drawRoundRect(ctx, -2, -18, 11, 6, 3);
    ctx.fill();
  }

  // Reset shadow for limbs
  ctx.shadowBlur = 0;

  // --- Limbs / Legs ---
  if (action === 'run') {
    const legPhase = animTime * 16;
    const leg1Y = Math.sin(legPhase) * 7;
    const leg2Y = Math.sin(legPhase + Math.PI) * 7;
    const leg1X = Math.cos(legPhase) * 6;
    const leg2X = Math.cos(legPhase + Math.PI) * 6;

    // Back leg
    ctx.fillStyle = secondary;
    ctx.fillRect(-6 + leg2X, 24, 5, 12 + leg2Y);
    ctx.fillStyle = accent;
    ctx.fillRect(-4 + leg2X, 34 + leg2Y, 7, 4);

    // Front leg
    ctx.fillStyle = primary;
    ctx.fillRect(2 + leg1X, 24, 5, 12 + leg1Y);
    ctx.fillStyle = accent;
    ctx.fillRect(4 + leg1X, 34 + leg1Y, 7, 4);
  } else if (action === 'jump') {
    ctx.fillStyle = secondary;
    ctx.fillRect(-7, 22, 5, 8);
    ctx.fillRect(1, 20, 5, 7);
    ctx.fillStyle = accent;
    ctx.fillRect(-5, 29, 6, 3);
    ctx.fillRect(3, 26, 6, 3);
  } else if (action === 'look_back') {
    // Hesitant stride turned backward
    ctx.fillStyle = secondary;
    ctx.fillRect(-5, 24, 5, 13);
    ctx.fillStyle = primary;
    ctx.fillRect(1, 24, 5, 13);
    ctx.fillStyle = accent;
    ctx.fillRect(-6, 36, 6, 3);
    ctx.fillRect(0, 36, 6, 3);
  } else if (action === 'hit') {
    ctx.fillStyle = secondary;
    ctx.fillRect(-12, 20, 6, 12);
    ctx.fillRect(6, 20, 6, 12);
  } else if (action === 'celebrate') {
    ctx.fillStyle = primary;
    ctx.fillRect(-6, 24, 5, 14);
    ctx.fillRect(2, 24, 5, 14);
    ctx.fillStyle = accent;
    ctx.fillRect(-16, -14, 5, 14);
    ctx.fillRect(11, -14, 5, 14);
  } else {
    ctx.fillStyle = secondary;
    ctx.fillRect(-6, 24, 5, 14);
    ctx.fillStyle = primary;
    ctx.fillRect(2, 24, 5, 14);
    ctx.fillStyle = accent;
    ctx.fillRect(-4, 36, 6, 3);
    ctx.fillRect(4, 36, 6, 3);
  }

  ctx.restore();
}
