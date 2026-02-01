import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type BuildPartInsert = Database["public"]["Tables"]["user_build_parts"]["Insert"];

// ============================================================================
// SYNC STATUS TRACKING
// ============================================================================

let isSyncing = false;
let lastSyncTime = 0;
const syncQueue: Array<() => Promise<void>> = [];
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTime,
    queueLength: syncQueue.length,
    isOnline
  };
}

export function checkOnlineStatus() {
  return isOnline;
}

// ============================================================================
// INITIAL SYNC - Called immediately after user creation
// ============================================================================

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
  console.log("🚀 [CRITICAL] Syncing initial game state for NEW USER...");
  console.log("📊 [Sync] Full game state to sync:", gameState);

  try {
    // Build the complete update object with ALL fields - cast everything explicitly
    const updates: any = {
      bz_balance: Number(gameState.bzBalance),
      bb_balance: Number(gameState.bbBalance),
      xp: Number(gameState.xp),
      tier: String(gameState.tier),
      current_energy: Number(gameState.currentEnergy),
      max_energy: Number(gameState.maxEnergy),
      energy_recovery_rate: Number(gameState.energyRecoveryRate),
      last_energy_update: new Date().toISOString(),
      booster_income_per_tap: Number(gameState.boosterIncomeTap),
      booster_energy_per_tap: Number(gameState.boosterEnergyTap),
      booster_energy_capacity: Number(gameState.boosterCapacity),
      booster_recovery_rate: Number(gameState.boosterRecovery),
      quickcharge_uses_remaining: Number(gameState.quickChargeUsesRemaining),
      quickcharge_cooldown_until: gameState.quickChargeCooldownUntil 
        ? new Date(gameState.quickChargeCooldownUntil).toISOString() 
        : null,
      total_taps: Number(gameState.totalTaps),
      taps_today: Number(gameState.todayTaps),
      idle_bz_per_hour: Number(gameState.idleBzPerHour),
      last_sync_at: new Date().toISOString(),
      sync_version: 1,
      updated_at: new Date().toISOString()
    };

    console.log("💾 [Sync] Updating profiles table with:", updates);

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (profileError) {
      console.error("❌ [Sync] Profile update failed:", profileError);
      return { success: false, error: profileError.message };
    }

    console.log("✅ [Sync] Profile updated successfully!");

    // Sync build parts if provided
    if (gameState.buildParts && gameState.buildParts.length > 0) {
      console.log("🏗️ [Sync] Syncing build parts:", gameState.buildParts.length);
      await syncBuildParts(userId, gameState.buildParts);
    }

    console.log("✅ [CRITICAL] Initial game state synced successfully!");
    lastSyncTime = Date.now();
    return { success: true };

  } catch (error) {
    console.error("❌ [CRITICAL] Initial sync failed:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// MAIN SYNC FUNCTION - Syncs current game state to DB
// ============================================================================

export async function syncPlayerState(gameState: {
  bzBalance?: number;
  bbBalance?: number;
  xp?: number;
  tier?: string;
  currentEnergy?: number;
  maxEnergy?: number;
  energyRecoveryRate?: number;
  lastEnergyUpdate?: number;
  boosterIncomeTap?: number;
  boosterEnergyTap?: number;
  boosterCapacity?: number;
  boosterRecovery?: number;
  quickChargeUsesRemaining?: number;
  quickChargeCooldownUntil?: number | null;
  quickChargeLastReset?: number;
  totalTaps?: number;
  todayTaps?: number;
  dailyTapsResetAt?: number;
  lastClaimTimestamp?: number;
  activeBuildPartId?: string | null;
  activeBuildEndTime?: number | null;
  totalReferrals?: number;
  dailyRewardStreak?: number;
  dailyRewardLastClaim?: number | null;
  nftsOwned?: string[];
  idleBzPerHour?: number;
  lastIdleClaimAt?: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!isOnline) {
    console.warn("⚠️ [Sync] Offline - sync queued");
    return { success: false, error: "Offline" };
  }

  if (isSyncing) {
    // Allow concurrent syncs to queue if needed
  }

  try {
    isSyncing = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("❌ [Sync] No authenticated user");
      return { success: false, error: "Not authenticated" };
    }

    // Get user's profile ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", user.id)
      .single();

    if (!profile) {
      console.error("❌ [Sync] Profile not found");
      return { success: false, error: "Profile not found" };
    }

    // Build update object with only provided fields - EXPLICIT TYPE CASTING
    const updates: any = {
      updated_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString()
    };

    if (gameState.bzBalance !== undefined) updates.bz_balance = Number(gameState.bzBalance);
    if (gameState.bbBalance !== undefined) updates.bb_balance = Number(gameState.bbBalance);
    if (gameState.xp !== undefined) updates.xp = Number(gameState.xp);
    if (gameState.tier !== undefined) updates.tier = String(gameState.tier);
    if (gameState.currentEnergy !== undefined) updates.current_energy = Number(gameState.currentEnergy);
    if (gameState.maxEnergy !== undefined) updates.max_energy = Number(gameState.maxEnergy);
    if (gameState.energyRecoveryRate !== undefined) updates.energy_recovery_rate = Number(gameState.energyRecoveryRate);
    if (gameState.lastEnergyUpdate !== undefined) updates.last_energy_update = new Date(Number(gameState.lastEnergyUpdate)).toISOString();
    if (gameState.boosterIncomeTap !== undefined) updates.booster_income_per_tap = Number(gameState.boosterIncomeTap);
    if (gameState.boosterEnergyTap !== undefined) updates.booster_energy_per_tap = Number(gameState.boosterEnergyTap);
    if (gameState.boosterCapacity !== undefined) updates.booster_energy_capacity = Number(gameState.boosterCapacity);
    if (gameState.boosterRecovery !== undefined) updates.booster_recovery_rate = Number(gameState.boosterRecovery);
    if (gameState.quickChargeUsesRemaining !== undefined) updates.quickcharge_uses_remaining = Number(gameState.quickChargeUsesRemaining);
    if (gameState.quickChargeCooldownUntil !== undefined) {
      updates.quickcharge_cooldown_until = gameState.quickChargeCooldownUntil ? new Date(Number(gameState.quickChargeCooldownUntil)).toISOString() : null;
    }
    if (gameState.quickChargeLastReset !== undefined) updates.quickcharge_last_reset = new Date(Number(gameState.quickChargeLastReset)).toISOString();
    if (gameState.totalTaps !== undefined) updates.total_taps = Number(gameState.totalTaps);
    if (gameState.todayTaps !== undefined) updates.taps_today = Number(gameState.todayTaps);
    if (gameState.dailyTapsResetAt !== undefined) updates.daily_taps_reset_at = new Date(Number(gameState.dailyTapsResetAt)).toISOString();
    if (gameState.lastClaimTimestamp !== undefined) updates.last_claim_timestamp = new Date(Number(gameState.lastClaimTimestamp)).toISOString();
    if (gameState.activeBuildPartId !== undefined) updates.active_build_part_id = gameState.activeBuildPartId;
    if (gameState.activeBuildEndTime !== undefined) {
      updates.active_build_end_time = gameState.activeBuildEndTime ? new Date(Number(gameState.activeBuildEndTime)).toISOString() : null;
    }
    if (gameState.totalReferrals !== undefined) updates.total_referrals = Number(gameState.totalReferrals);
    if (gameState.dailyRewardStreak !== undefined) updates.daily_reward_streak = Number(gameState.dailyRewardStreak);
    if (gameState.dailyRewardLastClaim !== undefined) {
      updates.daily_reward_last_claim = gameState.dailyRewardLastClaim ? new Date(Number(gameState.dailyRewardLastClaim)).toISOString() : null;
    }
    if (gameState.nftsOwned !== undefined) updates.nfts_owned = gameState.nftsOwned;
    if (gameState.idleBzPerHour !== undefined) updates.idle_bz_per_hour = Number(gameState.idleBzPerHour);
    if (gameState.lastIdleClaimAt !== undefined) updates.last_idle_claim_at = new Date(Number(gameState.lastIdleClaimAt)).toISOString();

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      console.error("❌ [Sync] Sync failed:", error);
      return { success: false, error: error.message };
    }

    lastSyncTime = Date.now();
    return { success: true };

  } catch (error) {
    console.error("❌ [Sync] Sync error:", error);
    return { success: false, error: String(error) };
  } finally {
    isSyncing = false;
  }
}

