import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Sync initial game state to database on user creation
 * Uses ONLY columns that actually exist in the profiles table
 */
export async function syncInitialGameState(profile: { id: string; telegram_id: number }) {
  try {
    console.log("🚀 [Sync] Starting initial state sync for new user:", profile.id);

    const { error } = await supabase
      .from("profiles")
      .update({
        bz_balance: 5000,
        bb_balance: 0,
        xp: 0,
        tier: "Bronze",
        current_energy: 1500,
        max_energy: 1500,
        energy_recovery_rate: 0.3,
        last_energy_update: new Date().toISOString(),
        booster_income_per_tap: 1,
        booster_energy_per_tap: 1,
        booster_energy_capacity: 1,
        booster_recovery_rate: 1,
        quickcharge_uses_remaining: 5,
        quickcharge_last_reset: new Date().toISOString(),
        quickcharge_cooldown_until: null,
        last_claim_timestamp: new Date().toISOString(),
        total_taps: 0,
        taps_today: 0,
        daily_taps_reset_at: new Date().toISOString(),
        last_tap_time: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        sync_version: 1,
        last_idle_claim_at: new Date().toISOString(),
        idle_bz_per_hour: 0,
        daily_reward_streak: 0,
        daily_reward_last_claim: null,
        total_referrals: 0,
        referral_milestone_5_claimed: false,
        referral_milestone_10_claimed: false,
        referral_milestone_25_claimed: false,
        referral_milestone_50_claimed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      console.error("❌ [Sync] Initial state sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Initial state sync complete");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] Initial state sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync player state (BZ, BB, XP, Energy, Taps) to database
 * Debounced to prevent excessive writes
 */
export async function syncPlayerState(state: {
  bz: number;
  bb: number;
  xp: number;
  tier: string;
  energy: number;
  maxEnergy: number;
  totalTaps: number;
  lastClaimTimestamp: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ [Sync] No authenticated user, skipping player state sync");
      return { success: false, error: "No authenticated user" };
    }

    console.log("🔄 [Sync] Syncing player state...", {
      bz: state.bz,
      bb: state.bb,
      xp: state.xp,
      energy: state.energy,
      totalTaps: state.totalTaps,
    });

    const { error } = await supabase
      .from("profiles")
      .update({
        bz_balance: Math.floor(state.bz),
        bb_balance: state.bb,
        xp: Math.floor(state.xp),
        tier: state.tier,
        current_energy: state.energy,
        max_energy: state.maxEnergy,
        last_energy_update: new Date().toISOString(),
        total_taps: state.totalTaps,
        last_tap_time: new Date().toISOString(),
        last_claim_timestamp: new Date(state.lastClaimTimestamp).toISOString(),
        last_sync_at: new Date().toISOString(),
        sync_version: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("❌ [Sync] Player state sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Player state synced successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] Player state sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync booster levels to database
 */
export async function syncBoosters(boosters: {
  incomePerTap: number;
  energyPerTap: number;
  energyCapacity: number;
  recoveryRate: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ [Sync] No authenticated user, skipping booster sync");
      return { success: false, error: "No authenticated user" };
    }

    console.log("🔄 [Sync] Syncing boosters...", boosters);

    const maxEnergy = 1500 + (boosters.energyCapacity - 1) * 100;

    const { error } = await supabase
      .from("profiles")
      .update({
        booster_income_per_tap: boosters.incomePerTap,
        booster_energy_per_tap: boosters.energyPerTap,
        booster_energy_capacity: boosters.energyCapacity,
        booster_recovery_rate: boosters.recoveryRate,
        max_energy: maxEnergy,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("❌ [Sync] Booster sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Boosters synced successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] Booster sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync QuickCharge state to database
 */
export async function syncQuickCharge(state: {
  usesRemaining: number;
  cooldownUntil: number | null;
  lastReset: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ [Sync] No authenticated user, skipping QuickCharge sync");
      return { success: false, error: "No authenticated user" };
    }

    console.log("🔄 [Sync] Syncing QuickCharge...", state);

    const { error } = await supabase
      .from("profiles")
      .update({
        quickcharge_uses_remaining: state.usesRemaining,
        quickcharge_cooldown_until: state.cooldownUntil ? new Date(state.cooldownUntil).toISOString() : null,
        quickcharge_last_reset: new Date(state.lastReset).toISOString(),
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("❌ [Sync] QuickCharge sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] QuickCharge synced successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] QuickCharge sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync build part progress to database
 */
export async function syncBuildPart(
  partKey: string,
  state: {
    level: number;
    isBuilding: boolean;
    buildStartedAt?: number;
    buildEndsAt?: number;
  }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ [Sync] No authenticated user, skipping build part sync");
      return { success: false, error: "No authenticated user" };
    }

    console.log("🔄 [Sync] Syncing build part:", partKey, state);

    const { data: existing, error: fetchError } = await supabase
      .from("user_build_parts")
      .select("id")
      .eq("user_id", user.id)
      .eq("part_id", partKey)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ [Sync] Failed to fetch existing build part:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existing) {
      const { error } = await supabase
        .from("user_build_parts")
        .update({
          level: state.level,
          is_building: state.isBuilding,
          build_end_time: state.buildEndsAt ? new Date(state.buildEndsAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error("❌ [Sync] Build part update failed:", error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from("user_build_parts")
        .insert({
          user_id: user.id,
          part_id: partKey,
          level: state.level,
          is_building: state.isBuilding,
          build_end_time: state.buildEndsAt ? new Date(state.buildEndsAt).toISOString() : null,
        });

      if (error) {
        console.error("❌ [Sync] Build part insert failed:", error);
        return { success: false, error: error.message };
      }
    }

    console.log("✅ [Sync] Build part synced successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] Build part sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync idle BZ/hour to database
 */
export async function syncIdleProduction(bzPerHour: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("⚠️ [Sync] No authenticated user, skipping idle production sync");
      return { success: false, error: "No authenticated user" };
    }

    console.log("🔄 [Sync] Syncing idle production:", bzPerHour);

    const { error } = await supabase
      .from("profiles")
      .update({
        idle_bz_per_hour: bzPerHour,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("❌ [Sync] Idle production sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Idle production synced successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] Idle production sync failed:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load full player state from database
 */
export async function loadPlayerState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ [Sync] Load player state failed:", error);
    return null;
  }
}

/**
 * Sync tap data (Taps, Energy, BZ) - Optimized for frequent calls
 */
export async function syncTapData(data: {
  totalTaps: number;
  tapsToday: number;
  energy: number;
  bz: number;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No user" };

    const { error } = await supabase
      .from("profiles")
      .update({
        total_taps: data.totalTaps,
        taps_today: data.tapsToday,
        current_energy: data.energy,
        bz_balance: Math.floor(data.bz),
        last_tap_time: new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    // Silent fail for tap sync to avoid console spam
    return { success: false, error: String(error) };
  }
}

/**
 * Purchase NFT and sync to database
 */
export async function purchaseNFT(nftId: string, cost: number, currency: 'BZ' | 'BB') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No user" };

    // Start a transaction-like update
    // 1. Check balance and deduct
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("bz_balance, bb_balance, nfts_owned")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    if (currency === 'BZ' && profile.bz_balance < cost) {
      return { success: false, error: "Insufficient BZ" };
    }
    if (currency === 'BB' && Number(profile.bb_balance) < cost) {
      return { success: false, error: "Insufficient BB" };
    }

    // 2. Insert into user_nfts
    const { error: nftError } = await supabase
      .from("user_nfts")
      .insert({
        user_id: user.id,
        nft_id: nftId,
        // Adding price_paid_bb to satisfy type requirement, passing 0 if purchased with BZ
        price_paid_bb: currency === 'BB' ? cost : 0
      });

    if (nftError) throw nftError;

    // 3. Update profile balance and array
    // Cast existing NFTs to string[] to satisfy iterator requirement
    const existingNFTs = (profile.nfts_owned as unknown as string[]) || [];
    const updates: any = {
      updated_at: new Date().toISOString(),
      nfts_owned: [...existingNFTs, nftId] // Update the array cache too
    };

    if (currency === 'BZ') updates.bz_balance = profile.bz_balance - cost;
    if (currency === 'BB') updates.bb_balance = Number(profile.bb_balance) - cost;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error("❌ [Sync] NFT purchase failed:", error);
    return { success: false, error: String(error) };
  }
}

// Sync Status Management
let isSyncing = false;
let isOnline = true;
let syncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(callback: () => void, intervalMs = 10000) {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    if (isSyncing || !isOnline) return;
    isSyncing = true;
    try {
      await callback();
    } finally {
      isSyncing = false;
    }
  }, intervalMs);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export function getSyncStatus() {
  return { isSyncing, isOnline };
}

export function checkOnlineStatus() {
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return isOnline;
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}