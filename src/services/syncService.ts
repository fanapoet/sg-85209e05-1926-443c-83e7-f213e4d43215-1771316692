import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Supabase Sync Service - Enhanced for Production
 * Implements local-first strategy with periodic server sync
 * Conflict resolution: Last-write-wins with monotonic rules
 * Anti-rollback: Never decrease balances, XP, or levels
 */

// Sync intervals (ms)
const SYNC_INTERVALS = {
  critical: 10000,    // 10s - BZ, BB, XP, energy, taps (frequent updates)
  standard: 30000,    // 30s - Boosters, parts, tasks
  lowPriority: 60000, // 1m - Stats, milestones
};

// Track last sync timestamps
const lastSync = {
  profile: 0,
  boosters: 0,
  buildParts: 0,
  quickCharge: 0,
  taps: 0,
};

// Sync status tracking
let syncErrorCount = 0;

/**
 * Check online status
 */
export function checkOnlineStatus(): boolean {
  if (typeof window === "undefined") return true;
  return window.navigator.onLine;
}

/**
 * Get current user's profile by telegram_id from Telegram WebApp
 * This ensures we always work with the authenticated Telegram user
 */
async function getCurrentUserProfile() {
  // Get telegram_id from Telegram WebApp
  const tgUser = typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
  
  if (!tgUser?.id) {
    console.log("❌ No Telegram user ID available");
    return null;
  }

  console.log("🔍 Looking up profile for Telegram ID:", tgUser.id);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", tgUser.id)
    .maybeSingle();

  if (error) {
    console.error("❌ Failed to get profile:", error);
    return null;
  }

  if (!profile) {
    console.log("❌ No profile found for Telegram ID:", tgUser.id);
    return null;
  }

  console.log("✅ Current user profile:", {
    id: profile.id,
    telegram_id: profile.telegram_id,
    display_name: profile.display_name,
  });

  return profile;
}

/**
 * Sync player state to Supabase
 * Merges local state with server using monotonic rules
 */
export async function syncPlayerState(localState: {
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
    if (!checkOnlineStatus()) {
      console.log("⚠️ Offline - skipping sync");
      return { success: false, error: "Offline" };
    }

    const profile = await getCurrentUserProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }

    console.log("🔄 Syncing player state for user:", profile.id);
    console.log("📊 Local state:", {
      bz: localState.bz,
      bb: localState.bb,
      xp: localState.xp,
      totalTaps: localState.totalTaps,
    });
    console.log("📊 Server state:", {
      bz: profile.bz_balance,
      bb: profile.bb_balance,
      xp: profile.xp,
      totalTaps: profile.total_taps,
    });

    // Monotonic merge: never decrease values
    const merged = {
      bz_balance: Math.max(localState.bz, Number(profile.bz_balance || 0)),
      bb_balance: Math.max(localState.bb, Number(profile.bb_balance || 0)),
      xp: Math.max(localState.xp, Number(profile.xp || 0)),
      tier: getTierFromXP(Math.max(localState.xp, Number(profile.xp || 0))),
      current_energy: localState.energy,
      max_energy: localState.maxEnergy,
      total_taps: Math.max(localState.totalTaps, Number(profile.total_taps || 0)),
      last_claim_timestamp: new Date(Math.max(
        localState.lastClaimTimestamp,
        new Date(profile.last_claim_timestamp || 0).getTime()
      )).toISOString(),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("💾 Merged state to save:", {
      bz: merged.bz_balance,
      bb: merged.bb_balance,
      xp: merged.xp,
      totalTaps: merged.total_taps,
    });

    // Update profile
    const { data, error } = await supabase
      .from("profiles")
      .update(merged)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Sync update error:", error);
      syncErrorCount++;
      return { success: false, error: error.message };
    }

    lastSync.profile = Date.now();
    syncErrorCount = 0;
    console.log("✅ Player state synced successfully:", {
      bz: merged.bz_balance,
      bb: merged.bb_balance,
      xp: merged.xp,
      totalTaps: merged.total_taps,
    });
    
    return { success: true, data };
  } catch (error) {
    console.error("❌ Sync error:", error);
    syncErrorCount++;
    return { success: false, error: String(error) };
  }
}

/**
 * Sync tap data to Supabase (high-frequency)
 */
