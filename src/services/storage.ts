import { GameSaveData, SkinId, UserSettings, LeaderboardEntry, DailyChallenge } from '../types';
import { GAME_CONSTANTS } from '../game/constants';

const STORAGE_KEY = 'dont_blink_save_v1';
const CURRENT_VERSION = 1;

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  musicEnabled: true,
  reducedMotion: false,
};

const DEFAULT_SAVE_DATA: GameSaveData = {
  version: CURRENT_VERSION,
  bestScore: 0,
  coins: 0,
  selectedSkin: 'default',
  unlockedSkins: ['default'],
  achievements: {},
  dailyChallenge: {
    dateKey: '',
    progress: 0,
    completed: false,
    claimed: false,
  },
  settings: DEFAULT_SETTINGS,
  stats: {
    totalRuns: 0,
    totalScore: 0,
    totalCoinsCollected: 0,
    totalPlayTimeSeconds: 0,
    highestCombo: 1,
    obstaclesDodged: 0,
  },
  history: [],
  tutorialCompleted: false,
  adsRemoved: false,
};

class DataManager {
  private inMemoryCache: GameSaveData;
  private storageAvailable: boolean;

  constructor() {
    this.storageAvailable = this.checkStorage();
    this.inMemoryCache = this.loadData();
  }

