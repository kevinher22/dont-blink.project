// Analytics Service Architecture (Section 25)
// Tracks events without sending network traffic when ANALYTICS_ENABLED = false

export const ANALYTICS_ENABLED = false;

export type AnalyticsEvent =
  | 'game_started'
  | 'game_over'
  | 'score_reached'
  | 'new_record'
  | 'daily_challenge_completed'
  | 'achievement_unlocked'
  | 'skin_unlocked'
  | 'share_clicked'
  | 'revive_clicked'
  | 'ad_watched'
  | 'purchase_clicked';

class AnalyticsService {
  private enabled: boolean = ANALYTICS_ENABLED;

  public logEvent(eventName: AnalyticsEvent, params?: Record<string, string | number | boolean>): void {
    if (!this.enabled) {
      // In development or when disabled, log cleanly to dev console if needed
      // console.debug(`[Analytics (Mock)]: ${eventName}`, params);
      return;
    }

    // Future integration point (e.g. Google Analytics 4, Mixpanel, Amplitude)
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }
}

export const analytics = new AnalyticsService();
