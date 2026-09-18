/**
 * Shared Entity Visual Renderer
 * Ensures the mysterious entity has 100% consistent appearance across:
 * - Opening cutscene chase
 * - Gameplay encounters (Encounter A-H)
 * - Look Back mechanic
 * - Ending scenes
 * - Final convergence cutscene
 */

export interface EntityRenderOptions {
  stance?: 'STALKING' | 'CHASING' | 'STANDING' | 'CROSSING' | 'DISSOLVING' | 'GLIDING';
  animClock?: number;
  animTime?: number;
  alpha?: number;
  scale?: number;
  facingRight?: boolean;
  eyeGlowIntensity?: number;
  showRedAura?: boolean;
  blurTendrils?: boolean;
  distanceToPlayer?: number;
}

export function renderConsistentEntity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: EntityRenderOptions
): void {
  const {
    stance = 'STALKING',
    alpha = 1.0,
    scale = 1.0,
    facingRight = true,
    eyeGlowIntensity = 1.0,
    showRedAura = true,
  } = options;
  const animClock = options.animClock ?? options.animTime ?? 0;

  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(x, y);
  ctx.scale(facingRight ? scale : -scale, scale);

  const breath = Math.sin(animClock * 3.5) * 3;
  const tendrilWiggle = Math.sin(animClock * 6) * 8;
  const fastTendril = Math.cos(animClock * 9) * 12;

  // 1. Cast Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.beginPath();
  const shadowWidth = stance === 'CHASING' ? 70 : 50;
  ctx.ellipse(0, 10, shadowWidth, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Crimson Aura & Shadow Glow
  if (showRedAura) {
    const auraPulse = 16 + Math.sin(animClock * 4) * 8;
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = auraPulse;
  }

  // 3. Shroud Body Shape (Towering supernatural silhouette)
  ctx.fillStyle = '#05020c';

  if (stance === 'CHASING') {
    // Leaning aggressively forward into sprint
    ctx.beginPath();
    ctx.moveTo(15, 6);
    ctx.bezierCurveTo(-20 + tendrilWiggle, -20, -50 + fastTendril, -50, -35, -95);
    ctx.bezierCurveTo(-20, -135, 10, -145, 25, -130);
    ctx.bezierCurveTo(45, -100, 40, -40, 30, 6);
    ctx.closePath();
    ctx.fill();

    // Trailing dark smoky tendrils streaming backwards
    ctx.fillStyle = 'rgba(10, 5, 25, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-25, -30);
    ctx.bezierCurveTo(-65 + fastTendril, -35, -95 + tendrilWiggle, -55, -80, -20);
    ctx.bezierCurveTo(-60, -10, -40, -15, -20, -5);
    ctx.closePath();
    ctx.fill();
  } else if (stance === 'STANDING') {
    // Motionless monolithic stance
    ctx.beginPath();
    ctx.moveTo(-28, 8);
    ctx.bezierCurveTo(-34, -40, -26, -110, 0, -135);
    ctx.bezierCurveTo(26, -110, 34, -40, 28, 8);
    ctx.closePath();
    ctx.fill();

    // Subtle breathing cloak
    ctx.fillStyle = '#080314';
    ctx.beginPath();
    ctx.ellipse(0, -60, 20, 55 + breath * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (stance === 'CROSSING') {
    // Elongated horizontal shadowy streak
    ctx.beginPath();
    ctx.moveTo(-60, 4);
    ctx.bezierCurveTo(-30, -50, 20, -120, 60, -90);
    ctx.bezierCurveTo(30, -50, -10, -20, -40, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // Default STALKING / GLIDING stance
    ctx.beginPath();
    ctx.moveTo(-32, 6);
    ctx.bezierCurveTo(-45 + tendrilWiggle, -35, -30, -105, 0, -130);
    ctx.bezierCurveTo(30, -105, 45 - tendrilWiggle, -35, 32, 6);
    ctx.closePath();
    ctx.fill();

    // Organic tendrils extending downward into ground
    ctx.beginPath();
    ctx.moveTo(-20, 4);
    ctx.quadraticCurveTo(-30 + fastTendril, 18, -12, 12);
    ctx.quadraticCurveTo(-5, 8, 0, 6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, 4);
    ctx.quadraticCurveTo(28 - fastTendril, 18, 10, 12);
    ctx.quadraticCurveTo(4, 8, 0, 6);
    ctx.fill();

    // Inner Core Mass
    ctx.fillStyle = '#090418';
    ctx.beginPath();
    ctx.ellipse(0, -65 + breath, 22, 58, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Piercing Crimson Red Eyes
  const eyePulse = Math.min(1.0, Math.max(0.4, 0.75 + Math.sin(animClock * 7) * 0.25 * eyeGlowIntensity));
  ctx.fillStyle = `rgba(239, 68, 68, ${eyePulse})`;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 12 * eyeGlowIntensity;

  let eyeY = -105 + breath;
  let eyeX1 = -8;
  let eyeX2 = 8;

  if (stance === 'CHASING') {
    eyeY = -115 + breath;
    eyeX1 = 5;
    eyeX2 = 18;
  } else if (stance === 'CROSSING') {
    eyeY = -85;
    eyeX1 = 20;
    eyeX2 = 30;
  }

  // Left & Right almond-shaped predatory eyes
  ctx.beginPath();
  ctx.ellipse(eyeX1, eyeY, 4.2, 2.6, -0.15, 0, Math.PI * 2);
  ctx.ellipse(eyeX2, eyeY, 4.2, 2.6, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Subtle intense inner pupil highlight
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = '#fef08a';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(eyeX1 + (facingRight ? 1 : -1), eyeY, 1.2, 0, Math.PI * 2);
  ctx.arc(eyeX2 + (facingRight ? 1 : -1), eyeY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
