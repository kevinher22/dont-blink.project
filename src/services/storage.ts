import {
  GameSaveData,
  SkinId,
  EntitySkinId,
  OrbCosmeticId,
  PurchaseRecord,
  UserSettings,
  LeaderboardEntry,
  DailyChallenge,
  StoryState,
  EndingId,
} from '../types';
import { GAME_CONSTANTS } from '../game/constants';
import { securityService } from './security';
import { BUNDLES, PLAYER_SKINS, ENTITY_SKINS, ORB_COSMETICS } from '../data/cosmeticsData';

const STORAGE_KEY = 'dont_blink_save_v1';
const PURCHASES_BACKUP_KEY = 'dont_blink_purchases_backup_v1';
const CURRENT_VERSION = 2;

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  musicEnabled: true,
  masterVolume: 80,
  sfxVolume: 80,
  musicVolume: 70,
  reducedMotion: false,
  screenShake: true,
  particles: true,
  vibration: true,
  language: 'id',
};

const DEFAULT_STORY_STATE: StoryState = {
  courage: 15,
  fear: 10,
  memory: 5,
  trust: 10,
  corruption: 0,
  awareness: 10,
  lookBackCount: 0,
  secretEventsDiscovered: [],
  unlockedFragments: ['frag_01'], // First whisper unlocked from beginning
  unlockedChapters: ['chapter_1'], // Chapter 1 unlocked by default
  unlockedEndings: [],
  hasSeenIntro: false,
  finalStoryCutsceneSeen: false,
};