// ============================================================================
// BUILD PARTS SYNC
// ============================================================================

export async function syncBuildParts(
  userId: string,
  buildParts: Array<{ partId: string; level: number; isBuilding: boolean; buildEndTime: number | null }>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🏗️ [Sync] Syncing build parts for user:", userId);

    // Upsert all build parts
    const partsToUpsert: BuildPartInsert[] = buildParts.map(part => ({
      user_id: userId,
      part_id: part.partId,
      level: Number(part.level),
      is_building: Boolean(part.isBuilding),
      build_end_time: part.buildEndTime 
        ? new Date(part.buildEndTime).toISOString() 
        : null,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("user_build_parts")
      .upsert(partsToUpsert, {
        onConflict: "user_id,part_id"
      });

    if (error) {
      console.error("❌ [Sync] Build parts sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Sync] Build parts synced successfully");
    return { success: true };

  } catch (error) {
    console.error("❌ [Sync] Build parts sync error:", error);
    return { success: false, error: String(error) };
  }
}

export async function syncBuildPart(
  partKey: string,
  data: { level: number; isBuilding: boolean; buildEndTime?: number; buildStartedAt?: number; buildEndsAt?: number }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", user.id)
      .single();
      
  if (!profile) return;

  return syncBuildParts(profile.id, [{
    partId: partKey,
    level: Number(data.level),
    isBuilding: Boolean(data.isBuilding),
    buildEndTime: data.buildEndTime || data.buildEndsAt || null
  }]);
}

// ============================================================================
// LOAD PLAYER STATE FROM DB
// ============================================================================

export async function loadPlayerState(telegramId?: string | number): Promise<Profile | null> {
  try {
    let tid = telegramId;
    if (!tid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) tid = user.id;
    }
    
    if (!tid) return null;

    console.log("📥 [Sync] Loading player state for Telegram ID:", tid);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", String(tid))
      .single();

    if (error) {
      console.error("❌ [Sync] Load failed:", error);
      return null;
    }

    console.log("✅ [Sync] Player state loaded successfully");
    return data;

  } catch (error) {
    console.error("❌ [Sync] Load error:", error);
    return null;
  }
}

// ============================================================================
// TAP DATA SYNC (Debounced)
// ============================================================================

let tapSyncTimeout: NodeJS.Timeout | null = null;

export async function syncTapData(gameState: {
  bzBalance: number;
  currentEnergy: number;
  lastEnergyUpdate: number;
  totalTaps: number;
  todayTaps: number;
}): Promise<{ success: boolean; error?: string }> {
  // Clear existing timeout
  if (tapSyncTimeout) {
    clearTimeout(tapSyncTimeout);
  }

  // Debounce for 2 seconds
  return new Promise((resolve) => {
    tapSyncTimeout = setTimeout(async () => {
      const result = await syncPlayerState({
        bzBalance: Number(gameState.bzBalance),
        currentEnergy: Number(gameState.currentEnergy),
        lastEnergyUpdate: Number(gameState.lastEnergyUpdate),
        totalTaps: Number(gameState.totalTaps),
        todayTaps: Number(gameState.todayTaps)
      });
      resolve(result);
    }, 2000);
  });
}

// ============================================================================
// NFT PURCHASE
// ============================================================================

export async function purchaseNFT(
  userId: string,
  nftId: string,
  cost: number,
  currency: "BZ" | "BB"
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🎨 [Sync] Recording NFT purchase:", { userId, nftId, cost, currency });

    // Get current profile
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // Insert into user_nfts
    const { error: nftError } = await supabase
      .from("user_nfts")
      .insert({
        user_id: userId,
        nft_id: nftId,
        purchased_at: new Date().toISOString(),
        price_paid_bb: currency === 'BB' ? Number(cost) : 0
      } as any);

    if (nftError) {
      console.error("❌ [Sync] NFT insert failed:", nftError);
      return { success: false, error: nftError.message };
    }

    // Update profile with new NFT and deduct cost
    const currentNfts = Array.isArray(profile.nfts_owned) ? profile.nfts_owned : [];
    const updates: any = {
      nfts_owned: [...currentNfts, nftId],
      updated_at: new Date().toISOString()
    };

    if (currency === "BZ") {
      const currentBZ = Number(profile.bz_balance);
      updates.bz_balance = currentBZ - Number(cost);
    } else {
      const currentBB = Number(profile.bb_balance);
      // Calculate with precision, store as number
      const newBalance = currentBB - Number(cost);
      updates.bb_balance = Math.round(newBalance * 1000000) / 1000000; // 6 decimal precision
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
      console.error("❌ [Sync] NFT profile update failed:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log("✅ [Sync] NFT purchase recorded successfully");
    return { success: true };

  } catch (error) {
    console.error("❌ [Sync] NFT purchase error:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// AUTO-SYNC MANAGEMENT
// ============================================================================

let autoSyncInterval: NodeJS.Timeout | null = null;

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
  },
  intervalMs: number = 30000
) {
  console.log("🔄 [Sync] Starting auto-sync (interval:", intervalMs, "ms)");

  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
  }

  autoSyncInterval = setInterval(() => {
    const state = getGameState();
    const syncState = {
      bzBalance: Number(state.bzBalance),
      bbBalance: Number(state.bbBalance),
      xp: Number(state.xp),
      tier: state.tier,
      currentEnergy: Number(state.currentEnergy),
      maxEnergy: Number(state.maxEnergy),
      energyRecoveryRate: Number(state.energyRecoveryRate),
      lastEnergyUpdate: Number(state.lastEnergyUpdate),
      boosterIncomeTap: Number(state.boosterIncomeTap),
      boosterEnergyTap: Number(state.boosterEnergyTap),
      boosterCapacity: Number(state.boosterCapacity),
      boosterRecovery: Number(state.boosterRecovery),
      quickChargeUsesRemaining: Number(state.quickChargeUsesRemaining),
      quickChargeCooldownUntil: state.quickChargeCooldownUntil,
      totalTaps: Number(state.totalTaps),
      todayTaps: Number(state.todayTaps),
      idleBzPerHour: Number(state.idleBzPerHour)
    };
    console.log("🔄 [Sync] Periodic sync triggered");
    syncPlayerState(syncState).catch(console.error);
  }, intervalMs);

  return () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
      console.log("🛑 [Sync] Auto-sync stopped");
    }
  };
}

// ============================================================================
// MANUAL SYNC TRIGGER
// ============================================================================

export async function manualSync(gameState: any): Promise<{ success: boolean; error?: string }> {
  console.log("👆 [Sync] Manual sync triggered");
  return syncPlayerState(gameState);
}

// ============================================================================
// ONLINE/OFFLINE DETECTION
// ============================================================================

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 [Sync] Connection restored");
    isOnline = true;
  });
  window.addEventListener("offline", () => {
    console.log("📡 [Sync] Connection lost");
    isOnline = false;
  });
}