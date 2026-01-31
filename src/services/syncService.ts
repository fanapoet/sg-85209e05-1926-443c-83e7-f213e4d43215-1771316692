import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Supabase Sync Service
 * Implements local-first strategy with periodic server sync
 * Conflict resolution: Last-write-wins with monotonic rules
 */

// Sync intervals (ms)
const SYNC_INTERVALS = {
  critical: 10000,    // 10s - BZ, BB, XP, energy (frequent updates)
  standard: 30000,    // 30s - Boosters, parts, tasks
  lowPriority: 60000, // 1m - Stats, milestones
};

// Track last sync timestamps
const lastSync = {
  profile: 0,
  boosters: 0,
  buildParts: 0,
  quickCharge: 0,
};

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get current server state
    const { data: serverProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.error("Sync fetch error:", fetchError);
      return { success: false, error: fetchError.message };
    }

    // Monotonic merge: never decrease values
    const merged: ProfileUpdate = {
      bz_balance: Math.max(localState.bz, serverProfile?.bz_balance || 0),
      bb_balance: Math.max(localState.bb, Number(serverProfile?.bb_balance || 0)),
      xp: Math.max(localState.xp, serverProfile?.xp || 0),
      tier: getTierFromXP(Math.max(localState.xp, serverProfile?.xp || 0)),
      current_energy: localState.energy,
      max_energy: localState.maxEnergy,
      total_taps: Math.max(localState.totalTaps, serverProfile?.total_taps || 0),
      last_claim_timestamp: new Date(Math.max(
        localState.lastClaimTimestamp,
        new Date(serverProfile?.last_claim_timestamp || 0).getTime()
      )).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update server
    const { data, error } = await supabase
      .from("profiles")
      .update(merged)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Sync update error:", error);
      return { success: false, error: error.message };
    }

    lastSync.profile = Date.now();
    return { success: true, data };
  } catch (error) {
    console.error("Sync error:", error);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update({
        booster_income_per_tap: boosters.incomePerTap,
        booster_energy_per_tap: boosters.energyPerTap,
        booster_energy_capacity: boosters.energyCapacity,
        booster_recovery_rate: boosters.recoveryRate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Booster sync error:", error);
      return { success: false, error: error.message };
    }

    lastSync.boosters = Date.now();
    return { success: true };
  } catch (error) {
    console.error("Booster sync error:", error);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check if part exists
    const { data: existing } = await supabase
      .from("user_build_parts")
      .select("id, current_level")
      .eq("user_id", user.id)
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
      // Update
      const { error } = await supabase
        .from("user_build_parts")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        console.error("Build part update error:", error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert
      const { error } = await supabase
        .from("user_build_parts")
        .insert({
          user_id: user.id,
          part_id: partId,
          ...payload,
        });

      if (error) {
        console.error("Build part insert error:", error);
        return { success: false, error: error.message };
      }
    }

    lastSync.buildParts = Date.now();
    return { success: true };
  } catch (error) {
    console.error("Build part sync error:", error);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

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
      .eq("id", user.id);

    if (error) {
      console.error("QuickCharge sync error:", error);
      return { success: false, error: error.message };
    }

    lastSync.quickCharge = Date.now();
    return { success: true };
  } catch (error) {
    console.error("QuickCharge sync error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load player state from Supabase
 * Used on app start or after logout/login
 */
export async function loadPlayerState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Load state error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        bz: data.bz_balance || 0,
        bb: Number(data.bb_balance || 0),
        xp: data.xp || 0,
        tier: data.tier || "Bronze",
        energy: data.current_energy || 1500,
        maxEnergy: data.max_energy || 1500,
        totalTaps: data.total_taps || 0,
        lastClaimTimestamp: new Date(data.last_claim_timestamp || Date.now()).getTime(),
        boosters: {
          incomePerTap: data.booster_income_per_tap || 1,
          energyPerTap: data.booster_energy_per_tap || 1,
          energyCapacity: data.booster_energy_capacity || 1,
          recoveryRate: data.booster_recovery_rate || 1,
        },
        quickCharge: {
          usesRemaining: data.quickcharge_uses_remaining || 5,
          cooldownEndTime: data.quickcharge_cooldown_until 
            ? new Date(data.quickcharge_cooldown_until).getTime() 
            : undefined,
          lastReset: new Date(data.quickcharge_last_reset || Date.now()).getTime(),
        },
      },
    };
  } catch (error) {
    console.error("Load state error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load build parts from Supabase
 */
export async function loadBuildParts() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("user_build_parts")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Load build parts error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Load build parts error:", error);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("conversion_history")
      .insert({
        user_id: user.id,
        conversion_type: conversion.type,
        amount_in: conversion.amountIn,
        amount_out: conversion.amountOut,
        burned_amount: conversion.burned,
        tier_at_conversion: conversion.tier,
        tier_bonus_percent: conversion.tierBonus,
        exchange_rate: 1000000, // 1M BZ = 1 BB
      });

    if (error) {
      console.error("Record conversion error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Record conversion error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Purchase NFT and record in database
 */
export async function purchaseNFT(nftId: string, priceBB: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check if already owned
    const { data: existing } = await supabase
      .from("user_nfts")
      .select("id")
      .eq("user_id", user.id)
      .eq("nft_id", nftId)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "NFT already owned" };
    }

    // Insert purchase
    const { error } = await supabase
      .from("user_nfts")
      .insert({
        user_id: user.id,
        nft_id: nftId,
        price_paid_bb: priceBB,
      });

    if (error) {
      console.error("Purchase NFT error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Purchase NFT error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load owned NFTs from database
 */
export async function loadOwnedNFTs() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("user_nfts")
      .select("nft_id, purchased_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Load NFTs error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Load NFTs error:", error);
    return { success: false, error: String(error) };
  }
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
 * Call this once on app start to enable background sync
 */
let syncIntervals: NodeJS.Timeout[] = [];

export function startAutoSync(getGameState: () => any) {
  // Clear existing intervals
  stopAutoSync();

  // Sync player state every 30s
  const profileInterval = setInterval(() => {
    const state = getGameState();
    if (state && typeof window !== "undefined") {
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

  // Sync boosters every 30s
  const boosterInterval = setInterval(() => {
    const state = getGameState();
    if (state?.boosters && typeof window !== "undefined") {
      syncBoosters({
        incomePerTap: state.boosters.incomePerTap || 1,
        energyPerTap: state.boosters.energyPerTap || 1,
        energyCapacity: state.boosters.energyCapacity || 1,
        recoveryRate: state.boosters.recoveryRate || 1,
      }).catch(console.error);
    }
  }, SYNC_INTERVALS.standard);

  // Sync QuickCharge every 1m
  const qcInterval = setInterval(() => {
    const state = getGameState();
    if (state?.quickCharge && typeof window !== "undefined") {
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