const DEFAULT_SAVE_DATA: GameSaveData = {
  version: CURRENT_VERSION,
  bestScore: 0,
  coins: 0,
  selectedSkin: 'default',
  unlockedSkins: ['default'],
  selectedEntitySkin: 'entity_original',
  unlockedEntitySkins: ['entity_original'],
  selectedOrbCosmetic: 'orb_default',
  unlockedOrbCosmetics: ['orb_default'],
  purchasedBundles: [],
  fullStoryUnlocked: false,
  supporterPackUnlocked: false,
  purchaseHistory: [],
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
    totalDistance: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lookBackCount: 0,
  },
  history: [],
  tutorialCompleted: false,
  adsRemoved: false,
  story: DEFAULT_STORY_STATE,
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
      let raw = localStorage.getItem(STORAGE_KEY);
      let parsed = raw ? JSON.parse(raw) : null;

      // Check secondary dedicated purchases backup
      try {
        const backupRaw = localStorage.getItem(PURCHASES_BACKUP_KEY);
        if (backupRaw) {
          const backup = JSON.parse(backupRaw);
          if (backup && typeof backup === 'object') {
            if (!parsed) {
              parsed = { ...DEFAULT_SAVE_DATA };
            }
            // Merge backup purchases so accidental clears or corruption never wipes real ownership
            if (Array.isArray(backup.purchasedBundles)) {
              parsed.purchasedBundles = Array.from(
                new Set([...(parsed.purchasedBundles || []), ...backup.purchasedBundles])
              );
            }
            if (Array.isArray(backup.unlockedSkins)) {
              parsed.unlockedSkins = Array.from(
                new Set([...(parsed.unlockedSkins || []), ...backup.unlockedSkins])
              );
            }
            if (Array.isArray(backup.unlockedEntitySkins)) {
              parsed.unlockedEntitySkins = Array.from(
                new Set([...(parsed.unlockedEntitySkins || []), ...backup.unlockedEntitySkins])
              );
            }
            if (Array.isArray(backup.unlockedOrbCosmetics)) {
              parsed.unlockedOrbCosmetics = Array.from(
                new Set([...(parsed.unlockedOrbCosmetics || []), ...backup.unlockedOrbCosmetics])
              );
            }
            if (Array.isArray(backup.purchaseHistory)) {
              parsed.purchaseHistory = [
                ...(parsed.purchaseHistory || []),
                ...backup.purchaseHistory.filter(
                  (bRec: PurchaseRecord) =>
                    !(parsed.purchaseHistory || []).some(
                      (pRec: PurchaseRecord) => pRec.transaction_id === bRec.transaction_id
                    )
                ),
              ];
            }
            if (backup.fullStoryUnlocked) parsed.fullStoryUnlocked = true;
            if (backup.supporterPackUnlocked) parsed.supporterPackUnlocked = true;
            if (backup.adsRemoved) parsed.adsRemoved = true;
          }
        }
      } catch {
        // Non-blocking fallback
      }

      if (!parsed) return { ...DEFAULT_SAVE_DATA };

      // Safe migration logic: preserving all old high scores, coins, unlocked skins, etc.
      const settings: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      };

      const stats = {
        ...DEFAULT_SAVE_DATA.stats,
        ...(parsed.stats || {}),
      };

      const story: StoryState = {
        ...DEFAULT_STORY_STATE,
        ...(parsed.story || {}),
        unlockedFragments: Array.isArray(parsed.story?.unlockedFragments) && parsed.story.unlockedFragments.length > 0
          ? parsed.story.unlockedFragments
          : DEFAULT_STORY_STATE.unlockedFragments,
        unlockedChapters: Array.isArray(parsed.story?.unlockedChapters) && parsed.story.unlockedChapters.length > 0
          ? parsed.story.unlockedChapters
          : DEFAULT_STORY_STATE.unlockedChapters,
        unlockedEndings: Array.isArray(parsed.story?.unlockedEndings)
          ? parsed.story.unlockedEndings
          : [],
        secretEventsDiscovered: Array.isArray(parsed.story?.secretEventsDiscovered)
          ? parsed.story.secretEventsDiscovered
          : [],
      };

      const sanitized = securityService.sanitizeLoadedSaveData(
        {
          ...parsed,
          settings,
          stats,
          story,
        },
        DEFAULT_SAVE_DATA
      );

      // Reconcile purchases to guarantee all bundled items are unlocked
      const reconciled = this.internalReconcile(sanitized);

      return {
        ...reconciled,
        version: CURRENT_VERSION,
        achievements: parsed.achievements || {},
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    } catch (e) {
      console.warn("DON'T BLINK: Failed to parse localStorage data, using fallback.", e);
      return { ...DEFAULT_SAVE_DATA };
    }
  }

  /**
   * Guarantees that any purchased bundles or purchase records correctly
   * reflect all included Runner skins, Entity skins, and Orb cosmetics.
   */
  private internalReconcile(data: GameSaveData): GameSaveData {
    const unlockedSkins = new Set<SkinId>(data.unlockedSkins || ['default']);
    const unlockedEntitySkins = new Set<EntitySkinId>(data.unlockedEntitySkins || ['entity_original']);
    const unlockedOrbCosmetics = new Set<OrbCosmeticId>(data.unlockedOrbCosmetics || ['orb_default']);
    const purchasedBundles = new Set<string>(data.purchasedBundles || []);

    // 1. Reconcile from purchasedBundles list
    for (const bId of purchasedBundles) {
      const bundle = BUNDLES.find((b) => b.id === bId);
      if (bundle) {
        for (const item of bundle.itemIds) {
          if (item.type === 'player') unlockedSkins.add(item.id as SkinId);
          if (item.type === 'entity') unlockedEntitySkins.add(item.id as EntitySkinId);
          if (item.type === 'orb') unlockedOrbCosmetics.add(item.id as OrbCosmeticId);
        }
      }
    }

    // 2. Reconcile from purchaseHistory
    for (const record of data.purchaseHistory || []) {
      const pid = record.product_id;
      if (pid === 'remove_ads') {
        data.adsRemoved = true;
      } else if (pid === 'full_story') {
        data.fullStoryUnlocked = true;
      } else if (pid === 'supporter_pack') {
        data.supporterPackUnlocked = true;
      } else if (pid.startsWith('bundle_')) {
        purchasedBundles.add(pid);
        const bundle = BUNDLES.find((b) => b.id === pid);
        if (bundle) {
          for (const item of bundle.itemIds) {
            if (item.type === 'player') unlockedSkins.add(item.id as SkinId);
            if (item.type === 'entity') unlockedEntitySkins.add(item.id as EntitySkinId);
            if (item.type === 'orb') unlockedOrbCosmetics.add(item.id as OrbCosmeticId);
          }
        }
      } else {
        if (PLAYER_SKINS.some((s) => s.id === pid)) {
          unlockedSkins.add(pid as SkinId);
        }
        if (ENTITY_SKINS.some((e) => e.id === pid)) {
          unlockedEntitySkins.add(pid as EntitySkinId);
        }
        if (ORB_COSMETICS.some((o) => o.id === pid)) {
          unlockedOrbCosmetics.add(pid as OrbCosmeticId);
        }
      }
    }

    data.unlockedSkins = Array.from(unlockedSkins);
    data.unlockedEntitySkins = Array.from(unlockedEntitySkins);
    data.unlockedOrbCosmetics = Array.from(unlockedOrbCosmetics);
    data.purchasedBundles = Array.from(purchasedBundles);

    return data;
  }

  public reconcilePurchases(): void {
    this.inMemoryCache = this.internalReconcile(this.inMemoryCache);
    this.save();
  }

  public getData(): Readonly<GameSaveData> {
    return this.inMemoryCache;
  }

  public save(): void {
    if (this.storageAvailable) {
      try {
        const sig = securityService.computeSaveChecksum(this.inMemoryCache);
        const payload = {
          ...this.inMemoryCache,
          _sig: sig,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

        // Persist dedicated secondary purchases backup
        const purchasesBackup = {
          purchasedBundles: this.inMemoryCache.purchasedBundles,
          unlockedSkins: this.inMemoryCache.unlockedSkins,
          unlockedEntitySkins: this.inMemoryCache.unlockedEntitySkins,
          unlockedOrbCosmetics: this.inMemoryCache.unlockedOrbCosmetics,
          purchaseHistory: this.inMemoryCache.purchaseHistory,
          fullStoryUnlocked: this.inMemoryCache.fullStoryUnlocked,
          supporterPackUnlocked: this.inMemoryCache.supporterPackUnlocked,
          adsRemoved: this.inMemoryCache.adsRemoved,
        };
        localStorage.setItem(PURCHASES_BACKUP_KEY, JSON.stringify(purchasesBackup));
      } catch (e) {
        console.warn("DON'T BLINK: Could not persist to localStorage", e);
      }
    }
  }

  public updateBestScore(score: number): boolean {
    if (!Number.isFinite(score) || score < 0) return false;
    const clampedScore = Math.min(5000000, Math.floor(score));
    if (clampedScore > this.inMemoryCache.bestScore) {
      this.inMemoryCache.bestScore = clampedScore;
      this.save();
      return true;
    }
    return false;
  }

  public addCoins(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return this.inMemoryCache.coins;
    const cleanAmount = Math.min(10000, Math.floor(amount));
    this.inMemoryCache.coins = Math.min(999999, this.inMemoryCache.coins + cleanAmount);
    this.inMemoryCache.stats.totalCoinsCollected += cleanAmount;
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

  public unlockSkinFree(skinId: SkinId): boolean {
    if (!this.inMemoryCache.unlockedSkins.includes(skinId)) {
      this.inMemoryCache.unlockedSkins.push(skinId);
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

  // --- ENTITY SKINS ---

  public unlockEntitySkin(id: EntitySkinId, cost: number): boolean {
    const list = this.inMemoryCache.unlockedEntitySkins || ['entity_original'];
    if (this.inMemoryCache.coins >= cost && !list.includes(id)) {
      this.inMemoryCache.coins -= cost;
      list.push(id);
      this.inMemoryCache.unlockedEntitySkins = list;
      this.inMemoryCache.selectedEntitySkin = id;
      this.save();
      return true;
    }
    return false;
  }

  public unlockEntitySkinFree(id: EntitySkinId): boolean {
    const list = this.inMemoryCache.unlockedEntitySkins || ['entity_original'];
    if (!list.includes(id)) {
      list.push(id);
      this.inMemoryCache.unlockedEntitySkins = list;
      this.save();
      return true;
    }
    return false;
  }

  public selectEntitySkin(id: EntitySkinId): void {
    const list = this.inMemoryCache.unlockedEntitySkins || ['entity_original'];
    if (list.includes(id)) {
      this.inMemoryCache.selectedEntitySkin = id;
      this.save();
    }
  }

  // --- ORB COSMETICS ---

  public unlockOrbCosmetic(id: OrbCosmeticId): boolean {
    const list = this.inMemoryCache.unlockedOrbCosmetics || ['orb_default'];
    if (!list.includes(id)) {
      list.push(id);
      this.inMemoryCache.unlockedOrbCosmetics = list;
      this.inMemoryCache.selectedOrbCosmetic = id;
      this.save();
      return true;
    }
    return false;
  }

  public selectOrbCosmetic(id: OrbCosmeticId): void {
    const list = this.inMemoryCache.unlockedOrbCosmetics || ['orb_default'];
    if (list.includes(id)) {
      this.inMemoryCache.selectedOrbCosmetic = id;
      this.save();
    }
  }

  // --- BUNDLES & PASSES ---

  public addPurchasedBundle(bundleId: string): void {
    const list = this.inMemoryCache.purchasedBundles || [];
    if (!list.includes(bundleId)) {
      list.push(bundleId);
      this.inMemoryCache.purchasedBundles = list;
      this.save();
    }
  }

  public setFullStoryUnlocked(unlocked: boolean = true): void {
    this.inMemoryCache.fullStoryUnlocked = unlocked;
    // Also ensure all chapters in story state are accessible
    const allChapters = ['chapter_1', 'chapter_2', 'chapter_3', 'chapter_4', 'chapter_5', 'chapter_6'];
    this.inMemoryCache.story.unlockedChapters = Array.from(new Set([...this.inMemoryCache.story.unlockedChapters, ...allChapters]));
    this.save();
  }

  public setSupporterPackUnlocked(unlocked: boolean = true): void {
    this.inMemoryCache.supporterPackUnlocked = unlocked;
    this.save();
  }

  public recordPurchase(record: PurchaseRecord): void {
    const history = this.inMemoryCache.purchaseHistory || [];
    history.push(record);
    this.inMemoryCache.purchaseHistory = history;
    this.save();
  }

  public removeAds(): void {
    this.inMemoryCache.adsRemoved = true;
    this.save();
  }

  public updateSettings(partial: Partial<UserSettings>): UserSettings {
    this.inMemoryCache.settings = {
      ...this.inMemoryCache.settings,
      ...partial,
    };
    this.save();
    return this.inMemoryCache.settings;
  }

  public recordRun(entry: LeaderboardEntry, distance: number = 0, lookBackOccurred: boolean = false): void {
    this.inMemoryCache.stats.totalRuns += 1;
    this.inMemoryCache.stats.totalScore += entry.score;
    this.inMemoryCache.stats.totalPlayTimeSeconds += Math.round(entry.durationSeconds);
    this.inMemoryCache.stats.totalDistance += Math.round(distance);
    if (lookBackOccurred) {
      this.inMemoryCache.stats.lookBackCount += 1;
      this.inMemoryCache.story.lookBackCount += 1;
    }

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

  public markIntroSeen(): void {
    this.inMemoryCache.story.hasSeenIntro = true;
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

  // --- STORY STATE METHODS ---

  public getStoryState(): StoryState {
    return this.inMemoryCache.story;
  }

  public updateStoryFactors(partial: Partial<StoryState>): StoryState {
    this.inMemoryCache.story = {
      ...this.inMemoryCache.story,
      ...partial,
      courage: Math.min(100, Math.max(0, partial.courage ?? this.inMemoryCache.story.courage)),
      fear: Math.min(100, Math.max(0, partial.fear ?? this.inMemoryCache.story.fear)),
      memory: Math.min(100, Math.max(0, partial.memory ?? this.inMemoryCache.story.memory)),
      trust: Math.min(100, Math.max(0, partial.trust ?? this.inMemoryCache.story.trust)),
      corruption: Math.min(100, Math.max(0, partial.corruption ?? this.inMemoryCache.story.corruption)),
      awareness: Math.min(100, Math.max(0, partial.awareness ?? this.inMemoryCache.story.awareness)),
    };
    this.save();
    return this.inMemoryCache.story;
  }

  public unlockFragment(fragmentId: string): boolean {
    if (!this.inMemoryCache.story.unlockedFragments.includes(fragmentId)) {
      this.inMemoryCache.story.unlockedFragments.push(fragmentId);
      this.inMemoryCache.story.memory = Math.min(100, this.inMemoryCache.story.memory + 5);
      this.inMemoryCache.story.awareness = Math.min(100, this.inMemoryCache.story.awareness + 4);
      this.save();
      return true;
    }
    return false;
  }

  public unlockChapter(chapterId: string): boolean {
    if (!this.inMemoryCache.story.unlockedChapters.includes(chapterId)) {
      this.inMemoryCache.story.unlockedChapters.push(chapterId);
      this.save();
      return true;
    }
    return false;
  }

  public unlockEnding(endingId: EndingId): boolean {
    if (!this.inMemoryCache.story.unlockedEndings.includes(endingId)) {
      this.inMemoryCache.story.unlockedEndings.push(endingId);
      this.save();
      return true;
    }
    return false;
  }

  public registerSecretEvent(eventId: string): boolean {
    if (!this.inMemoryCache.story.secretEventsDiscovered.includes(eventId)) {
      this.inMemoryCache.story.secretEventsDiscovered.push(eventId);
      this.inMemoryCache.story.awareness = Math.min(100, this.inMemoryCache.story.awareness + 10);
      this.save();
      return true;
    }
    return false;
  }

  public hasSeenOpeningCutscene(): boolean {
    return !!this.inMemoryCache.story.hasSeenIntro || !!this.inMemoryCache.story.hasSeenOpeningCutscene;
  }

  public markOpeningCutsceneSeen(): void {
    this.inMemoryCache.story.hasSeenIntro = true;
    this.inMemoryCache.story.hasSeenOpeningCutscene = true;
    this.save();
  }

  public setHasSeenOpeningCutscene(seen: boolean): void {
    this.inMemoryCache.story.hasSeenIntro = seen;
    this.inMemoryCache.story.hasSeenOpeningCutscene = seen;
    this.save();
  }

  public hasSeenFinalStoryCutscene(): boolean {
    return !!this.inMemoryCache.story.finalStoryCutsceneSeen;
  }

  public markFinalStoryCutsceneSeen(): void {
    this.inMemoryCache.story.finalStoryCutsceneSeen = true;
    this.save();
  }

  public setHasSeenFinalStoryCutscene(seen: boolean): void {
    this.inMemoryCache.story.finalStoryCutsceneSeen = seen;
    this.save();
  }

  // --- DAILY CHALLENGE ---

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
    this.inMemoryCache = {
      ...DEFAULT_SAVE_DATA,
      story: { ...DEFAULT_STORY_STATE },
      settings: { ...DEFAULT_SETTINGS },
    };
    this.save();
  }
}

export const storage = new DataManager();
