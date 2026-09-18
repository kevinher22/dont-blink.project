import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardEntry } from '../types';
import { storage } from './storage';
import { securityService } from './security';

export interface OnlineLeaderboardEntry {
  id: string;
  created_at?: string;
  player_name: string;
  score: number;
  distance: number;
  run_duration: number;
  ending_id?: string | null;
  skin_id?: string;
}

export interface ScoreSubmissionResult {
  rank: number;
  isTopScore: boolean;
  onlineSubmitted: boolean;
  message?: string;
}

export interface ILeaderboardService {
  isOnline(): boolean;
  getPlayerName(): string;
  setPlayerName(name: string): string;
  getTopScores(limit?: number): Promise<LeaderboardEntry[]>;
  getGlobalTopScores(limit?: number): Promise<OnlineLeaderboardEntry[]>;
  submitScore(
    entry: LeaderboardEntry,
    distance?: number,
    endingId?: string | null,
    playerName?: string,
    runSessionId?: string
  ): Promise<ScoreSubmissionResult>;
}

const PLAYER_NAME_KEY = 'dont_blink_player_name';

export function getStoredPlayerName(): string {
  if (typeof window === 'undefined') return 'Runner';
  try {
    const saved = localStorage.getItem(PLAYER_NAME_KEY);
    if (saved) {
      return securityService.sanitizePlayerName(saved);
    }
  } catch {
    // Graceful fallback
  }
  return 'Runner';
}

export function setStoredPlayerName(name: string): string {
  const sanitized = securityService.sanitizePlayerName(name);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PLAYER_NAME_KEY, sanitized);
    } catch {
      // Graceful fallback
    }
  }
  return sanitized;
}

export class SupabaseLeaderboardService implements ILeaderboardService {
  private client: SupabaseClient | null = null;
  private url: string;
  private anonKey: string;

  constructor() {
    this.url =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
      'https://nqzonmdosoxdgdezngwp.supabase.co';
    this.anonKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

    this.initClient();
  }

  private initClient(): void {
    if (!this.client && this.url && this.anonKey && this.anonKey.trim() !== '') {
      try {
        this.client = createClient(this.url, this.anonKey.trim(), {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });
      } catch (err) {
        // Deferred initialisation without crashing
        console.warn("DON'T BLINK: Supabase initialization deferred.");
      }
    }
  }

  public isOnline(): boolean {
    return !!(this.client && this.anonKey && this.anonKey.trim() !== '');
  }

  public getPlayerName(): string {
    return getStoredPlayerName();
  }

  public setPlayerName(name: string): string {
    return setStoredPlayerName(name);
  }

  public async getTopScores(limit = 20): Promise<LeaderboardEntry[]> {
    const data = storage.getData();
    return [...data.history].slice(0, limit);
  }

  public async getGlobalTopScores(limit = 20): Promise<OnlineLeaderboardEntry[]> {
    this.initClient();
    if (!this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('leaderboard')
        .select('id, created_at, player_name, score, distance, run_duration, ending_id, skin_id')
        .order('score', { ascending: false })
        .limit(Math.min(50, Math.max(1, limit)));

      if (error) {
        console.warn("DON'T BLINK: Leaderboard query warning:", error.message);
        return [];
      }

      return (data as OnlineLeaderboardEntry[]) || [];
    } catch {
      // Graceful offline fallback
      return [];
    }
  }

  public async submitScore(
    entry: LeaderboardEntry,
    distance = 0,
    endingId: string | null = null,
    customPlayerName?: string,
    runSessionId?: string
  ): Promise<ScoreSubmissionResult> {
    const rawName = customPlayerName || this.getPlayerName();

    // 1. Anti-Cheat & Physical Bounds Validation
    const validation = securityService.validateRunMetrics(
      entry.score,
      distance,
      entry.durationSeconds,
      entry.coinsEarned,
      rawName,
      endingId,
      entry.skinUsed,
      runSessionId
    );

    // 2. Always record sanitized data in local storage
    const sanitizedEntry: LeaderboardEntry = {
      ...entry,
      score: validation.sanitizedScore,
      distance: validation.sanitizedDistance,
      durationSeconds: validation.sanitizedDuration,
      coinsEarned: validation.sanitizedCoins,
      playerName: validation.sanitizedPlayerName,
      endingId: validation.sanitizedEndingId,
      skinUsed: validation.sanitizedSkinId,
    };
    storage.recordRun(sanitizedEntry);

    const updated = storage.getData().history;
    const index = updated.findIndex((item) => item.id === entry.id);
    const rank = index >= 0 ? index + 1 : updated.length + 1;
    const isTopScore = rank === 1;

    // If physics validation failed (e.g. absurd score or duplicate replay session), abort online submission
    if (!validation.valid) {
      return {
        rank,
        isTopScore,
        onlineSubmitted: false,
        message: validation.reason || 'Invalid run parameters',
      };
    }

    // 3. Anti-Spam Rate Limiting Guard
    const rateLimit = securityService.checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        rank,
        isTopScore,
        onlineSubmitted: false,
        message: rateLimit.reason,
      };
    }

    // 4. Mark session consumed immediately to prevent replay attacks
    if (runSessionId) {
      securityService.markSessionConsumed(runSessionId);
    }

    // 5. Submit to Supabase if client is configured
    let onlineSubmitted = false;
    let submitMessage: string | undefined;

    this.initClient();
    if (this.client) {
      try {
        const payload = {
          player_name: validation.sanitizedPlayerName,
          score: validation.sanitizedScore,
          distance: validation.sanitizedDistance,
          run_duration: validation.sanitizedDuration,
          ending_id: validation.sanitizedEndingId,
          skin_id: validation.sanitizedSkinId,
          run_session_id: runSessionId || null,
        };

        const { error } = await this.client.from('leaderboard').insert([payload]);
        if (!error) {
          onlineSubmitted = true;
          securityService.recordOnlineSubmissionSuccess();
        } else {
          submitMessage = error.message;
          console.warn("DON'T BLINK: Supabase submission deferred:", error.message);
        }
      } catch (err: any) {
        submitMessage = 'Network connection unavailable';
        console.warn("DON'T BLINK: Supabase offline / network error:", err?.message || err);
      }
    } else {
      submitMessage = 'Offline mode: score recorded locally';
    }

    return { rank, isTopScore, onlineSubmitted, message: submitMessage };
  }
}

// Export singleton instance
export const leaderboardService: ILeaderboardService = new SupabaseLeaderboardService();