export async function syncTapData(tapData: {
  totalTaps: number;
  tapsToday: number;
  totalTapIncome: number;
  lastTapTime: number;
}) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    console.log("🔄 Syncing tap data:", {
      totalTaps: tapData.totalTaps,
      currentDB: profile.total_taps,
    });

    const updateData = {
      total_taps: Math.max(tapData.totalTaps, Number(profile.total_taps || 0)),
      taps_today: Math.max(tapData.tapsToday, Number((profile as any).taps_today || 0)),
      last_tap_time: new Date(tapData.lastTapTime).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (error) {
      console.error("❌ Tap sync error:", error);
      return { success: false, error: error.message };
    }

    lastSync.taps = Date.now();
    console.log("✅ Tap data synced successfully! New total:", updateData.total_taps);
    return { success: true };
  } catch (error) {
    console.error("❌ Tap sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync boosters to Supabase
 */
export async function syncBoosters(boosters: {
  incomePerTap: number;
  energyPerTap: number;
  energyCapacity: number;
  recoveryRate: number;
}) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const updateData = {
      booster_income_per_tap: Math.max(boosters.incomePerTap, Number(profile.booster_income_per_tap || 1)),
      booster_energy_per_tap: Math.max(boosters.energyPerTap, Number(profile.booster_energy_per_tap || 1)),
      booster_energy_capacity: Math.max(boosters.energyCapacity, Number(profile.booster_energy_capacity || 1)),
      booster_recovery_rate: Math.max(boosters.recoveryRate, Number(profile.booster_recovery_rate || 1)),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);

    if (error) {
      console.error("❌ Booster sync error:", error);
      return { success: false, error: error.message };
    }

    lastSync.boosters = Date.now();
    console.log("✅ Boosters synced successfully!");
    return { success: true };
  } catch (error) {
    console.error("❌ Booster sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync build part progress to Supabase
 */
export async function syncBuildPart(partId: string, partData: {
  level: number;
  isBuilding: boolean;
  buildStartedAt?: number;
  buildEndsAt?: number;
}) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { data: existing } = await supabase
      .from("user_build_parts")
      .select("id, current_level")
      .eq("user_id", profile.id)
      .eq("part_id", partId)
      .maybeSingle();

    const payload = {
      current_level: Math.max(partData.level, existing?.current_level || 0),
      is_building: partData.isBuilding,
      build_started_at: partData.buildStartedAt 
        ? new Date(partData.buildStartedAt).toISOString() 
        : null,
      build_ends_at: partData.buildEndsAt 
        ? new Date(partData.buildEndsAt).toISOString() 
        : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("user_build_parts")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        console.error("❌ Build part update error:", error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from("user_build_parts")
        .insert({
          user_id: profile.id,
          part_id: partId,
          ...payload,
        });

      if (error) {
        console.error("❌ Build part insert error:", error);
        return { success: false, error: error.message };
      }
    }

    lastSync.buildParts = Date.now();
    console.log("✅ Build part synced:", partId);
    return { success: true };
  } catch (error) {
    console.error("❌ Build part sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync QuickCharge usage to Supabase
 */
export async function syncQuickCharge(quickCharge: {
  usesRemaining: number;
  cooldownEndTime?: number;
  lastReset: number;
}) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({
        quickcharge_uses_remaining: quickCharge.usesRemaining,
        quickcharge_cooldown_until: quickCharge.cooldownEndTime 
          ? new Date(quickCharge.cooldownEndTime).toISOString() 
          : null,
        quickcharge_last_reset: new Date(quickCharge.lastReset).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      console.error("❌ QuickCharge sync error:", error);
      return { success: false, error: error.message };
    }

    lastSync.quickCharge = Date.now();
    console.log("✅ QuickCharge synced successfully!");
    return { success: true };
  } catch (error) {
    console.error("❌ QuickCharge sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load player state from Supabase
 */
export async function loadPlayerState() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return { success: false, error: "Not authenticated" };
    }

    console.log("✅ Player state loaded from Supabase");
    
    return {
      success: true,
      data: {
        bz: Number(profile.bz_balance || 0),
        bb: Number(profile.bb_balance || 0),
        xp: Number(profile.xp || 0),
        tier: profile.tier || "Bronze",
        energy: Number(profile.current_energy || 1500),
        maxEnergy: Number(profile.max_energy || 1500),
        totalTaps: Number(profile.total_taps || 0),
        tapsToday: Number((profile as any).taps_today || 0),
        lastClaimTimestamp: new Date(profile.last_claim_timestamp || Date.now()).getTime(),
        lastTapTime: (profile as any).last_tap_time ? new Date((profile as any).last_tap_time).getTime() : Date.now(),
        boosters: {
          incomePerTap: Number(profile.booster_income_per_tap || 1),
          energyPerTap: Number(profile.booster_energy_per_tap || 1),
          energyCapacity: Number(profile.booster_energy_capacity || 1),
          recoveryRate: Number(profile.booster_recovery_rate || 1),
        },
        quickCharge: {
          usesRemaining: Number(profile.quickcharge_uses_remaining || 5),
          cooldownEndTime: profile.quickcharge_cooldown_until 
            ? new Date(profile.quickcharge_cooldown_until).getTime() 
            : undefined,
          lastReset: new Date(profile.quickcharge_last_reset || Date.now()).getTime(),
        },
      },
    };
  } catch (error) {
    console.error("❌ Load state error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load build parts from Supabase
 */
export async function loadBuildParts() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("user_build_parts")
      .select("*")
      .eq("user_id", profile.id);

    if (error) {
      console.error("❌ Load build parts error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Build parts loaded:", data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("❌ Load build parts error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Record conversion in history
 */
export async function recordConversion(conversion: {
  type: "BZ_TO_BB" | "BB_TO_BZ";
  amountIn: number;
  amountOut: number;
  burned: number;
  tier: string;
  tierBonus: number;
}) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("conversion_history")
      .insert({
        user_id: profile.id,
        conversion_type: conversion.type,
        amount_in: conversion.amountIn,
        amount_out: conversion.amountOut,
        burned_amount: conversion.burned,
        tier_at_conversion: conversion.tier,
        tier_bonus_percent: conversion.tierBonus,
        exchange_rate: 1000000,
      });

    if (error) {
      console.error("❌ Record conversion error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Conversion recorded");
    return { success: true };
  } catch (error) {
    console.error("❌ Record conversion error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Purchase NFT and record in database
 */
export async function purchaseNFT(nftId: string, priceBB: number) {
  try {
    if (!checkOnlineStatus()) return { success: false, error: "Offline" };

    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { data: existing } = await supabase
      .from("user_nfts")
      .select("id")
      .eq("user_id", profile.id)
      .eq("nft_id", nftId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "NFT already owned" };
    }

    const { error } = await supabase
      .from("user_nfts")
      .insert({
        user_id: profile.id,
        nft_id: nftId,
        price_paid_bb: priceBB,
      });

    if (error) {
      console.error("❌ Purchase NFT error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ NFT purchased:", nftId);
    return { success: true };
  } catch (error) {
    console.error("❌ Purchase NFT error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load owned NFTs from database
 */
export async function loadOwnedNFTs() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("user_nfts")
      .select("nft_id, purchased_at")
      .eq("user_id", profile.id);

    if (error) {
      console.error("❌ Load NFTs error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ NFTs loaded:", data?.length || 0);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("❌ Load NFTs error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  return {
    isOnline: checkOnlineStatus(),
    lastSync: {
      profile: lastSync.profile,
      boosters: lastSync.boosters,
      buildParts: lastSync.buildParts,
      quickCharge: lastSync.quickCharge,
      taps: lastSync.taps,
    },
    errorCount: syncErrorCount,
    needsSync: Date.now() - Math.min(...Object.values(lastSync)) > SYNC_INTERVALS.critical,
  };
}

// Helper: Calculate tier from XP
function getTierFromXP(xp: number): string {
  if (xp >= 500001) return "Diamond";
  if (xp >= 150001) return "Platinum";
  if (xp >= 50001) return "Gold";
  if (xp >= 10001) return "Silver";
  return "Bronze";
}

/**
 * Auto-sync manager
 */
let syncIntervals: NodeJS.Timeout[] = [];

export function startAutoSync(getGameState: () => any) {
  stopAutoSync();

  console.log("🚀 Starting auto-sync...");

  const profileInterval = setInterval(() => {
    const state = getGameState();
    if (state && typeof window !== "undefined" && checkOnlineStatus()) {
      syncPlayerState({
        bz: state.bz,
        bb: state.bb,
        xp: state.xp,
        tier: state.tier,
        energy: state.energy,
        maxEnergy: state.maxEnergy,
        totalTaps: state.totalTaps,
        lastClaimTimestamp: state.lastClaimTimestamp,
      }).catch(console.error);
    }
  }, SYNC_INTERVALS.critical);

  const boosterInterval = setInterval(() => {
    const state = getGameState();
    if (state?.boosters && typeof window !== "undefined" && checkOnlineStatus()) {
      syncBoosters({
        incomePerTap: state.boosters.incomePerTap || 1,
        energyPerTap: state.boosters.energyPerTap || 1,
        energyCapacity: state.boosters.energyCapacity || 1,
        recoveryRate: state.boosters.recoveryRate || 1,
      }).catch(console.error);
    }
  }, SYNC_INTERVALS.standard);

  const qcInterval = setInterval(() => {
    const state = getGameState();
    if (state?.quickCharge && typeof window !== "undefined" && checkOnlineStatus()) {
      syncQuickCharge({
        usesRemaining: state.quickCharge.usesRemaining || 5,
        cooldownEndTime: state.quickCharge.cooldownEndTime,
        lastReset: state.quickCharge.lastReset || Date.now(),
      }).catch(console.error);
    }
  }, SYNC_INTERVALS.lowPriority);

  syncIntervals = [profileInterval, boosterInterval, qcInterval];

  console.log("✅ Auto-sync started");
}

export function stopAutoSync() {
  syncIntervals.forEach(clearInterval);
  syncIntervals = [];
  console.log("🛑 Auto-sync stopped");
}