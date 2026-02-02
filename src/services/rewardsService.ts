import { supabase } from "@/integrations/supabase/client";

/**
 * Daily Rewards Service
 * Handles daily reward claims and history
 */

export interface DailyClaimData {
  userId: string;
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
 */
export async function claimDailyReward(data: DailyClaimData) {
  try {
    console.log("💾 [Daily Reward] Recording claim:", data);

    const { data: result, error } = await supabase
      .from("user_daily_claims")
      .insert({
        user_id: data.userId,
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
  userId: string;
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
 */
export async function purchaseNFT(data: NFTPurchaseData) {
  try {
    console.log("💾 [NFT Purchase] Recording:", data);

    const { data: result, error } = await supabase
      .from("user_nfts")
      .insert({
        user_id: data.userId,
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
  userId: string;
  challengeKey: string;
  progress: number;
  isCompleted: boolean;
  claimed: boolean;
}

/**
 * Update weekly challenge progress
 */
export async function updateWeeklyChallengeProgress(data: WeeklyChallengeProgress) {
  try {
    console.log("💾 [Weekly Challenge] Updating progress:", data);

    const taskId = `weekly_${data.challengeKey}`;

    // Upsert progress
    const { data: result, error } = await supabase
      .from("user_task_progress")
      .upsert({
        user_id: data.userId,
        task_id: taskId,
        current_progress: data.progress,
        is_completed: data.isCompleted,
        claimed: data.claimed,
        completed_at: data.isCompleted ? new Date().toISOString() : null,
        claimed_at: data.claimed ? new Date().toISOString() : null,
        reset_at: new Date().toISOString() // Weekly reset timestamp
      }, {
        onConflict: "user_id,task_id,reset_at"
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