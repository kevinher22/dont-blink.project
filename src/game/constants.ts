import { Skin } from '../types';

export const GAME_CONSTANTS = {
  // Canvas dimensions (virtual base resolution)
  BASE_WIDTH: 800,
  BASE_HEIGHT: 450,

  // Ground level relative to bottom
  GROUND_Y: 370,

  // Player physics
  PLAYER_X: 120,
  PLAYER_WIDTH: 36,
  PLAYER_HEIGHT: 44,
  GRAVITY: 0.82,
  JUMP_FORCE: -14.2,
  AIR_CONTROL: 0.98,
  RUN_BOUNCE_SPEED: 0.22,

  // Speed and difficulty
  INITIAL_SPEED: 6.2,
  MAX_SPEED: 13.8,
  SPEED_ACCELERATION: 0.04, // speed added per second survived
  MIN_OBSTACLE_SPACING: 240,
  MAX_OBSTACLE_SPACING: 420,

  // Combo system
  COMBO_TIMEOUT_MS: 3800,
  MAX_COMBO_MULTIPLIER: 8,

  // Collectible values
  COIN_VALUES: {
    NORMAL: 10,
    RARE: 50,
    PERFECT: 100,
  },

  COIN_REWARDS: {
    NORMAL: 1,
    RARE: 5,
    PERFECT: 15,
  },

  // Score intervals
  SURVIVAL_SCORE_PER_SEC: 15,
  OBSTACLE_DODGE_SCORE: 25,
  NEAR_MISS_BONUS_SCORE: 40,
  NEAR_MISS_DISTANCE: 28,

  // Screen shake
  MAX_SHAKE_INTENSITY: 12,
  SHAKE_DECAY: 0.88,

  // Daily challenge defaults
  DAILY_REWARD_COINS: 120,

  // Themes by duration (seconds)
  THEME_THRESHOLDS: {
    DAY: 0,
    SUNSET: 25,
    NIGHT: 55,
    NEON: 90,
  },
} as const;

export const AVAILABLE_SKINS: Skin[] = [
  {
    id: 'default',
    name: 'Cyber Cyan',
    description: 'Sleek standard-issue runner equipped with quantum stabilization.',
    cost: 0,
    unlockedByDefault: true,
    colors: {
      primary: '#06b6d4', // cyan-500
      secondary: '#0891b2', // cyan-600
      accent: '#67e8f9', // cyan-300
      glow: 'rgba(6, 182, 212, 0.45)',
      trail: 'rgba(6, 182, 212, 0.25)',
    },
  },
  {
    id: 'neon',
    name: 'Neon Pulse',
    description: 'Vibrant synthwave aesthetic with charged magenta overdrive.',
    cost: 150,
    colors: {
      primary: '#ec4899', // pink-500
      secondary: '#f43f5e', // rose-500
      accent: '#facc15', // amber-400
      glow: 'rgba(236, 72, 153, 0.55)',
      trail: 'rgba(236, 72, 153, 0.3)',
    },
  },
  {
    id: 'robot',
    name: 'Chrono Bot',
    description: 'Precision-machined titanium alloy with high-torque micro-thrusters.',
    cost: 300,
    colors: {
      primary: '#3b82f6', // blue-500
      secondary: '#1d4ed8', // blue-700
      accent: '#f97316', // orange-500 visor
      glow: 'rgba(59, 130, 246, 0.5)',
      trail: 'rgba(59, 130, 246, 0.25)',
    },
  },
  {
    id: 'ghost',
    name: 'Void Phantom',
    description: 'Semi-transparent spectral anomaly phasing between realities.',
    cost: 500,
    colors: {
      primary: '#a855f7', // purple-500
      secondary: '#7e22ce', // purple-700
      accent: '#e9d5ff', // purple-200
      glow: 'rgba(168, 85, 247, 0.6)',
      trail: 'rgba(168, 85, 247, 0.35)',
    },
  },
  {
    id: 'pixel',
    name: 'Retro 8-Bit',
    description: 'Nostalgic arcade green matrix phosphor CRT styling.',
    cost: 750,
    colors: {
      primary: '#22c55e', // green-500
      secondary: '#15803d', // green-700
      accent: '#86efac', // green-300
      glow: 'rgba(34, 197, 94, 0.5)',
      trail: 'rgba(34, 197, 94, 0.3)',
    },
  },
  {
    id: 'golden',
    name: 'Solar King',
    description: 'Forged from celestial stardust. The ultimate flex of mastery.',
    cost: 1200,
    colors: {
      primary: '#eab308', // yellow-500
      secondary: '#ca8a04', // yellow-600
      accent: '#fef08a', // yellow-200
      glow: 'rgba(234, 179, 8, 0.65)',
      trail: 'rgba(234, 179, 8, 0.4)',
    },
  },
];

export const INITIAL_ACHIEVEMENTS = [
  {
    id: 'first_run',
    title: 'First Run',
    description: 'Take your first leap into the danger zone.',
    icon: '🚀',
    unlocked: false,
  },
  {
    id: 'century',
    title: 'Century',
    description: 'Reach a score of 100 points.',
    icon: '⚡',
    unlocked: false,
  },
  {
    id: 'speedrunner',
    title: 'Speedrunner',
    description: 'Survive at least 30 seconds in a single run.',
    icon: '⏱️',
    unlocked: false,
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Reach a blistering x6 combo multiplier.',
    icon: '🔥',
    unlocked: false,
  },
  {
    id: 'no_hit',
    title: 'Flawless Pace',
    description: 'Survive 25 seconds with 5+ obstacles cleanly dodged.',
    icon: '🛡️',
    unlocked: false,
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Score 1,000 points or more in one attempt.',
    icon: '👑',
    unlocked: false,
  },
  {
    id: 'record_breaker',
    title: 'Record Breaker',
    description: 'Beat your previous personal best score.',
    icon: '🏆',
    unlocked: false,
  },
  {
    id: 'coin_collector',
    title: 'Orb Hoarder',
    description: 'Collect 50 total energy orbs across all runs.',
    icon: '🪙',
    unlocked: false,
  },
  {
    id: 'fashionista',
    title: 'Style Icon',
    description: 'Unlock any new custom character skin.',
    icon: '✨',
    unlocked: false,
  },
];
