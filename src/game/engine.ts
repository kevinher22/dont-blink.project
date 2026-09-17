import {
  GameState,
  Obstacle,
  Collectible,
  Particle,
  FloatingText,
  SkinId,
  CollectibleType,
  ObstacleType,
} from '../types';
import { GAME_CONSTANTS } from './constants';
import { renderCharacter, CharacterAction } from './characterRenderer';
import { sound } from '../services/audio';
import { drawRoundRect } from '../utils/canvasHelper';

export interface GameCallbacks {
  onScoreUpdate: (score: number, combo: number, multiplier: number) => void;
  onCoinCollected: (coinsTotal: number, earned: number) => void;
  onGameOver: (finalScore: number, maxCombo: number, coinsEarned: number, durationSec: number) => void;
  onNewRecord: (score: number) => void;
  onAchievementProgress: (event: string, value: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;

  // Animation Loop
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Game State
  private state: GameState = 'MENU';
  private skinId: SkinId = 'default';
  private runDuration: number = 0;
  private score: number = 0;
  private coinsEarnedThisRun: number = 0;
  private comboCount: number = 0;
  private maxComboThisRun: number = 1;
  private comboTimer: number = 0;
  private currentSpeed: number = GAME_CONSTANTS.INITIAL_SPEED;
  private distanceTraveled: number = 0;
  private obstaclesDodgedCount: number = 0;
  private isRecordBeaten: boolean = false;
  private personalBest: number = 0;

  // Player Physics
  private playerY: number = GAME_CONSTANTS.GROUND_Y;
  private playerVy: number = 0;
  private isGrounded: boolean = true;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private characterAction: CharacterAction = 'idle';
  private hitTime: number = 0;

  // Entities
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private nextObstacleSpawnDist: number = 320;
  private nextCollectibleSpawnDist: number = 200;
  private nextEntityId: number = 1;

  // Screen shake & FX
  private shakeIntensity: number = 0;
  private animClock: number = 0;

  // Reduced motion
  private reducedMotion: boolean = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not obtain 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    this.setupCanvasDimensions();
  }

  public setPersonalBest(best: number): void {
    this.personalBest = best;
  }

