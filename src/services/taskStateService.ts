import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Handles syncing task reset dates to/from database
 * Follows EXACT pattern from rewardStateService.ts
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
 * Fetch user's task reset state from database
 */
export async function getTaskState(telegramId: number): Promise<TaskStateRecord | null> {
  try {
    console.log("📥 [Task State] Fetching for telegram_id:", telegramId);

    const { data, error } = await supabase
      .from("user_task_state")
      .select("id, user_id, telegram_id, last_daily_reset_date, last_weekly_reset_date, created_at, updated_at")
      .eq("telegram_id", telegramId)
      .is("task_id", null)
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
 * Upsert (create or update) user's task reset state
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
        task_id: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id,task_id"
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Upsert error:", error);
      console.error("❌ [Task State] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Upserted successfully:", result?.id);
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
 * Update daily reset date (creates record if doesn't exist)
 * REWRITTEN to use UPSERT pattern like Rewards
 */
export async function updateDailyResetDate(telegramId: number, resetDate: string) {
  try {
    console.log("💾 [Task State] Updating daily reset date:", { telegramId, resetDate });

    // 1. Get Telegram user and profile (REQUIRED for RLS)
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      console.error("❌ [Task State] Profile lookup error:", profileError);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [Task State] Found profile UUID:", profile.id);

    // 2. Get existing record (to preserve weekly date)
    const existing = await getTaskState(telegramId);
    
    // 3. UPSERT with merged data
    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: telegramId,
        user_id: profile.id,
        task_id: null,
        last_daily_reset_date: resetDate,
        last_weekly_reset_date: existing?.lastWeeklyResetDate || resetDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id,task_id"
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Update daily reset error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Daily reset date updated:", result?.id);
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
 * Update weekly reset date (creates record if doesn't exist)
 * REWRITTEN to use UPSERT pattern like Rewards
 */
export async function updateWeeklyResetDate(telegramId: number, resetDate: string) {
  try {
    console.log("💾 [Task State] Updating weekly reset date:", { telegramId, resetDate });

    // 1. Get Telegram user and profile (REQUIRED for RLS)
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      console.error("❌ [Task State] Profile lookup error:", profileError);
      return { success: false, error: "Profile not found" };
    }
    
    console.log("🔵 [Task State] Found profile UUID:", profile.id);

    // 2. Get existing record (to preserve daily date)
    const existing = await getTaskState(telegramId);
    
    // 3. UPSERT with merged data
    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: telegramId,
        user_id: profile.id,
        task_id: null,
        last_daily_reset_date: existing?.lastDailyResetDate || resetDate,
        last_weekly_reset_date: resetDate,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id,task_id"
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Update weekly reset error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Weekly reset date updated:", result?.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task State] Update weekly reset exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}