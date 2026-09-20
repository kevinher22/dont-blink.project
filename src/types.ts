export type GameState =
  | 'MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'CUSTOMIZE'
  | 'ACHIEVEMENTS'
  | 'DAILY_CHALLENGE'
  | 'SETTINGS'
  | 'LEADERBOARD'
  | 'OPENING_CUTSCENE'
  | 'STORY_MENU'
  | 'ENDINGS_MENU'
  | 'ENDING_CINEMATIC'
  | 'CREDITS';

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

export type CollectibleType = 'NORMAL' | 'RARE' | 'PERFECT' | 'MEMORY_SHARD' | 'CORRUPTED_ANOMALY';

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

export type ObstacleType = 'BARRIER_LOW' | 'BARRIER_TALL' | 'LASER_HIGH' | 'ENERGY_GATE' | 'PULSE_MINE' | 'SHADOW_HAND';

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

export interface PlayerIdentity {
  playerId: string;
  displayName: string;
  isAuthenticated: boolean;
}

export interface LeaderboardEntry {
  id: string;
  score: number;
  combo: number;
  durationSeconds: number;
  coinsEarned: number;
  timestamp: number;
  skinUsed: SkinId;
  player_id?: string;
  playerName?: string;
  display_name?: string;
  distance?: number;
  endingId?: string | null;
}

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number; // 0 - 100
  sfxVolume: number; // 0 - 100
  musicVolume: number; // 0 - 100
  reducedMotion: boolean;
  screenShake: boolean;
  particles: boolean;
  vibration: boolean;
  language: 'id' | 'en';
}

export interface PlayerStats {
  totalRuns: number;
  totalScore: number;
  totalCoinsCollected: number;
  totalPlayTimeSeconds: number;
  highestCombo: number;
  obstaclesDodged: number;
  totalDistance: number;
  successfulRuns: number;
  failedRuns: number;
  lookBackCount: number;
}

// --- STORY & MYSTERY SYSTEM TYPES ---

export type FragmentCategory = 'MEMORY' | 'ENTITY' | 'LOCATION' | 'CHARACTER' | 'WARNING' | 'TRUTH';

export interface StoryFragment {
  id: string;
  number: number;
  category: FragmentCategory;
  title: { id: string; en: string };
  excerpt: { id: string; en: string };
  content: { id: string; en: string };
}

export interface StoryChapter {
  id: string;
  number: number;
  title: { id: string; en: string };
  teaser: { id: string; en: string };
  synopsis: { id: string; en: string };
  content?: { id: string; en: string };
  unlockRequirementText: { id: string; en: string };
}

export type EndingId =
  | 'ending_01'
  | 'ending_02'
  | 'ending_03'
  | 'ending_04'
  | 'ending_05'
  | 'ending_06'
  | 'ending_07';

export interface GameEnding {
  id: EndingId;
  number: string; // '01', '02', ..., '07'
  title: { id: string; en: string };
  subtitle: { id: string; en: string };
  shortDescription: { id: string; en: string };
  description?: { id: string; en: string };
  teaserHint: { id: string; en: string };
  hint?: { id: string; en: string };
  narrativeLines: { id: string; en: string }[];
  sceneType: 'escape' | 'truth' | 'blinked' | 'thing' | 'memory' | 'false_escape' | 'dont_blink';
}

export interface StoryState {
  courage: number; // 0 - 100 (Internal)
  fear: number; // 0 - 100 (Internal)
  memory: number; // 0 - 100 (Internal)
  trust: number; // 0 - 100 (Internal)
  corruption: number; // 0 - 100 (Internal)
  awareness: number; // 0 - 100 (Internal)
  lookBackCount: number;
  secretEventsDiscovered: string[];
  unlockedFragments: string[];
  unlockedChapters: string[];
  unlockedEndings: EndingId[];
  hasSeenIntro: boolean;
  hasSeenOpeningCutscene?: boolean;
  finalStoryCutsceneSeen?: boolean;
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
  story: StoryState;
}
