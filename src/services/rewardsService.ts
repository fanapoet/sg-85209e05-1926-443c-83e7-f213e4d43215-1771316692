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
 * Updates to handle reward_type/reward_amount schema
 */
export async function claimDailyReward(data: DailyClaimData) {
  try {
    console.log("💾 [Daily Reward] Recording claim:", data);

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Daily Reward] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    // Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }
    
    const records = [];
    
    // Create records for each reward type that has a value > 0
    if (data.bzClaimed > 0) {
      records.push({
        telegram_id: data.telegramId,
        user_id: profile.id,
        day: data.day,
        reward_type: 'bz',
        reward_amount: data.bzClaimed
      });
    }
    
    if (data.bbClaimed > 0) {
      records.push({
        telegram_id: data.telegramId,
        user_id: profile.id,
        day: data.day,
        reward_type: 'bb',
        reward_amount: data.bbClaimed
      });
    }
    
    if (data.xpClaimed > 0) {
      records.push({
        telegram_id: data.telegramId,
        user_id: profile.id,
        day: data.day,
        reward_type: 'xp',
        reward_amount: data.xpClaimed
      });
    }

    if (records.length === 0) {
      return { success: true, message: "No rewards to claim" };
    }

    const { data: result, error } = await supabase
      .from("user_daily_claims")
      .insert(records)
      .select();

    if (error) {
      console.error("❌ [Daily Reward] Database error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Daily Reward] Claimed successfully:", result);
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
 * Aggregates individual reward rows into DailyClaimRecord format
 */
export async function getDailyClaimHistory(userId: string): Promise<DailyClaimRecord[]> {
  try {
    // Select all columns including id
    const { data, error } = await supabase
      .from("user_daily_claims")
      .select("*")
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false });

    if (error) {
      console.error("❌ [Daily Reward] Fetch error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Group by day and approximate claimed_at time to reconstruct daily claims
    const claimsMap = new Map<number, DailyClaimRecord>();

    data.forEach((row: any) => {
      const day = row.day;
      if (!claimsMap.has(day)) {
        claimsMap.set(day, {
          id: row.id, // Use the ID of the first record found
          day: day,
          claimedAt: row.claimed_at,
          bzClaimed: 0,
          bbClaimed: 0,
          xpClaimed: 0
        });
      }

      const claim = claimsMap.get(day)!;
      
      if (row.reward_type === 'bz') claim.bzClaimed += Number(row.reward_amount);
      else if (row.reward_type === 'bb') claim.bbClaimed += Number(row.reward_amount);
      else if (row.reward_type === 'xp') claim.xpClaimed += Number(row.reward_amount);
    });

    return Array.from(claimsMap.values());
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
 */
export async function purchaseNFT(data: NFTPurchaseData) {
  try {
    console.log("💾 [NFT Purchase] Recording:", data);

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [NFT Purchase] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }
    
    const { data: result, error } = await supabase
      .from("user_nfts")
      .insert({
        telegram_id: data.telegramId,
        user_id: profile.id,
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
 */
export async function updateWeeklyChallengeProgress(data: WeeklyChallengeProgress) {
  try {
    console.log("💾 [Weekly Challenge] Updating progress:", data);

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Weekly Challenge] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const taskId = `weekly_${data.challengeKey}`;

    const { data: result, error } = await supabase
      .from("user_task_progress")
      .upsert({
        telegram_id: data.telegramId,
        user_id: profile.id,
        task_id: taskId,
        current_progress: data.progress,
        is_completed: data.isCompleted,
        claimed: data.claimed,
        completed_at: data.isCompleted ? new Date().toISOString() : null,
        claimed_at: data.claimed ? new Date().toISOString() : null,
        reset_at: new Date().toISOString()
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