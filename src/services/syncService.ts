import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Sync state management
const isSyncing = false;
const lastSyncTime = 0;
const syncQueue: Array<any> = [];
let autoSyncInterval: NodeJS.Timeout | null = null;
let isOnline = true;

// Safe type coercion for timestamps
function toTimestamp(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? Number(value) : value;
  return isNaN(num) ? null : num;
}

/**
 * Check if device is online
 */
export function checkOnlineStatus(): boolean {
  if (typeof window === "undefined") return true;
  return window.navigator.onLine;
}

/**
 * Get current sync status
 */
export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTime,
    queueLength: syncQueue.length,
    isOnline
  };
}

/**
 * Load player state from database
 */
export async function loadPlayerState() {
  try {
    console.log("🔵 [loadPlayerState] Getting Telegram user...");
    
    // Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Sync] No Telegram user data");
      return null;
    }
    
    console.log("🔵 [loadPlayerState] Telegram user ID:", tgUser.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (error) {
      console.error("❌ [Sync] Load error:", error);
      return null;
    }

    if (!data) {
      console.error("❌ [Sync] Profile not found for telegram_id:", tgUser.id);
      return null;
    }

    console.log("✅ [Sync] Player state loaded");
    return data;
  } catch (error) {
    console.error("❌ [Sync] Load exception:", error);
    return null;
  }
}

/**
 * Sync initial game state for a new user
 */
