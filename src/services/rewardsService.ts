import { supabase } from "@/integrations/supabase/client";

/**
 * Daily Rewards Service
 * Handles daily reward claims and history
 */

export interface DailyClaimData {
  telegramId: number;
  userId?: string;
  day: number;
  bzClaimed: number;
  bbClaimed: number;
  xpClaimed: number;
}

export interface DailyClaimRecord {
  id: string;
  day: number;
  claimedAt: string;
  bzClaimed: number;
  bbClaimed: number;
  xpClaimed: number;
}

/**
 * Record a daily reward claim to the database
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function claimDailyReward(data: DailyClaimData) {
  try {
    console.log("💾 [Daily Reward] Recording claim:", data);

    // EXACT BUILD PATTERN: Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Daily Reward] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [Daily Reward] Telegram user ID:", tgUser.id);
    
    // EXACT BUILD PATTERN: Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [Daily Reward] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [Daily Reward] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [Daily Reward] Found profile UUID:", profile.id);

    const { data: result, error } = await supabase
      .from("user_daily_claims")
      .insert({
        telegram_id: data.telegramId,
        user_id: profile.id, // ← Use profile.id from lookup!
        day: data.day,
        bz_claimed: data.bzClaimed,
        bb_claimed: data.bbClaimed,
        xp_claimed: data.xpClaimed
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Daily Reward] Database error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Daily Reward] Claimed successfully:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Daily Reward] Unexpected error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get user's daily claim history
 */
export async function getDailyClaimHistory(userId: string): Promise<DailyClaimRecord[]> {
  try {
    const { data, error } = await supabase
      .from("user_daily_claims")
      .select("id, day, claimed_at, bz_claimed, bb_claimed, xp_claimed")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("❌ [Daily Reward] Fetch error:", error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      day: record.day,
      claimedAt: record.claimed_at,
      bzClaimed: Number(record.bz_claimed),
      bbClaimed: Number(record.bb_claimed),
      xpClaimed: Number(record.xp_claimed)
    }));
  } catch (error) {
    console.error("❌ [Daily Reward] Fetch error:", error);
    return [];
  }
}

/**
 * NFT Purchase Service
 */

export interface NFTPurchaseData {
  telegramId: number;
  userId?: string;
  nftId: string;
  pricePaid: number;
}

export interface UserNFT {
  id: string;
  nftId: string;
  purchasedAt: string;
  pricePaid: number;
}

/**
 * Record an NFT purchase to the database
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function purchaseNFT(data: NFTPurchaseData) {
  try {
    console.log("💾 [NFT Purchase] Recording:", data);

    // EXACT BUILD PATTERN: Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [NFT Purchase] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [NFT Purchase] Telegram user ID:", tgUser.id);
    
    // EXACT BUILD PATTERN: Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [NFT Purchase] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [NFT Purchase] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [NFT Purchase] Found profile UUID:", profile.id);

    const { data: result, error } = await supabase
      .from("user_nfts")
      .insert({
        telegram_id: data.telegramId,
        user_id: profile.id, // ← Use profile.id from lookup!
        nft_id: data.nftId,
        price_paid_bb: data.pricePaid
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [NFT Purchase] Database error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [NFT Purchase] Recorded successfully:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [NFT Purchase] Unexpected error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get user's owned NFTs from database
 */
export async function getUserNFTs(userId: string): Promise<UserNFT[]> {
  try {
    const { data, error } = await supabase
      .from("user_nfts")
      .select("id, nft_id, purchased_at, price_paid_bb")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("❌ [NFT] Fetch error:", error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      nftId: record.nft_id,
      purchasedAt: record.purchased_at,
      pricePaid: Number(record.price_paid_bb)
    }));
  } catch (error) {
    console.error("❌ [NFT] Fetch error:", error);
    return [];
  }
}

/**
 * Weekly Challenge Service
 * Uses user_task_progress table with weekly task IDs
 */

export interface WeeklyChallengeProgress {
  telegramId: number;
  userId?: string;
  challengeKey: string;
  progress: number;
  isCompleted: boolean;
  claimed: boolean;
}

/**
 * Update weekly challenge progress
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function updateWeeklyChallengeProgress(data: WeeklyChallengeProgress) {
  try {
    console.log("💾 [Weekly Challenge] Updating progress:", data);

    // EXACT BUILD PATTERN: Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Weekly Challenge] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [Weekly Challenge] Telegram user ID:", tgUser.id);
    
    // EXACT BUILD PATTERN: Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [Weekly Challenge] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [Weekly Challenge] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [Weekly Challenge] Found profile UUID:", profile.id);

    const taskId = `weekly_${data.challengeKey}`;

    // Upsert progress
    const { data: result, error } = await supabase
      .from("user_task_progress")
      .upsert({
        telegram_id: data.telegramId,
        user_id: profile.id, // ← Use profile.id from lookup!
        task_id: taskId,
        current_progress: data.progress,
        is_completed: data.isCompleted,
        claimed: data.claimed,
        completed_at: data.isCompleted ? new Date().toISOString() : null,
        claimed_at: data.claimed ? new Date().toISOString() : null,
        reset_at: new Date().toISOString() // Weekly reset timestamp
      }, {
        onConflict: "telegram_id,task_id,reset_at"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Weekly Challenge] Database error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Weekly Challenge] Progress updated:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Weekly Challenge] Unexpected error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get user's weekly challenge progress
 */
export async function getWeeklyChallengeProgress(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_task_progress")
      .select("task_id, current_progress, is_completed, claimed, completed_at, claimed_at")
      .eq("user_id", userId)
      .like("task_id", "weekly_%")
      .order("reset_at", { ascending: false });

    if (error) {
      console.error("❌ [Weekly Challenge] Fetch error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ [Weekly Challenge] Fetch error:", error);
    return [];
  }
}