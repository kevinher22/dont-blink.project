import { LeaderboardEntry } from '../types';
import { storage } from './storage';

export interface ILeaderboardService {
  isOnline(): boolean;
  getTopScores(): Promise<LeaderboardEntry[]>;
  submitScore(entry: LeaderboardEntry): Promise<{ rank: number; isTopScore: boolean }>;
}

export class LocalLeaderboardService implements ILeaderboardService {
  public isOnline(): boolean {
    return false; // Honest indicator: Personal / Local bests
  }

  public async getTopScores(): Promise<LeaderboardEntry[]> {
    const data = storage.getData();
    return [...data.history];
  }

  public async submitScore(entry: LeaderboardEntry): Promise<{ rank: number; isTopScore: boolean }> {
    storage.recordRun(entry);
    const updated = storage.getData().history;
    const index = updated.findIndex((item) => item.id === entry.id);
    const rank = index >= 0 ? index + 1 : updated.length + 1;
    const isTopScore = rank === 1;

    return { rank, isTopScore };
  }
}

// Global active instance (can easily be swapped with OnlineLeaderboardService)
export const leaderboardService: ILeaderboardService = new LocalLeaderboardService();
