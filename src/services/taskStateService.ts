import { supabase } from "@/integrations/supabase/client";

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

export async function getTaskState(telegramId: number): Promise<TaskStateRecord | null> {
  try {
    const { data, error } = await supabase
      .from("user_task_state")
      .select("id, user_id, telegram_id, last_daily_reset_date, last_weekly_reset_date, created_at, updated_at")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

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
    return null;
  }
}

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

    // EXACT REWARDS PATTERN: Simple upsert with onConflict
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

export async function updateDailyResetDate(telegramId: number, resetDate: string) {
  console.log("💾 [Task State] Updating daily reset date:", { telegramId, resetDate });
  
  return await upsertTaskState({
    telegramId,
    lastDailyResetDate: resetDate,
    lastWeeklyResetDate: null
  });
}

export async function updateWeeklyResetDate(telegramId: number, resetDate: string) {
  console.log("💾 [Task State] Updating weekly reset date:", { telegramId, resetDate });
  
  return await upsertTaskState({
    telegramId,
    lastDailyResetDate: null,
    lastWeeklyResetDate: resetDate
  });
}