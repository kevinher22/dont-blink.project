// Monetization Architecture: AdService (Section 13)

export const ADS_ENABLED = false;

export interface IAdService {
  isAdAvailable(placement: 'rewarded' | 'interstitial'): Promise<boolean>;
  showInterstitial(): Promise<boolean>;
  showRewarded(): Promise<boolean>;
}

class AdService implements IAdService {
  private enabled: boolean = ADS_ENABLED;

  public async isAdAvailable(_placement: 'rewarded' | 'interstitial'): Promise<boolean> {
    if (!this.enabled) return false;
    return false;
  }

  public async showInterstitial(): Promise<boolean> {
    if (!this.enabled) return false;
    // Future ad network integration (e.g. Google AdSense / AdMob)
    return true;
  }

  public async showRewarded(): Promise<boolean> {
    if (!this.enabled) return false;
    // Future rewarded video implementation
    return true;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

export const ads = new AdService();
