import { supabase } from "@/integrations/supabase/client";

export interface TaskStateData {
  telegramId: number;
  userId: string;
  lastDailyResetDate: string;
  lastWeeklyResetDate: string;
}

/**
 * Upsert task state - EXACT REWARDS PATTERN
 * Always pass both dates, never NULL
 */
export async function upsertTaskState(data: TaskStateData) {
  try {
    console.log("💾 [Task State] Upserting:", data);

    // Get Telegram user ID
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [Task State] Telegram user ID:", tgUser.id);
    
    // Find user profile by telegram_id
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

    // Upsert - EXACT REWARDS PATTERN
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
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Upserted successfully:", result);
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
 * Get task state from DB
 */
export async function getTaskState(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Get error:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      telegramId: data.telegram_id,
      userId: data.user_id,
      lastDailyResetDate: data.last_daily_reset_date,
      lastWeeklyResetDate: data.last_weekly_reset_date,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("❌ [Task State] Get exception:", error);
    return null;
  }
}