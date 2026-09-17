export type GameState =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'CUSTOMIZE'
  | 'ACHIEVEMENTS'
  | 'DAILY_CHALLENGE'
  | 'SETTINGS'
  | 'LEADERBOARD';

export type SkinId = 'default' | 'neon' | 'robot' | 'ghost' | 'pixel' | 'golden';

export interface Skin {
  id: SkinId;
  name: string;
  description: string;
  cost: number;
  unlockedByDefault?: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
    trail: string;
  };
}

export type CollectibleType = 'NORMAL' | 'RARE' | 'PERFECT';

export interface Collectible {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: CollectibleType;
  value: number;
  coinReward: number;
  collected: boolean;
  bobOffset: number;
  rotation: number;
}

export type ObstacleType = 'BARRIER_LOW' | 'BARRIER_TALL' | 'LASER_HIGH' | 'ENERGY_GATE' | 'PULSE_MINE';

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  nearMissAwarded: boolean;
  state: number; // for animations
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  shape?: 'circle' | 'spark' | 'square';
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  alpha: number;
  vy: number;
}

export interface DailyChallenge {
  id: string; // e.g. '2026-09-17'
  title: string;
  description: string;
  targetType: 'score' | 'time' | 'combo' | 'coins' | 'no_hit';
  targetValue: number;
  progress: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface LeaderboardEntry {
  id: string;
  score: number;
  combo: number;
  durationSeconds: number;
  coinsEarned: number;
  timestamp: number;
  skinUsed: SkinId;
}

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
}

export interface PlayerStats {
  totalRuns: number;
  totalScore: number;
  totalCoinsCollected: number;
  totalPlayTimeSeconds: number;
  highestCombo: number;
  obstaclesDodged: number;
}

export interface GameSaveData {
  version: number;
  bestScore: number;
  coins: number;
  selectedSkin: SkinId;
  unlockedSkins: SkinId[];
  achievements: Record<string, { unlocked: boolean; unlockedAt?: number }>;
  dailyChallenge: {
    dateKey: string;
    progress: number;
    completed: boolean;
    claimed: boolean;
  };
  settings: UserSettings;
  stats: PlayerStats;
  history: LeaderboardEntry[];
  tutorialCompleted: boolean;
  adsRemoved: boolean;
}
