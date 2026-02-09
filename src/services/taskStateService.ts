import { supabase } from "@/integrations/supabase/client";

export interface TaskStateData {
  telegramId: number;
  userId: string;
  lastDailyResetDate: string | null;
  lastWeeklyResetDate: string | null;
}

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

    // Check if record exists
    const { data: existing } = await supabase
      .from("user_task_state")
      .select("id, last_daily_reset_date, last_weekly_reset_date")
      .eq("telegram_id", data.telegramId)
      .maybeSingle();

    console.log("🔵 [Task State] Existing record:", existing);

    // Build update object - only update non-null fields
    const updateData: any = {
      telegram_id: data.telegramId,
      user_id: profile.id,
      updated_at: new Date().toISOString()
    };

    // Only set daily date if it's provided (not null)
    if (data.lastDailyResetDate !== null) {
      updateData.last_daily_reset_date = data.lastDailyResetDate;
      console.log("🔵 [Task State] Setting lastDailyResetDate:", data.lastDailyResetDate);
    } else if (existing?.last_daily_reset_date) {
      // Preserve existing value if not updating
      updateData.last_daily_reset_date = existing.last_daily_reset_date;
      console.log("🔵 [Task State] Preserving existing lastDailyResetDate:", existing.last_daily_reset_date);
    }

    // Only set weekly date if it's provided (not null)
    if (data.lastWeeklyResetDate !== null) {
      updateData.last_weekly_reset_date = data.lastWeeklyResetDate;
      console.log("🔵 [Task State] Setting lastWeeklyResetDate:", data.lastWeeklyResetDate);
    } else if (existing?.last_weekly_reset_date) {
      // Preserve existing value if not updating
      updateData.last_weekly_reset_date = existing.last_weekly_reset_date;
      console.log("🔵 [Task State] Preserving existing lastWeeklyResetDate:", existing.last_weekly_reset_date);
    }

    console.log("🔵 [Task State] Final update data:", updateData);

    // Upsert with the built object
    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert(updateData, {
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

    return data;
  } catch (error) {
    console.error("❌ [Task State] Get exception:", error);
    return null;
  }
}

export async function updateDailyResetDate(telegramId: number, resetDate: string) {
  return upsertTaskState({
    telegramId,
    userId: "", // Will be fetched from profile lookup
    lastDailyResetDate: resetDate,
    lastWeeklyResetDate: null
  });
}

export async function updateWeeklyResetDate(telegramId: number, resetDate: string) {
  return upsertTaskState({
    telegramId,
    userId: "", // Will be fetched from profile lookup
    lastDailyResetDate: null,
    lastWeeklyResetDate: resetDate
  });
}