// Monetization Architecture: PurchaseService (Section 14)

export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  priceDisplay: string;
}

export const PRODUCTS: Record<string, ProductInfo> = {
  REMOVE_ADS: {
    id: 'remove_ads',
    name: 'Remove Ads & Supporter',
    description: 'Permanent ad-free experience plus exclusive Golden badge aura.',
    priceDisplay: '$1.99',
  },
};

export interface IPurchaseService {
  getProducts(): Promise<ProductInfo[]>;
  purchase(productId: string): Promise<{ success: boolean; message: string }>;
  restorePurchases(): Promise<boolean>;
}

class PurchaseService implements IPurchaseService {
  public async getProducts(): Promise<ProductInfo[]> {
    return Object.values(PRODUCTS);
  }

  public async purchase(productId: string): Promise<{ success: boolean; message: string }> {
    // MVP: Transparent response explaining readiness for payment gateway integration (Stripe / Google Play Billing)
    console.info(`[PurchaseService] Ready for payment provider integration for item: ${productId}`);
    return {
      success: false,
      message: 'In-app purchases will be enabled in the upcoming release. Enjoy the game completely free!',
    };
  }

  public async restorePurchases(): Promise<boolean> {
    return false;
  }
}

export const purchases = new PurchaseService();