export async function syncInitialGameState(
  userId: string,
  gameState: {
    bzBalance: number;
    bbBalance: number;
    xp: number;
    tier: string;
    currentEnergy: number;
    maxEnergy: number;
    energyRecoveryRate: number;
    boosterIncomeTap: number;
    boosterEnergyTap: number;
    boosterCapacity: number;
    boosterRecovery: number;
    quickChargeUsesRemaining: number;
    quickChargeCooldownUntil: number | null;
    totalTaps: number;
    todayTaps: number;
    idleBzPerHour: number;
    buildParts?: Array<{ partId: string; level: number; isBuilding: boolean; buildEndTime: number | null }>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🚀 [Sync] Syncing initial game state for user:", userId);

    // Convert quickChargeCooldownUntil to safe timestamp
    const cooldownTimestamp = toTimestamp(gameState.quickChargeCooldownUntil);

    // Prepare complete profile update
    const updates: any = {
      bz_balance: gameState.bzBalance,
      bb_balance: gameState.bbBalance,
      xp: gameState.xp,
      tier: gameState.tier,
      current_energy: gameState.currentEnergy,
      max_energy: gameState.maxEnergy,
      energy_recovery_rate: gameState.energyRecoveryRate,
      last_energy_update: new Date().toISOString(),
      booster_income_per_tap: gameState.boosterIncomeTap,
      booster_energy_per_tap: gameState.boosterEnergyTap,
      booster_energy_capacity: gameState.boosterCapacity,
      booster_recovery_rate: gameState.boosterRecovery,
      quickcharge_uses_remaining: gameState.quickChargeUsesRemaining,
      quickcharge_cooldown_until: cooldownTimestamp 
        ? new Date(cooldownTimestamp).toISOString() 
        : null,
      total_taps: gameState.totalTaps,
      taps_today: gameState.todayTaps,
      idle_bz_per_hour: gameState.idleBzPerHour,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("❌ [Sync] Initial sync failed:", error);
      return { success: false, error: error.message };
    }

    // Sync build parts if provided
    if (gameState.buildParts && gameState.buildParts.length > 0) {
      const partsToSync = gameState.buildParts.map(p => ({
        partId: p.partId,
        level: p.level,
        isBuilding: p.isBuilding,
        buildEndsAt: p.buildEndTime // Map legacy property
      }));
      await syncBuildParts(userId, partsToSync);
    }

    console.log("✅ [Sync] Initial state synced successfully");
    return { success: true };
  } catch (error: any) {
    console.error("❌ [Sync] Initial sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync player state (main sync function)
 */
export async function syncPlayerState(gameState: Partial<{
  bzBalance: number;
  bbBalance: number;
  xp: number;
  tier: string;
  currentEnergy: number;
  maxEnergy: number;
  energyRecoveryRate: number;
  lastEnergyUpdate: number;
  boosterIncomeTap: number;
  boosterEnergyTap: number;
  boosterCapacity: number;
  boosterRecovery: number;
  quickChargeUsesRemaining: number;
  quickChargeCooldownUntil: number | null;
  quickChargeLastReset: number;
  totalTaps: number;
  todayTaps: number;
  totalReferrals: number;
  idleBzPerHour: number;
  lastClaimTimestamp: number;
  hasClaimedIdleToday: boolean;
  dailyTapsResetAt: number;
  buildStartTime: number;
  buildEndTime: number;
  nftsOwned: string[];
  buildParts: Array<{ partId: string; level: number; isBuilding: boolean; buildEndsAt: number | null }>;
}>): Promise<{ success: boolean; error?: string }> {
  console.log("🔵 [syncPlayerState] ========== FUNCTION ENTERED ==========");
  console.log("🔵 [syncPlayerState] Received gameState:", gameState);
  
  try {
    console.log("🔵 [syncPlayerState] Getting Telegram user...");
    
    // Get Telegram user ID (same as initializeUser)
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [syncPlayerState] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [syncPlayerState] Telegram user ID:", tgUser.id);
    
    // Find user profile by telegram_id (same as initializeUser)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [syncPlayerState] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [syncPlayerState] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [syncPlayerState] Found profile UUID:", profile.id);

    // Build update object with only provided fields
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (gameState.bzBalance !== undefined) updates.bz_balance = gameState.bzBalance;
    if (gameState.bbBalance !== undefined) updates.bb_balance = gameState.bbBalance;
    if (gameState.xp !== undefined) updates.xp = gameState.xp;
    if (gameState.tier !== undefined) updates.tier = gameState.tier;
    if (gameState.currentEnergy !== undefined) updates.current_energy = gameState.currentEnergy;
    if (gameState.maxEnergy !== undefined) updates.max_energy = gameState.maxEnergy;
    if (gameState.energyRecoveryRate !== undefined) updates.energy_recovery_rate = gameState.energyRecoveryRate;
    if (gameState.lastEnergyUpdate !== undefined) updates.last_energy_update = new Date(gameState.lastEnergyUpdate).toISOString();
    if (gameState.boosterIncomeTap !== undefined) updates.booster_income_per_tap = gameState.boosterIncomeTap;
    if (gameState.boosterEnergyTap !== undefined) updates.booster_energy_per_tap = gameState.boosterEnergyTap;
    if (gameState.boosterCapacity !== undefined) updates.booster_energy_capacity = gameState.boosterCapacity;
    if (gameState.boosterRecovery !== undefined) updates.booster_recovery_rate = gameState.boosterRecovery;
    if (gameState.quickChargeUsesRemaining !== undefined) updates.quickcharge_uses_remaining = gameState.quickChargeUsesRemaining;
    
    // Handle quickChargeCooldownUntil with type safety
    if (gameState.quickChargeCooldownUntil !== undefined) {
      const cooldown = toTimestamp(gameState.quickChargeCooldownUntil);
      updates.quickcharge_cooldown_until = cooldown ? new Date(cooldown).toISOString() : null;
    }
    
    if (gameState.quickChargeLastReset !== undefined) updates.quickcharge_last_reset = new Date(gameState.quickChargeLastReset).toISOString();
    if (gameState.totalTaps !== undefined) updates.total_taps = gameState.totalTaps;
    if (gameState.todayTaps !== undefined) updates.taps_today = gameState.todayTaps;
    if (gameState.totalReferrals !== undefined) updates.total_referrals = gameState.totalReferrals;
    if (gameState.idleBzPerHour !== undefined) updates.idle_bz_per_hour = gameState.idleBzPerHour;
    if (gameState.lastClaimTimestamp !== undefined) updates.last_claim_timestamp = new Date(gameState.lastClaimTimestamp).toISOString();
    if (gameState.hasClaimedIdleToday !== undefined) updates.has_claimed_idle_today = gameState.hasClaimedIdleToday;
    if (gameState.dailyTapsResetAt !== undefined) updates.daily_taps_reset_at = new Date(gameState.dailyTapsResetAt).toISOString();
    if (gameState.buildStartTime !== undefined) updates.build_start_time = new Date(gameState.buildStartTime).toISOString();
    if (gameState.buildEndTime !== undefined) updates.build_end_time = new Date(gameState.buildEndTime).toISOString();
    if (gameState.nftsOwned !== undefined) updates.nfts_owned = gameState.nftsOwned;

    console.log("🔵 [syncPlayerState] Built updates object:", updates);
    console.log("🔵 [syncPlayerState] Executing database update for profile:", profile.id);

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      console.error("❌ [Sync] Player state sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Player state synced successfully!");

    // Sync build parts if provided
    if (gameState.buildParts && gameState.buildParts.length > 0) {
      console.log("🔧 [Sync] Syncing build parts:", gameState.buildParts.length);
      const buildSyncResult = await syncBuildParts(profile.id, gameState.buildParts);
      if (buildSyncResult.success) {
        console.log("✅ [Sync] Build parts synced successfully!");
      } else {
        console.error("❌ [Sync] Build parts sync failed:", buildSyncResult.error);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ [Sync] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sync tap data (optimized for frequent updates)
 */
export async function syncTapData(tapState: {
  bzBalance: number;
  currentEnergy: number;
  lastEnergyUpdate: number;
  totalTaps: number;
  todayTaps: number;
}): Promise<{ success: boolean; error?: string }> {
  return syncPlayerState({
    bzBalance: tapState.bzBalance,
    currentEnergy: tapState.currentEnergy,
    lastEnergyUpdate: tapState.lastEnergyUpdate,
    totalTaps: tapState.totalTaps,
    todayTaps: tapState.todayTaps
  });
}

/**
 * Load build parts from database
 */
export async function loadBuildParts(): Promise<Array<{
  partId: string;
  level: number;
  isBuilding: boolean;
  buildEndsAt: number | null;
}> | null> {
  try {
    console.log("🔧 [Sync] Loading build parts from database...");

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      console.warn("⚠️ [Sync] No Telegram user for build parts load");
      return null;
    }

    // Get profile UUID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (!profile?.id) {
      console.warn("⚠️ [Sync] Profile not found for build parts load");
      return null;
    }

    // Load build parts
    const { data, error } = await supabase
      .from("user_build_parts")
      .select("part_id, current_level, is_building, build_ends_at")
      .eq("user_id", profile.id);

    if (error) {
      console.error("❌ [Sync] Build parts load failed:", error);
      return null;
    }

    // Return empty array if no parts found (not an error)
    if (!data || data.length === 0) {
      console.log("🔧 [Sync] No build parts found in database (fresh start)");
      return []; // Return empty array, not null
    }

    console.log(`✅ [Sync] Loaded ${data.length} build parts from database`);

    return data.map(part => ({
      partId: part.part_id,
      level: part.current_level,
      isBuilding: part.is_building,
      buildEndsAt: part.build_ends_at ? new Date(part.build_ends_at).getTime() : null
    }));

  } catch (error: any) {
    console.error("❌ [Sync] Build parts load exception:", error);
    return null;
  }
}

/**
 * Sync build parts to database (UPSERT - insert or update)
 */
export async function syncBuildParts(
  userId: string,
  parts: Array<{
    partId: string;
    level: number;
    isBuilding: boolean;
    buildEndsAt: number | null;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔧 [Sync] Syncing ${parts.length} build parts to database...`);
    console.log(`🔧 [Sync] User ID for sync: ${userId}`);
    console.log(`🔧 [Sync] Sample part data:`, parts[0]);

    // Check current auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log(`🔐 [Sync] Auth session check:`, sessionError ? `ERROR: ${sessionError.message}` : `✅ Session active, user: ${sessionData?.session?.user?.id}`);

    // Prepare data for upsert
    const upsertData = parts.map(part => ({
      user_id: userId,
      part_id: part.partId,
      level: part.level,
      is_building: part.isBuilding,
      build_end_time: part.buildEndsAt ? new Date(part.buildEndsAt).toISOString() : null,
    }));

    console.log("🔧 [Sync] Sample upsert record:", upsertData[0]);
    console.log("🔧 [Sync] Prepared", upsertData.length, "records for upsert");

    // Use upsert to insert or update
    const { data, error } = await supabase
      .from("user_build_parts")
      .upsert(upsertData, {
        onConflict: "user_id,part_id",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [Sync] Build parts upsert failed:", error);
      console.error("❌ [Sync] Error details:", JSON.stringify(error, null, 2));
      console.error("❌ [Sync] Error code:", error.code);
      console.error("❌ [Sync] Error message:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ [Sync] ${parts.length} build parts synced successfully!`);
    if (data) console.log(`✅ [Sync] Response data:`, data);
    
    return { success: true };

  } catch (error: any) {
    console.error("❌ [Sync] Build parts sync exception:", error);
    console.error("❌ [Sync] Exception details:", JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}

/**
 * Sync single build part (wrapper for convenience)
 */
export async function syncBuildPart(
  userId: string,
  part: { partId: string; level: number; isBuilding: boolean; buildEndsAt: number | null }
): Promise<{ success: boolean; error?: string }> {
  return syncBuildParts(userId, [part]);
}

/**
 * Purchase NFT and sync to database
 */
export async function purchaseNFT(
  userId: string,
  nftKey: string,
  cost: number,
  currency: "BZ" | "BB",
  pricePaidBb?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nfts_owned, bz_balance, bb_balance")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // Update profile with new NFT and deduct cost
    const currentNfts = Array.isArray(profile.nfts_owned) ? profile.nfts_owned : [];
    const updates: any = {
      nfts_owned: [...currentNfts, nftKey],
      updated_at: new Date().toISOString()
    };

    if (currency === "BZ") {
      updates.bz_balance = Number(profile.bz_balance) - cost;
    } else {
      const currentBB = Number(profile.bb_balance);
      updates.bb_balance = Number((currentBB - cost).toFixed(6));
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Record NFT purchase in user_nfts (correct table)
    const { error: nftError } = await supabase
      .from("user_nfts")
      .insert({
        user_id: userId,
        nft_id: nftKey, // Assuming nftKey matches nft.id structure or is valid foreign key
        price_paid_bb: pricePaidBb || (currency === "BB" ? cost : 0),
        purchased_at: new Date().toISOString()
      } as any);

    if (nftError) {
      console.error("❌ [Sync] NFT purchase record failed:", nftError);
    }

    console.log("✅ [Sync] NFT purchased and synced");
    return { success: true };
  } catch (error: any) {
    console.error("❌ [Sync] NFT purchase exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Start auto-sync system
 */
export function startAutoSync(
  getGameState: () => {
    bzBalance: number;
    bbBalance: number;
    xp: number;
    tier: string;
    currentEnergy: number;
    maxEnergy: number;
    energyRecoveryRate: number;
    lastEnergyUpdate: number;
    boosterIncomeTap: number;
    boosterEnergyTap: number;
    boosterCapacity: number;
    boosterRecovery: number;
    quickChargeUsesRemaining: number;
    quickChargeCooldownUntil: number | null;
    totalTaps: number;
    todayTaps: number;
    idleBzPerHour: number;
    buildParts?: Array<{ partId: string; level: number; isBuilding: boolean; buildEndsAt: number | null }>;
  },
  intervalMs: number = 30000
) {
  console.log("🚀 [Sync] Starting auto-sync system");

  // Stop existing interval if any
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  // Start periodic sync
  autoSyncInterval = setInterval(() => {
    const state = getGameState();
    
    console.log("⏰ [AUTO-SYNC] ========== PERIODIC SYNC TRIGGERED ==========");
    console.log("⏰ [AUTO-SYNC] Time:", new Date().toLocaleTimeString());
    console.log("⏰ [AUTO-SYNC] Build parts to sync:", state.buildParts?.length || 0);
    
    // Convert cooldown to safe timestamp
    const cooldownTimestamp = toTimestamp(state.quickChargeCooldownUntil);
    
    const syncState = {
      bzBalance: state.bzBalance,
      bbBalance: state.bbBalance,
      xp: state.xp,
      tier: state.tier,
      currentEnergy: state.currentEnergy,
      maxEnergy: state.maxEnergy,
      energyRecoveryRate: state.energyRecoveryRate,
      lastEnergyUpdate: state.lastEnergyUpdate,
      boosterIncomeTap: state.boosterIncomeTap,
      boosterEnergyTap: state.boosterEnergyTap,
      boosterCapacity: state.boosterCapacity,
      boosterRecovery: state.boosterRecovery,
      quickChargeUsesRemaining: state.quickChargeUsesRemaining,
      quickChargeCooldownUntil: cooldownTimestamp,
      totalTaps: state.totalTaps,
      todayTaps: state.todayTaps,
      idleBzPerHour: state.idleBzPerHour,
      buildParts: state.buildParts
    };
    
    console.log("🔄 [AUTO-SYNC] Calling syncPlayerState...");
    syncPlayerState(syncState)
      .then(result => {
        if (result.success) {
          console.log("✅ [AUTO-SYNC] Sync completed successfully!");
        } else {
          console.error("❌ [AUTO-SYNC] Sync failed:", result.error);
        }
      })
      .catch(err => {
        console.error("❌ [AUTO-SYNC] Sync exception:", err);
      });
  }, intervalMs);

  // Return cleanup function
  return () => {
    console.log("🛑 [Sync] Stopping auto-sync system");
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  };
}

/**
 * Sync single conversion to database (background, non-blocking)
 */
export async function syncConversionToDB(
  telegramId: number,
  conversion: {
    id: string;
    type: "bz-to-bb" | "bb-to-bz";
    input: number;
    output: number;
    bonus?: number;
    tier?: string;
    timestamp: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("💾 [Sync] Syncing conversion to DB:", conversion.type);

    const { error } = await supabase
      .from("conversion_history")
      .insert({
        telegram_id: telegramId,
        conversion_type: conversion.type,
        amount_in: conversion.input,
        amount_out: conversion.output,
        bonus_percent: conversion.bonus ? Math.round(conversion.bonus * 100) : 0,
        tier_at_conversion: conversion.tier || "Bronze",
        created_at: new Date(conversion.timestamp).toISOString()
      });

    if (error) {
      console.error("❌ [Sync] Conversion sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Conversion synced to DB");
    return { success: true };
  } catch (error: any) {
    console.error("❌ [Sync] Conversion sync exception:", error);
    return { success: false, error: error.message };
  }
}

// Monitor network status
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("📡 [Sync] Connection restored");
    isOnline = true;
  });

  window.addEventListener("offline", () => {
    console.log("📡 [Sync] Connection lost");
    isOnline = false;
  });
}