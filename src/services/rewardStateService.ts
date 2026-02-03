import { supabase } from "@/integrations/supabase/client";

/**
 * Reward State Service
 * Handles syncing daily streak and weekly challenge state to/from database
 */

export interface RewardStateData {
  telegramId: number;
  userId?: string;
  dailyStreak: number;
  currentRewardWeek: number;
  lastDailyClaimDate: string | null;
  currentWeeklyPeriodStart?: string;
}

export interface RewardStateRecord {
  id: string;
  userId: string;
  telegramId: number;
  dailyStreak: number;
  currentRewardWeek: number;
  lastDailyClaimDate: string | null;
  currentWeeklyPeriodStart: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user's reward state from database
 */
export async function getRewardState(telegramId: number): Promise<RewardStateRecord | null> {
  try {
    console.log("📥 [Reward State] Fetching for telegram_id:", telegramId);

    const { data, error } = await supabase
      .from("user_reward_state")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Reward State] Fetch error:", error);
      return null;
    }

    if (!data) {
      console.log("ℹ️ [Reward State] No existing state found");
      return null;
    }

    console.log("✅ [Reward State] Fetched successfully:", data.id);
    return {
      id: data.id,
      userId: data.user_id,
      telegramId: data.telegram_id,
      dailyStreak: data.daily_streak,
      currentRewardWeek: data.current_reward_week,
      lastDailyClaimDate: data.last_daily_claim_date,
      currentWeeklyPeriodStart: data.current_weekly_period_start,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("❌ [Reward State] Fetch exception:", error);
    return null;
  }
}

/**
 * Upsert (create or update) user's reward state
 * CRITICAL: Uses auth.uid() from session, NOT passed userId for RLS compliance
 */
export async function upsertRewardState(data: RewardStateData) {
  try {
    console.log("💾 [Reward State] Upserting:", data);

    // CRITICAL: Get authenticated user's UUID from session (for RLS)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      console.error("❌ [Reward State] No authenticated session:", sessionError);
      return { success: false, error: "Not authenticated" };
    }

    const authenticatedUserId = session.user.id;
    console.log("🔐 [Reward State] Using authenticated user_id:", authenticatedUserId);

    const { data: result, error } = await supabase
      .from("user_reward_state")
      .upsert({
        telegram_id: data.telegramId,
        user_id: authenticatedUserId, // ← Use auth.uid() from session!
        daily_streak: data.dailyStreak,
        current_reward_week: data.currentRewardWeek,
        last_daily_claim_date: data.lastDailyClaimDate,
        current_weekly_period_start: data.currentWeeklyPeriodStart || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Reward State] Upsert error:", error);
      console.error("❌ [Reward State] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log("✅ [Reward State] Upserted successfully:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Reward State] Upsert exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Update only the daily claim date (lightweight update)
 */
export async function updateLastDailyClaimDate(telegramId: number, claimDate: string) {
  try {
    console.log("💾 [Reward State] Updating last claim date:", { telegramId, claimDate });

    const { data: result, error } = await supabase
      .from("user_reward_state")
      .update({
        last_daily_claim_date: claimDate,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Reward State] Update claim date error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Reward State] Claim date updated:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Reward State] Update claim date exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Increment daily streak (atomic operation)
 */
export async function incrementDailyStreak(telegramId: number, newStreak: number) {
  try {
    console.log("💾 [Reward State] Incrementing streak to:", { telegramId, newStreak });

    const { data: result, error } = await supabase
      .from("user_reward_state")
      .update({
        daily_streak: newStreak,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Reward State] Increment streak error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Reward State] Streak incremented:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Reward State] Increment streak exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Reset daily streak (when user misses a day)
 */
export async function resetDailyStreak(telegramId: number) {
  try {
    console.log("💾 [Reward State] Resetting streak for:", telegramId);

    const { data: result, error } = await supabase
      .from("user_reward_state")
      .update({
        daily_streak: 0,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Reward State] Reset streak error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Reward State] Streak reset:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Reward State] Reset streak exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Start new weekly challenge period
 */
export async function startNewWeeklyPeriod(telegramId: number, periodStart: string) {
  try {
    console.log("💾 [Reward State] Starting new weekly period:", { telegramId, periodStart });

    const { data: result, error } = await supabase
      .from("user_reward_state")
      .update({
        current_weekly_period_start: periodStart,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Reward State] Start weekly period error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Reward State] Weekly period started:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Reward State] Start weekly period exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}