  private checkStorage(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private loadData(): GameSaveData {
    if (!this.storageAvailable) {
      return { ...DEFAULT_SAVE_DATA };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE_DATA };

      const parsed = JSON.parse(raw);
      // Migration / schema check
      return {
        ...DEFAULT_SAVE_DATA,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        stats: { ...DEFAULT_SAVE_DATA.stats, ...(parsed.stats || {}) },
        unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
          ? parsed.unlockedSkins
          : ['default'],
        achievements: parsed.achievements || {},
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    } catch (e) {
      console.warn("DON'T BLINK: Failed to parse localStorage data, using fallback.", e);
      return { ...DEFAULT_SAVE_DATA };
    }
  }

  public getData(): Readonly<GameSaveData> {
    return this.inMemoryCache;
  }

  public save(): void {
    if (this.storageAvailable) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inMemoryCache));
      } catch (e) {
        console.warn("DON'T BLINK: Could not persist to localStorage", e);
      }
    }
  }

  public updateBestScore(score: number): boolean {
    if (score > this.inMemoryCache.bestScore) {
      this.inMemoryCache.bestScore = Math.floor(score);
      this.save();
      return true;
    }
    return false;
  }

  public addCoins(amount: number): number {
    this.inMemoryCache.coins = Math.max(0, this.inMemoryCache.coins + amount);
    this.inMemoryCache.stats.totalCoinsCollected += amount;
    this.save();
    return this.inMemoryCache.coins;
  }

  public unlockSkin(skinId: SkinId, cost: number): boolean {
    if (this.inMemoryCache.coins >= cost && !this.inMemoryCache.unlockedSkins.includes(skinId)) {
      this.inMemoryCache.coins -= cost;
      this.inMemoryCache.unlockedSkins.push(skinId);
      this.inMemoryCache.selectedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }

  public selectSkin(skinId: SkinId): void {
    if (this.inMemoryCache.unlockedSkins.includes(skinId)) {
      this.inMemoryCache.selectedSkin = skinId;
      this.save();
    }
  }

  public updateSettings(partial: Partial<UserSettings>): UserSettings {
    this.inMemoryCache.settings = {
      ...this.inMemoryCache.settings,
      ...partial,
    };
    this.save();
    return this.inMemoryCache.settings;
  }

  public recordRun(entry: LeaderboardEntry): void {
    this.inMemoryCache.stats.totalRuns += 1;
    this.inMemoryCache.stats.totalScore += entry.score;
    this.inMemoryCache.stats.totalPlayTimeSeconds += Math.round(entry.durationSeconds);
    if (entry.combo > this.inMemoryCache.stats.highestCombo) {
      this.inMemoryCache.stats.highestCombo = entry.combo;
    }

    // Top 5 history
    const updated = [entry, ...this.inMemoryCache.history]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    this.inMemoryCache.history = updated;
    this.save();
  }

  public markTutorialCompleted(): void {
    this.inMemoryCache.tutorialCompleted = true;
    this.save();
  }

  public unlockAchievement(id: string): boolean {
    if (!this.inMemoryCache.achievements[id]?.unlocked) {
      this.inMemoryCache.achievements[id] = {
        unlocked: true,
        unlockedAt: Date.now(),
      };
      this.save();
      return true;
    }
    return false;
  }

  public getDailyChallenge(todayDateKey: string): DailyChallenge {
    const list = [
      {
        title: 'Century Run',
        description: 'Score 500 points in a single run.',
        targetType: 'score' as const,
        targetValue: 500,
        rewardCoins: GAME_CONSTANTS.DAILY_REWARD_COINS,
      },
      {
        title: 'Endurance Runner',
        description: 'Survive for at least 30 seconds.',
        targetType: 'time' as const,
        targetValue: 30,
        rewardCoins: GAME_CONSTANTS.DAILY_REWARD_COINS,
      },
      {
        title: 'Combo Catalyst',
        description: 'Reach a combo multiplier of x5.',
        targetType: 'combo' as const,
        targetValue: 5,
        rewardCoins: GAME_CONSTANTS.DAILY_REWARD_COINS,
      },
      {
        title: 'Energy Harvest',
        description: 'Collect 25 energy orbs in one run.',
        targetType: 'coins' as const,
        targetValue: 25,
        rewardCoins: GAME_CONSTANTS.DAILY_REWARD_COINS,
      },
      {
        title: 'Grand Master',
        description: 'Score 1,000 points or more.',
        targetType: 'score' as const,
        targetValue: 1000,
        rewardCoins: 150,
      },
    ];

    // Pick deterministic index based on date string hash
    let hash = 0;
    for (let i = 0; i < todayDateKey.length; i++) {
      hash = (hash << 5) - hash + todayDateKey.charCodeAt(i);
      hash |= 0;
    }
    const challengeIndex = Math.abs(hash) % list.length;
    const template = list[challengeIndex];

    const currentStored = this.inMemoryCache.dailyChallenge;
    const isToday = currentStored.dateKey === todayDateKey;

    return {
      id: todayDateKey,
      title: template.title,
      description: template.description,
      targetType: template.targetType,
      targetValue: template.targetValue,
      progress: isToday ? currentStored.progress : 0,
      rewardCoins: template.rewardCoins,
      completed: isToday ? currentStored.completed : false,
      claimed: isToday ? currentStored.claimed : false,
    };
  }

  public updateDailyProgress(todayDateKey: string, value: number): { completedNow: boolean } {
    let completedNow = false;
    const challenge = this.getDailyChallenge(todayDateKey);

    if (challenge.completed) return { completedNow: false };

    const newProgress = Math.max(challenge.progress, value);
    const completed = newProgress >= challenge.targetValue;

    if (completed && !challenge.completed) {
      completedNow = true;
    }

    this.inMemoryCache.dailyChallenge = {
      dateKey: todayDateKey,
      progress: newProgress,
      completed,
      claimed: challenge.claimed,
    };

    this.save();
    return { completedNow };
  }

  public claimDailyReward(todayDateKey: string, reward: number): boolean {
    const current = this.inMemoryCache.dailyChallenge;
    if (current.dateKey === todayDateKey && current.completed && !current.claimed) {
      current.claimed = true;
      this.addCoins(reward);
      this.save();
      return true;
    }
    return false;
  }

  public resetAll(): void {
    this.inMemoryCache = { ...DEFAULT_SAVE_DATA };
    this.save();
  }
}

export const storage = new DataManager();
