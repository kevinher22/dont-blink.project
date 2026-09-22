// ==============================================================================
// DON'T BLINK — Persistent Ownership & Entitlement Synchronization Engine
// Ties purchases and bundle item unlocks to authoritative Player Identity.
// Syncs across LocalStorage, Supabase Auth user metadata, and Supabase tables.
// ==============================================================================

import { SkinId, EntitySkinId, OrbCosmeticId, PurchaseRecord } from '../types';
import { storage } from './storage';
import { getPlayerIdentity } from './identity';
import { getSupabaseClient } from './leaderboard';
import { BUNDLES, PLAYER_SKINS, ENTITY_SKINS, ORB_COSMETICS } from '../data/cosmeticsData';

export interface PlayerOwnershipState {
  playerId: string;
  purchasedBundles: string[];
  unlockedSkins: SkinId[];
  unlockedEntitySkins: EntitySkinId[];
  unlockedOrbCosmetics: OrbCosmeticId[];
  purchaseHistory: PurchaseRecord[];
  adsRemoved: boolean;
  fullStoryUnlocked: boolean;
  supporterPackUnlocked: boolean;
  lastSyncedAt: number;
}

export type OwnershipState = PlayerOwnershipState;
export type OwnershipListener = (state: PlayerOwnershipState) => void;