  public setSkin(skin: SkinId): void {
    this.skinId = skin;
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public setupCanvasDimensions(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const displayWidth = rect.width > 0 ? rect.width : (this.canvas.parentElement?.clientWidth || GAME_CONSTANTS.BASE_WIDTH);
    const displayHeight = rect.height > 0 ? rect.height : (this.canvas.parentElement?.clientHeight || GAME_CONSTANTS.BASE_HEIGHT);

    const targetW = Math.max(320, Math.floor(displayWidth * dpr));
    const targetH = Math.max(180, Math.floor(displayHeight * dpr));

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
  }

  public applyTransform(): void {
    if (typeof this.ctx.resetTransform === 'function') {
      this.ctx.resetTransform();
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const scaleX = this.canvas.width / GAME_CONSTANTS.BASE_WIDTH;
    const scaleY = this.canvas.height / GAME_CONSTANTS.BASE_HEIGHT;
    this.ctx.scale(scaleX, scaleY);
  }

  // --- Controls & Inputs ---

  public handleAction(): void {
    if (this.state !== 'PLAYING') return;

    // Buffer jump if airborne
    this.jumpBufferTimer = 0.12;

    if (this.isGrounded || this.coyoteTimer > 0) {
      this.executeJump();
    }
  }

  private executeJump(): void {
    this.playerVy = GAME_CONSTANTS.JUMP_FORCE;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.characterAction = 'jump';

    sound.playJump();

    // Spawn jump dust particles
    if (!this.reducedMotion) {
      for (let i = 0; i < 7; i++) {
        this.particles.push({
          x: GAME_CONSTANTS.PLAYER_X - 10 + Math.random() * 20,
          y: GAME_CONSTANTS.GROUND_Y + 12,
          vx: -2 - Math.random() * 3,
          vy: -1 - Math.random() * 2,
          color: 'rgba(103, 232, 249, 0.7)',
          size: 3 + Math.random() * 3,
          alpha: 1,
          life: 0,
          maxLife: 0.25,
          shape: 'circle',
        });
      }
    }
  }

  // --- Game Lifecycle ---

  public start(): void {
    this.stop(); // Ensure no dual loop

    this.state = 'PLAYING';
    this.isPaused = false;
    this.isRunning = true;
    this.runDuration = 0;
    this.score = 0;
    this.coinsEarnedThisRun = 0;
    this.comboCount = 0;
    this.maxComboThisRun = 1;
    this.comboTimer = 0;
    this.currentSpeed = GAME_CONSTANTS.INITIAL_SPEED;
    this.distanceTraveled = 0;
    this.obstaclesDodgedCount = 0;
    this.isRecordBeaten = false;

    this.playerY = GAME_CONSTANTS.GROUND_Y;
    this.playerVy = 0;
    this.isGrounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.characterAction = 'run';
    this.hitTime = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.nextObstacleSpawnDist = 380; // Safe breathing room at start
    this.nextCollectibleSpawnDist = 200;
    this.shakeIntensity = 0;

    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);

    this.callbacks.onAchievementProgress('game_started', 1);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      if (!this.animFrameId) {
        this.animFrameId = requestAnimationFrame(this.loop);
      }
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public renderMenuPreview(): void {
    this.animClock += 0.016;
    this.applyTransform();
    this.ctx.save();
    this.drawBackground(0);
    this.drawGround();
    // Render idle or running character
    renderCharacter(
      this.ctx,
      GAME_CONSTANTS.PLAYER_X,
      GAME_CONSTANTS.GROUND_Y,
      'run',
      this.skinId,
      this.animClock
    );
    this.ctx.restore();
  }

  // --- Main Loop ---

  private loop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // cap delta time to 50ms
    this.lastTime = timestamp;

    if (!this.isPaused) {
      this.update(dt);
    }

    this.render();

    if (this.isRunning) {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  };

  // --- Update Step ---

  private update(dt: number): void {
    this.animClock += dt;
    this.runDuration += dt;

    if (this.state === 'PLAYING') {
      // 1. Difficulty & Speed Scaling (Smooth, no sudden spikes)
      this.currentSpeed = Math.min(
        GAME_CONSTANTS.MAX_SPEED,
        GAME_CONSTANTS.INITIAL_SPEED + this.runDuration * GAME_CONSTANTS.SPEED_ACCELERATION
      );

      const frameDist = this.currentSpeed * 60 * dt;
      this.distanceTraveled += frameDist;

      // 2. Score progression by survival
      const prevScore = this.score;
      this.score += GAME_CONSTANTS.SURVIVAL_SCORE_PER_SEC * this.getMultiplier() * dt;

      // Check new record
      if (this.personalBest > 0 && this.score > this.personalBest && !this.isRecordBeaten) {
        this.isRecordBeaten = true;
        sound.playNewRecord();
        this.callbacks.onNewRecord(Math.floor(this.score));
        this.addFloatingText('🔥 NEW RECORD!', GAME_CONSTANTS.PLAYER_X + 20, GAME_CONSTANTS.GROUND_Y - 80, '#facc15', 22);
      }

      if (Math.floor(this.score) !== Math.floor(prevScore)) {
        this.callbacks.onScoreUpdate(Math.floor(this.score), this.comboCount, this.getMultiplier());
      }

      // Check survival achievements
      this.callbacks.onAchievementProgress('survival_time', this.runDuration);
      this.callbacks.onAchievementProgress('current_score', Math.floor(this.score));

      // 3. Player Physics
      this.updatePlayerPhysics(dt);

      // 4. Combo Decay
      if (this.comboCount > 0) {
        this.comboTimer -= dt * 1000;
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
          this.callbacks.onScoreUpdate(Math.floor(this.score), 0, 1);
        }
      }

      // 5. Spawning
      this.handleSpawning(frameDist);

      // 6. Obstacles Update & Collision
      this.updateObstacles(frameDist);

      // 7. Collectibles Update & Collection
      this.updateCollectibles(frameDist);
    } else if (this.state === 'GAME_OVER') {
      // Game over hit animation decay
      this.hitTime += dt;
      this.playerY += this.playerVy;
      this.playerVy += GAME_CONSTANTS.GRAVITY * 0.8;
      if (this.playerY > GAME_CONSTANTS.GROUND_Y + 40) {
        this.playerY = GAME_CONSTANTS.GROUND_Y + 40;
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt * 60;
      ft.alpha -= dt * 1.2;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Shake decay
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= GAME_CONSTANTS.SHAKE_DECAY;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }
  }

  private updatePlayerPhysics(dt: number): void {
    this.playerVy += GAME_CONSTANTS.GRAVITY;
    this.playerY += this.playerVy;

    // Ground check
    if (this.playerY >= GAME_CONSTANTS.GROUND_Y) {
      this.playerY = GAME_CONSTANTS.GROUND_Y;
      this.playerVy = 0;

      // Landing dust
      if (!this.isGrounded) {
        this.isGrounded = true;
        this.characterAction = 'run';
        if (!this.reducedMotion) {
          for (let i = 0; i < 4; i++) {
            this.particles.push({
              x: GAME_CONSTANTS.PLAYER_X - 6 + Math.random() * 12,
              y: GAME_CONSTANTS.GROUND_Y + 12,
              vx: (Math.random() - 0.5) * 4,
              vy: -0.5 - Math.random() * 1.5,
              color: 'rgba(255, 255, 255, 0.5)',
              size: 2 + Math.random() * 2,
              alpha: 0.8,
              life: 0,
              maxLife: 0.2,
              shape: 'circle',
            });
          }
        }

        // Check buffered jump
        if (this.jumpBufferTimer > 0) {
          this.executeJump();
        }
      }
    } else {
      this.isGrounded = false;
      this.coyoteTimer -= dt;
      this.jumpBufferTimer -= dt;
      this.characterAction = 'jump';
    }
  }

  private handleSpawning(frameDist: number): void {
    // 1. Obstacle Spawning
    this.nextObstacleSpawnDist -= frameDist;
    if (this.nextObstacleSpawnDist <= 0) {
      this.spawnObstacle();

      // Dynamic spacing based on speed
      const baseSpacing = Math.max(
        GAME_CONSTANTS.MIN_OBSTACLE_SPACING,
        GAME_CONSTANTS.MAX_OBSTACLE_SPACING - this.runDuration * 2.2
      );
      this.nextObstacleSpawnDist = baseSpacing + Math.random() * 160;
    }

    // 2. Collectible Spawning
    this.nextCollectibleSpawnDist -= frameDist;
    if (this.nextCollectibleSpawnDist <= 0) {
      this.spawnCollectible();
      this.nextCollectibleSpawnDist = 180 + Math.random() * 240;
    }
  }

  private spawnObstacle(): void {
    const isLateGame = this.runDuration > 25;
    const isVeryLate = this.runDuration > 55;

    let type: ObstacleType = 'BARRIER_LOW';
    const rand = Math.random();

    if (isVeryLate) {
      if (rand < 0.35) type = 'BARRIER_LOW';
      else if (rand < 0.6) type = 'BARRIER_TALL';
      else if (rand < 0.85) type = 'LASER_HIGH';
      else type = 'ENERGY_GATE';
    } else if (isLateGame) {
      if (rand < 0.5) type = 'BARRIER_LOW';
      else if (rand < 0.8) type = 'BARRIER_TALL';
      else type = 'LASER_HIGH';
    } else {
      type = 'BARRIER_LOW';
    }

    let width = 28;
    let height = 36;
    let y = GAME_CONSTANTS.GROUND_Y + 12 - height;

    if (type === 'BARRIER_TALL') {
      width = 30;
      height = 54;
      y = GAME_CONSTANTS.GROUND_Y + 12 - height;
    } else if (type === 'LASER_HIGH') {
      // High laser drone: player MUST stay ground to pass under safely!
      width = 44;
      height = 20;
      y = GAME_CONSTANTS.GROUND_Y - 55;
    } else if (type === 'ENERGY_GATE') {
      width = 24;
      height = 48;
      y = GAME_CONSTANTS.GROUND_Y + 12 - height;
    }

    this.obstacles.push({
      id: this.nextEntityId++,
      x: GAME_CONSTANTS.BASE_WIDTH + 50,
      y,
      width,
      height,
      type,
      passed: false,
      nearMissAwarded: false,
      state: 0,
    });
  }

  private spawnCollectible(): void {
    const rand = Math.random();
    let type: CollectibleType = 'NORMAL';
    let value: number = GAME_CONSTANTS.COIN_VALUES.NORMAL;
    let coinReward: number = GAME_CONSTANTS.COIN_REWARDS.NORMAL;

    if (rand > 0.9) {
      type = 'PERFECT';
      value = GAME_CONSTANTS.COIN_VALUES.PERFECT;
      coinReward = GAME_CONSTANTS.COIN_REWARDS.PERFECT;
    } else if (rand > 0.7) {
      type = 'RARE';
      value = GAME_CONSTANTS.COIN_VALUES.RARE;
      coinReward = GAME_CONSTANTS.COIN_REWARDS.RARE;
    }

    // Altitude: either on ground or elevated requiring jump
    const elevated = Math.random() > 0.5;
    const y = elevated ? GAME_CONSTANTS.GROUND_Y - 45 : GAME_CONSTANTS.GROUND_Y - 6;

    this.collectibles.push({
      id: this.nextEntityId++,
      x: GAME_CONSTANTS.BASE_WIDTH + 40,
      y,
      width: 24,
      height: 24,
      type,
      value,
      coinReward,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      rotation: 0,
    });
  }

  private updateObstacles(frameDist: number): void {
    // Player Hitbox (padded for fairness and good feeling)
    const px = GAME_CONSTANTS.PLAYER_X - 10;
    const py = this.playerY - 22;
    const pw = 20;
    const ph = 34;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= frameDist;
      obs.state += 0.05;

      // Check Collision
      const collides =
        px < obs.x + obs.width &&
        px + pw > obs.x &&
        py < obs.y + obs.height &&
        py + ph > obs.y;

      if (collides) {
        this.triggerGameOver();
        return;
      }

      // Check Near-Miss
      if (!obs.nearMissAwarded && !obs.passed && obs.x < px) {
        const dist = Math.hypot(
          (px + pw / 2) - (obs.x + obs.width / 2),
          (py + ph / 2) - (obs.y + obs.height / 2)
        );

        if (dist <= GAME_CONSTANTS.NEAR_MISS_DISTANCE + 24) {
          obs.nearMissAwarded = true;
          this.triggerNearMiss(obs.x, obs.y);
        }
      }

      // Passed check
      if (!obs.passed && obs.x + obs.width < px) {
        obs.passed = true;
        this.obstaclesDodgedCount++;
        this.score += GAME_CONSTANTS.OBSTACLE_DODGE_SCORE * this.getMultiplier();
        this.addCombo();
        this.callbacks.onAchievementProgress('obstacles_dodged', this.obstaclesDodgedCount);
      }

      // Remove off-screen
      if (obs.x + obs.width < -50) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCollectibles(frameDist: number): void {
    const px = GAME_CONSTANTS.PLAYER_X;
    const py = this.playerY;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= frameDist;
      col.rotation += 0.05;

      // Distance check for collection
      const dist = Math.hypot(px - col.x, py - col.y);
      if (dist < 34 && !col.collected) {
        col.collected = true;
        this.collectOrb(col);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.x < -40) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private collectOrb(col: Collectible): void {
    sound.playCollectible(col.type);

    const earnedCoins = col.coinReward;
    this.coinsEarnedThisRun += earnedCoins;
    const earnedScore = col.value * this.getMultiplier();
    this.score += earnedScore;

    this.addCombo();

    // Visual feedback
    const color = col.type === 'PERFECT' ? '#facc15' : col.type === 'RARE' ? '#c084fc' : '#38bdf8';
    this.addFloatingText(`+${col.value}`, col.x, col.y - 10, color, col.type === 'PERFECT' ? 20 : 16);

    // Burst sparkles
    if (!this.reducedMotion) {
      const count = col.type === 'PERFECT' ? 14 : 8;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const spd = 2 + Math.random() * 3;
        this.particles.push({
          x: col.x,
          y: col.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color,
          size: 3 + Math.random() * 2,
          alpha: 1,
          life: 0,
          maxLife: 0.35,
          shape: 'spark',
        });
      }
    }

    this.callbacks.onCoinCollected(this.coinsEarnedThisRun, earnedCoins);
    this.callbacks.onAchievementProgress('coins_collected', this.coinsEarnedThisRun);
  }

  private triggerNearMiss(x: number, y: number): void {
    sound.playNearMiss();
    this.score += GAME_CONSTANTS.NEAR_MISS_BONUS_SCORE * this.getMultiplier();
    this.addCombo();

    this.triggerScreenShake(3.5);
    this.addFloatingText('NEAR MISS! ⚡', x, y - 20, '#38bdf8', 15);
  }

  private addCombo(): void {
    this.comboCount++;
    this.comboTimer = GAME_CONSTANTS.COMBO_TIMEOUT_MS;
    if (this.comboCount > this.maxComboThisRun) {
      this.maxComboThisRun = this.comboCount;
    }

    if (this.comboCount % 5 === 0) {
      sound.playCombo(this.getMultiplier());
      this.addFloatingText(`COMBO x${this.getMultiplier()}! 🔥`, GAME_CONSTANTS.PLAYER_X + 30, this.playerY - 50, '#f59e0b', 18);
    }

    this.callbacks.onScoreUpdate(Math.floor(this.score), this.comboCount, this.getMultiplier());
    this.callbacks.onAchievementProgress('max_combo', this.maxComboThisRun);
  }

  public getMultiplier(): number {
    if (this.comboCount >= 20) return 6;
    if (this.comboCount >= 15) return 5;
    if (this.comboCount >= 10) return 4;
    if (this.comboCount >= 6) return 3;
    if (this.comboCount >= 3) return 2;
    return 1;
  }

  private triggerScreenShake(intensity: number): void {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.min(GAME_CONSTANTS.MAX_SHAKE_INTENSITY, intensity);
  }

  private addFloatingText(text: string, x: number, y: number, color: string, fontSize: number): void {
    this.floatingTexts.push({
      id: this.nextEntityId++,
      text,
      x,
      y,
      color,
      fontSize,
      alpha: 1,
      vy: -1.2,
    });
  }

  private triggerGameOver(): void {
    this.state = 'GAME_OVER';
    this.characterAction = 'hit';
    this.playerVy = -8;
    this.triggerScreenShake(9);

    sound.playHit();
    setTimeout(() => sound.playGameOver(), 120);

    // Shatter particles
    if (!this.reducedMotion) {
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 5;
        this.particles.push({
          x: GAME_CONSTANTS.PLAYER_X,
          y: this.playerY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color: i % 2 === 0 ? '#ef4444' : '#f59e0b',
          size: 3 + Math.random() * 4,
          alpha: 1,
          life: 0,
          maxLife: 0.5,
          shape: 'square',
        });
      }
    }

    // Call game over callback after brief impact animation
    setTimeout(() => {
      this.callbacks.onGameOver(
        Math.floor(this.score),
        this.maxComboThisRun,
        this.coinsEarnedThisRun,
        this.runDuration
      );
    }, 450);
  }

  // --- Rendering ---

  private render(): void {
    this.applyTransform();
    this.ctx.save();

    // Screen Shake
    if (this.shakeIntensity > 0 && !this.reducedMotion) {
      const sx = (Math.random() * 2 - 1) * this.shakeIntensity;
      const sy = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }

    // 1. Background & Theme Transition
    this.drawBackground(this.runDuration);

    // 2. Parallax Grid & Stars
    this.drawParallaxElements();

    // 3. Ground Track
    this.drawGround();

    // 4. Obstacles
    this.drawObstacles();

    // 5. Collectibles
    this.drawCollectibles();

    // 6. Particles
    this.drawParticles();

    // 7. Player Character
    renderCharacter(
      this.ctx,
      GAME_CONSTANTS.PLAYER_X,
      this.playerY,
      this.characterAction,
      this.skinId,
      this.animClock
    );

    // 8. Floating Texts
    this.drawFloatingTexts();

    this.ctx.restore();
  }

  private drawBackground(time: number): void {
    const w = GAME_CONSTANTS.BASE_WIDTH;
    const h = GAME_CONSTANTS.BASE_HEIGHT;

    // Day -> Sunset -> Night -> Cyber Neon interpolation
    let topColor = '#0b0f19';
    let btmColor = '#1e1b4b';

    if (time < GAME_CONSTANTS.THEME_THRESHOLDS.SUNSET) {
      // Day / Dawn
      topColor = '#0f172a';
      btmColor = '#1e293b';
    } else if (time < GAME_CONSTANTS.THEME_THRESHOLDS.NIGHT) {
      // Sunset
      topColor = '#1f132b';
      btmColor = '#4a154b';
    } else if (time < GAME_CONSTANTS.THEME_THRESHOLDS.NEON) {
      // Deep Night
      topColor = '#070913';
      btmColor = '#111827';
    } else {
      // Cyber Neon
      topColor = '#080112';
      btmColor = '#2b0938';
    }

    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, btmColor);

    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  private drawParallaxElements(): void {
    const w = GAME_CONSTANTS.BASE_WIDTH;

    // Distant cyber grid lines scrolling slowly
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    const gridOffset = (this.distanceTraveled * 0.25) % 40;
    for (let x = -gridOffset; x < w; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 180);
      this.ctx.lineTo(x, GAME_CONSTANTS.GROUND_Y);
      this.ctx.stroke();
    }

    // Horizontal perspective lines
    for (let y = 200; y < GAME_CONSTANTS.GROUND_Y; y += 35) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawGround(): void {
    const w = GAME_CONSTANTS.BASE_WIDTH;
    const h = GAME_CONSTANTS.BASE_HEIGHT;
    const groundY = GAME_CONSTANTS.GROUND_Y + 12;

    // Glowing track top border
    this.ctx.save();
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, groundY, w, h - groundY);

    // Neon laser guide line
    this.ctx.strokeStyle = '#06b6d4';
    this.ctx.shadowColor = '#06b6d4';
    this.ctx.shadowBlur = 8;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY);
    this.ctx.lineTo(w, groundY);
    this.ctx.stroke();

    // Moving ground ticks
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    this.ctx.lineWidth = 2;
    const tickOffset = (this.distanceTraveled * 0.8) % 30;
    for (let x = -tickOffset; x < w; x += 30) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, groundY + 2);
      this.ctx.lineTo(x - 8, groundY + 16);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawObstacles(): void {
    for (const obs of this.obstacles) {
      this.ctx.save();
      if (obs.type === 'BARRIER_LOW' || obs.type === 'BARRIER_TALL') {
        // Red neon energy barrier with diagonal hazard stripes
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowColor = '#ef4444';
        this.ctx.shadowBlur = 10;

        // Draw pillar / spike
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.width / 2, obs.y);
        this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        this.ctx.lineTo(obs.x, obs.y + obs.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Warning core
        this.ctx.fillStyle = '#fee2e2';
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + obs.width / 2, obs.y + 6);
        this.ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height - 2);
        this.ctx.lineTo(obs.x + 6, obs.y + obs.height - 2);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (obs.type === 'LASER_HIGH') {
        // Drone pod with laser beam below
        this.ctx.fillStyle = '#f97316';
        this.ctx.shadowColor = '#f97316';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        drawRoundRect(this.ctx, obs.x, obs.y, obs.width, obs.height, 4);
        this.ctx.fill();

        // Pulsing beam underneath
        const pulse = (Math.sin(obs.state * 10) + 1) * 0.5;
        this.ctx.fillStyle = `rgba(249, 115, 22, ${0.4 + pulse * 0.4})`;
        this.ctx.fillRect(obs.x + 8, obs.y + obs.height, obs.width - 16, 14);
      } else if (obs.type === 'ENERGY_GATE') {
        // Vertical energy barrier gate
        this.ctx.fillStyle = '#a855f7';
        this.ctx.shadowColor = '#a855f7';
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        drawRoundRect(this.ctx, obs.x, obs.y, obs.width, obs.height, 6);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private drawCollectibles(): void {
    for (const col of this.collectibles) {
      this.ctx.save();
      const bob = Math.sin(this.animClock * 6 + col.bobOffset) * 4;
      const cy = col.y + bob;

      let color = '#38bdf8';
      let aura = 'rgba(56, 189, 248, 0.4)';

      if (col.type === 'PERFECT') {
        color = '#facc15';
        aura = 'rgba(250, 204, 21, 0.6)';
      } else if (col.type === 'RARE') {
        color = '#c084fc';
        aura = 'rgba(192, 132, 252, 0.5)';
      }

      this.ctx.translate(col.x, cy);
      this.ctx.rotate(col.rotation);

      // Glowing aura
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 14;

      if (col.type === 'PERFECT') {
        // Prismatic diamond
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(10, 0);
        this.ctx.lineTo(0, 10);
        this.ctx.lineTo(-10, 0);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Glowing energy sphere
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, col.type === 'RARE' ? 9 : 7, 0, Math.PI * 2);
        this.ctx.fill();

        // Core gleam
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(-2, -2, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private drawParticles(): void {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private drawFloatingTexts(): void {
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.fillStyle = ft.color;
      this.ctx.font = `bold ${ft.fontSize}px 'Chakra Petch', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }
}
