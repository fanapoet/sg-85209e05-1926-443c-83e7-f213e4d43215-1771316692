import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Handles syncing daily/weekly task reset state to/from database
 * FOLLOWS EXACT PATTERN FROM rewardStateService.ts
 */

export interface TaskStateData {
  telegramId: number;
  userId?: string;
  lastDailyResetDate: string | null;
  lastWeeklyResetDate: string | null;
}

export interface TaskStateRecord {
  id: string;
  userId: string;
  telegramId: number;
  lastDailyResetDate: string | null;
  lastWeeklyResetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user's task state from database
 */
export async function getTaskState(telegramId: number): Promise<TaskStateRecord | null> {
  try {
    console.log("📥 [Task State] Fetching for telegram_id:", telegramId);

    const { data, error } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Fetch error:", error);
      return null;
    }

    if (!data) {
      console.log("ℹ️ [Task State] No existing state found");
      return null;
    }

    console.log("✅ [Task State] Fetched successfully:", data.id);
    return {
      id: data.id,
      userId: data.user_id,
      telegramId: data.telegram_id,
      lastDailyResetDate: data.last_daily_reset_date,
      lastWeeklyResetDate: data.last_weekly_reset_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("❌ [Task State] Fetch exception:", error);
    return null;
  }
}

/**
 * Upsert (create or update) user's task state
 * USES EXACT REWARDS AUTHENTICATION PATTERN
 */
export async function upsertTaskState(data: TaskStateData) {
  try {
    console.log("💾 [Task State] Upserting:", data);

    // EXACT REWARDS PATTERN: Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [Task State] Telegram user ID:", tgUser.id);
    
    // EXACT REWARDS PATTERN: Find user profile by telegram_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [Task State] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [Task State] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [Task State] Found profile UUID:", profile.id);

    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: data.telegramId,
        user_id: profile.id,
        last_daily_reset_date: data.lastDailyResetDate,
        last_weekly_reset_date: data.lastWeeklyResetDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Task State] Upsert error:", error);
      console.error("❌ [Task State] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Upserted successfully:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task State] Upsert exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Update daily reset date (lightweight update)
 */
export async function updateDailyResetDate(telegramId: number, resetDate: string) {
  try {
    console.log("💾 [Task State] Updating daily reset date:", { telegramId, resetDate });

    const { data: result, error } = await supabase
      .from("user_task_state")
      .update({
        last_daily_reset_date: resetDate,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Task State] Update daily reset error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Daily reset date updated:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task State] Update daily reset exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Update weekly reset date (lightweight update)
 */
export async function updateWeeklyResetDate(telegramId: number, resetDate: string) {
  try {
    console.log("💾 [Task State] Updating weekly reset date:", { telegramId, resetDate });

    const { data: result, error } = await supabase
      .from("user_task_state")
      .update({
        last_weekly_reset_date: resetDate,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Task State] Update weekly reset error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Weekly reset date updated:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task State] Update weekly reset exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}