class OwnershipService {
  private listeners: Set<OwnershipListener> = new Set();
  private isLoading: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Immediate local hydration so no UI ever flickers to empty state
      this.hydrateFromLocal();
    }
  }

  public getState(): PlayerOwnershipState {
    const identity = getPlayerIdentity();
    return (
      this.getLocalOwnership(identity.playerId) || {
        playerId: identity.playerId,
        purchasedBundles: storage.getData().purchasedBundles || [],
        unlockedSkins: storage.getData().unlockedSkins || ['default'],
        unlockedEntitySkins: storage.getData().unlockedEntitySkins || ['entity_original'],
        unlockedOrbCosmetics: storage.getData().unlockedOrbCosmetics || ['orb_default'],
        purchaseHistory: storage.getData().purchaseHistory || [],
        adsRemoved: !!storage.getData().adsRemoved,
        fullStoryUnlocked: !!storage.getData().fullStoryUnlocked,
        supporterPackUnlocked: !!storage.getData().supporterPackUnlocked,
        lastSyncedAt: Date.now(),
      }
    );
  }

  public subscribe(listener: OwnershipListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        console.error("DON'T BLINK: Error in ownership listener", e);
      }
    });
  }

  public isOwnershipLoading(): boolean {
    return this.isLoading;
  }

  private getStorageKey(playerId: string): string {
    return `dont_blink_ownership_${playerId.trim()}`;
  }

  /**
   * Reconciles all items included in purchased bundles.
   * Ensures that any bundle in purchasedBundles guarantees unlock
   * of every runner skin, entity skin, and orb artefact inside it.
   */
  public reconcileBundles(
    bundles: string[],
    existingSkins: SkinId[] = [],
    existingEntities: EntitySkinId[] = [],
    existingOrbs: OrbCosmeticId[] = []
  ): {
    skins: SkinId[];
    entities: EntitySkinId[];
    orbs: OrbCosmeticId[];
  } {
    const skinSet = new Set<SkinId>(existingSkins);
    const entitySet = new Set<EntitySkinId>(existingEntities);
    const orbSet = new Set<OrbCosmeticId>(existingOrbs);

    // Always ensure defaults
    skinSet.add('default');
    entitySet.add('entity_original');
    orbSet.add('orb_default');

    for (const bId of bundles) {
      const bundle = BUNDLES.find((b) => b.id === bId);
      if (bundle && Array.isArray(bundle.itemIds)) {
        for (const item of bundle.itemIds) {
          if (item.type === 'player' && item.id) {
            skinSet.add(item.id as SkinId);
          } else if (item.type === 'entity' && item.id) {
            entitySet.add(item.id as EntitySkinId);
          } else if (item.type === 'orb' && item.id) {
            orbSet.add(item.id as OrbCosmeticId);
          }
        }
      }
    }

    return {
      skins: Array.from(skinSet),
      entities: Array.from(entitySet),
      orbs: Array.from(orbSet),
    };
  }

  /**
   * Reads persistent local ownership state for a given player ID.
   */
  public getLocalOwnership(playerId: string): PlayerOwnershipState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.getStorageKey(playerId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed as PlayerOwnershipState;
        }
      }
    } catch (e) {
      console.warn("DON'T BLINK: Could not parse local ownership for", playerId, e);
    }
    return null;
  }

  /**
   * Saves ownership state locally for the specified player ID.
   */
  public saveLocalOwnership(state: PlayerOwnershipState): void {
    if (typeof window === 'undefined' || !state.playerId) return;
    try {
      localStorage.setItem(this.getStorageKey(state.playerId), JSON.stringify(state));
    } catch (e) {
      console.warn("DON'T BLINK: Could not save local ownership", e);
    }
  }

  /**
   * Immediate synchronous hydration from local storage on startup.
   */
  public hydrateFromLocal(): void {
    const identity = getPlayerIdentity();
    const playerId = identity.playerId;
    const existing = this.getLocalOwnership(playerId);
    const mainSave = storage.getData();

    // Merge bundle list without losing any previously unlocked items
    const mergedBundles = Array.from(
      new Set([...(mainSave.purchasedBundles || []), ...(existing?.purchasedBundles || [])])
    );

    const reconciled = this.reconcileBundles(
      mergedBundles,
      [...(mainSave.unlockedSkins || []), ...(existing?.unlockedSkins || [])],
      [...(mainSave.unlockedEntitySkins || []), ...(existing?.unlockedEntitySkins || [])],
      [...(mainSave.unlockedOrbCosmetics || []), ...(existing?.unlockedOrbCosmetics || [])]
    );

    // Apply into storage
    for (const b of mergedBundles) storage.addPurchasedBundle(b);
    for (const s of reconciled.skins) storage.unlockSkinFree(s);
    for (const e of reconciled.entities) storage.unlockEntitySkinFree(e);
    for (const o of reconciled.orbs) storage.unlockOrbCosmetic(o);

    if (existing?.adsRemoved || mainSave.adsRemoved) storage.removeAds();
    if (existing?.fullStoryUnlocked || mainSave.fullStoryUnlocked) storage.setFullStoryUnlocked(true);
    if (existing?.supporterPackUnlocked || mainSave.supporterPackUnlocked) storage.setSupporterPackUnlocked(true);

    const mergedState: PlayerOwnershipState = {
      playerId,
      purchasedBundles: mergedBundles,
      unlockedSkins: reconciled.skins,
      unlockedEntitySkins: reconciled.entities,
      unlockedOrbCosmetics: reconciled.orbs,
      purchaseHistory: existing?.purchaseHistory || mainSave.purchaseHistory || [],
      adsRemoved: !!(existing?.adsRemoved || mainSave.adsRemoved),
      fullStoryUnlocked: !!(existing?.fullStoryUnlocked || mainSave.fullStoryUnlocked),
      supporterPackUnlocked: !!(existing?.supporterPackUnlocked || mainSave.supporterPackUnlocked),
      lastSyncedAt: Date.now(),
    };

    this.saveLocalOwnership(mergedState);
  }

  /**
   * Synchronizes ownership with backend (Supabase Auth metadata & tables)
   * and hydrates storage cache without wiping existing items.
   */
  public async syncOwnership(forceRemote = false): Promise<PlayerOwnershipState> {
    const identity = getPlayerIdentity();
    const playerId = identity.playerId;

    this.isLoading = true;
    this.notify();

    try {
      const local = this.getLocalOwnership(playerId);
      const mainSave = storage.getData();

      let remoteBundles: string[] = [];
      let remoteSkins: SkinId[] = [];
      let remoteEntities: EntitySkinId[] = [];
      let remoteOrbs: OrbCosmeticId[] = [];
      let remoteHistory: PurchaseRecord[] = [];
      let remoteAdsRemoved = false;
      let remoteFullStory = false;
      let remoteSupporter = false;

      const supabase = getSupabaseClient();
      if (supabase && identity.isAuthenticated) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const userMeta = userData?.user?.user_metadata?.dont_blink_ownership;
          if (userMeta && typeof userMeta === 'object') {
            if (Array.isArray(userMeta.purchasedBundles)) remoteBundles = userMeta.purchasedBundles;
            if (Array.isArray(userMeta.unlockedSkins)) remoteSkins = userMeta.unlockedSkins;
            if (Array.isArray(userMeta.unlockedEntitySkins)) remoteEntities = userMeta.unlockedEntitySkins;
            if (Array.isArray(userMeta.unlockedOrbCosmetics)) remoteOrbs = userMeta.unlockedOrbCosmetics;
            if (Array.isArray(userMeta.purchaseHistory)) remoteHistory = userMeta.purchaseHistory;
            if (userMeta.adsRemoved) remoteAdsRemoved = true;
            if (userMeta.fullStoryUnlocked) remoteFullStory = true;
            if (userMeta.supporterPackUnlocked) remoteSupporter = true;
          }

          // Also check database purchases table if accessible
          try {
            const { data: dbPurchases } = await supabase
              .from('purchases')
              .select('*')
              .eq('player_id', playerId);

            if (Array.isArray(dbPurchases)) {
              for (const row of dbPurchases) {
                const pid = row.product_id;
                if (pid && typeof pid === 'string') {
                  if (pid.startsWith('bundle_')) {
                    if (!remoteBundles.includes(pid)) remoteBundles.push(pid);
                  } else if (pid === 'remove_ads') {
                    remoteAdsRemoved = true;
                  } else if (pid === 'full_story') {
                    remoteFullStory = true;
                  } else if (pid === 'supporter_pack') {
                    remoteSupporter = true;
                  }
                }
              }
            }
          } catch {
            // DB table might not exist; metadata is the primary resilient store
          }
        } catch (authErr) {
          console.warn("DON'T BLINK: Remote ownership sync notice:", authErr);
        }
      }

      // Safe additive merge — NEVER delete or clear existing items
      const combinedBundles = Array.from(
        new Set([
          ...(local?.purchasedBundles || []),
          ...(mainSave.purchasedBundles || []),
          ...remoteBundles,
        ])
      );

      const reconciled = this.reconcileBundles(
        combinedBundles,
        [...(local?.unlockedSkins || []), ...(mainSave.unlockedSkins || []), ...remoteSkins],
        [...(local?.unlockedEntitySkins || []), ...(mainSave.unlockedEntitySkins || []), ...remoteEntities],
        [...(local?.unlockedOrbCosmetics || []), ...(mainSave.unlockedOrbCosmetics || []), ...remoteOrbs]
      );

      const combinedAds = !!(local?.adsRemoved || mainSave.adsRemoved || remoteAdsRemoved);
      const combinedStory = !!(local?.fullStoryUnlocked || mainSave.fullStoryUnlocked || remoteFullStory);
      const combinedSupporter = !!(local?.supporterPackUnlocked || mainSave.supporterPackUnlocked || remoteSupporter);

      // Merge transaction records
      const historyMap = new Map<string, PurchaseRecord>();
      [...(local?.purchaseHistory || []), ...(mainSave.purchaseHistory || []), ...remoteHistory].forEach(
        (rec) => {
          if (rec && rec.transaction_id) {
            historyMap.set(rec.transaction_id, rec);
          }
        }
      );
      const combinedHistory = Array.from(historyMap.values());

      // Hydrate into game storage
      for (const b of combinedBundles) storage.addPurchasedBundle(b);
      for (const s of reconciled.skins) storage.unlockSkinFree(s);
      for (const e of reconciled.entities) storage.unlockEntitySkinFree(e);
      for (const o of reconciled.orbs) storage.unlockOrbCosmetic(o);
      if (combinedAds) storage.removeAds();
      if (combinedStory) storage.setFullStoryUnlocked(true);
      if (combinedSupporter) storage.setSupporterPackUnlocked(true);
      for (const rec of combinedHistory) storage.recordPurchase(rec);

      const mergedState: PlayerOwnershipState = {
        playerId,
        purchasedBundles: combinedBundles,
        unlockedSkins: reconciled.skins,
        unlockedEntitySkins: reconciled.entities,
        unlockedOrbCosmetics: reconciled.orbs,
        purchaseHistory: combinedHistory,
        adsRemoved: combinedAds,
        fullStoryUnlocked: combinedStory,
        supporterPackUnlocked: combinedSupporter,
        lastSyncedAt: Date.now(),
      };

      this.saveLocalOwnership(mergedState);

      // Sync back to Supabase metadata if authenticated
      if (supabase && identity.isAuthenticated) {
        supabase.auth
          .updateUser({
            data: { dont_blink_ownership: mergedState },
          })
          .catch(() => {});
      }

      this.isInitialized = true;
      return mergedState;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Records a new purchase, updates all storage layers, and pushes to Supabase.
   */
  public async recordPurchase(
    productId: string,
    record: PurchaseRecord
  ): Promise<PlayerOwnershipState> {
    const identity = getPlayerIdentity();
    const playerId = identity.playerId;

    // Load latest state
    let state = this.getLocalOwnership(playerId);
    if (!state) {
      state = {
        playerId,
        purchasedBundles: storage.getData().purchasedBundles || [],
        unlockedSkins: storage.getData().unlockedSkins || ['default'],
        unlockedEntitySkins: storage.getData().unlockedEntitySkins || ['entity_original'],
        unlockedOrbCosmetics: storage.getData().unlockedOrbCosmetics || ['orb_default'],
        purchaseHistory: storage.getData().purchaseHistory || [],
        adsRemoved: !!storage.getData().adsRemoved,
        fullStoryUnlocked: !!storage.getData().fullStoryUnlocked,
        supporterPackUnlocked: !!storage.getData().supporterPackUnlocked,
        lastSyncedAt: Date.now(),
      };
    }

    // Add to history
    state.purchaseHistory.push(record);
    storage.recordPurchase(record);

    // Apply product entitlements
    if (productId === 'remove_ads') {
      state.adsRemoved = true;
      storage.removeAds();
    } else if (productId === 'full_story') {
      state.fullStoryUnlocked = true;
      storage.setFullStoryUnlocked(true);
    } else if (productId === 'supporter_pack') {
      state.supporterPackUnlocked = true;
      storage.setSupporterPackUnlocked(true);
    } else if (productId.startsWith('bundle_')) {
      if (!state.purchasedBundles.includes(productId)) {
        state.purchasedBundles.push(productId);
      }
      storage.addPurchasedBundle(productId);

      const bundle = BUNDLES.find((b) => b.id === productId);
      if (bundle) {
        for (const item of bundle.itemIds) {
          if (item.type === 'player') {
            if (!state.unlockedSkins.includes(item.id as SkinId)) {
              state.unlockedSkins.push(item.id as SkinId);
            }
            storage.unlockSkinFree(item.id as SkinId);
          } else if (item.type === 'entity') {
            if (!state.unlockedEntitySkins.includes(item.id as EntitySkinId)) {
              state.unlockedEntitySkins.push(item.id as EntitySkinId);
            }
            storage.unlockEntitySkinFree(item.id as EntitySkinId);
          } else if (item.type === 'orb') {
            if (!state.unlockedOrbCosmetics.includes(item.id as OrbCosmeticId)) {
              state.unlockedOrbCosmetics.push(item.id as OrbCosmeticId);
            }
            storage.unlockOrbCosmetic(item.id as OrbCosmeticId);
          }
        }
      }
    } else {
      // Individual skins or items
      if (PLAYER_SKINS.some((s) => s.id === productId)) {
        if (!state.unlockedSkins.includes(productId as SkinId)) {
          state.unlockedSkins.push(productId as SkinId);
        }
        storage.unlockSkinFree(productId as SkinId);
      }
      if (ENTITY_SKINS.some((e) => e.id === productId)) {
        if (!state.unlockedEntitySkins.includes(productId as EntitySkinId)) {
          state.unlockedEntitySkins.push(productId as EntitySkinId);
        }
        storage.unlockEntitySkinFree(productId as EntitySkinId);
      }
      if (ORB_COSMETICS.some((o) => o.id === productId)) {
        if (!state.unlockedOrbCosmetics.includes(productId as OrbCosmeticId)) {
          state.unlockedOrbCosmetics.push(productId as OrbCosmeticId);
        }
        storage.unlockOrbCosmetic(productId as OrbCosmeticId);
      }
    }

    // Always run bundle reconciliation to guarantee complete unlocks
    const reconciled = this.reconcileBundles(
      state.purchasedBundles,
      state.unlockedSkins,
      state.unlockedEntitySkins,
      state.unlockedOrbCosmetics
    );
    state.unlockedSkins = reconciled.skins;
    state.unlockedEntitySkins = reconciled.entities;
    state.unlockedOrbCosmetics = reconciled.orbs;
    state.lastSyncedAt = Date.now();

    // Persist locally
    this.saveLocalOwnership(state);

    // Sync to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      if (identity.isAuthenticated) {
        supabase.auth
          .updateUser({
            data: { dont_blink_ownership: state },
          })
          .catch(() => {});
      }

      // Record in Supabase purchases table if accessible
      try {
        await supabase
          .from('purchases')
          .insert({
            transaction_id: record.transaction_id,
            product_id: record.product_id,
            player_id: playerId,
            platform: record.platform,
            purchased_at: new Date(record.purchased_at).toISOString(),
            verification_status: record.verification_status,
          });
      } catch {
        // Table might not exist or network unavailable
      }
    }

    this.notify();
    return state;
  }
}

export const ownershipService = new OwnershipService();
