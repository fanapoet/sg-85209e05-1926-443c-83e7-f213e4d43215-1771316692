import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Manages user_task_state table (reset date tracking)
 * Handles daily/weekly reset date persistence
 */

export interface TaskState {
  telegramId: number;
  userId: string;
  lastDailyResetDate: string;
  lastWeeklyResetDate: string;
}

/**
 * Get task state from database
 */
export async function getTaskState(telegramId: number): Promise<TaskState | null> {
  try {
    console.log(`📥 [Task State] Loading state for telegram_id: ${telegramId}`);

    const { data, error } = await supabase
      .from("user_task_state")
      .select("user_id, telegram_id, last_daily_reset, last_weekly_reset")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Load error:", JSON.stringify(error));
      return null;
    }

    if (!data) {
      console.log("ℹ️ [Task State] No state found in DB");
      return null;
    }

    const state: TaskState = {
      telegramId: data.telegram_id,
      userId: data.user_id,
      lastDailyResetDate: data.last_daily_reset,
      lastWeeklyResetDate: data.last_weekly_reset,
    };

    console.log(`✅ [Task State] Loaded state:`, state);
    return state;
  } catch (error) {
    console.error("❌ [Task State] Unexpected error:", error);
    return null;
  }
}

/**
 * Upsert task state to database
 */
export async function upsertTaskState(state: TaskState): Promise<{ success: boolean; error?: any }> {
  try {
    console.log(`🔄 [Task State] Upserting state for telegram_id: ${state.telegramId}`);
    console.log(`🔄 [Task State] Data:`, state);

    const { error } = await supabase
      .from("user_task_state")
      .upsert(
        {
          user_id: state.userId,
          telegram_id: state.telegramId,
          last_daily_reset: state.lastDailyResetDate,
          last_weekly_reset: state.lastWeeklyResetDate,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "telegram_id",
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error("❌ [Task State] Upsert error:", JSON.stringify(error));
      return { success: false, error };
    }

    console.log(`✅ [Task State] State upserted successfully`);
    return { success: true };
  } catch (error) {
    console.error("❌ [Task State] Unexpected upsert error:", error);
    return { success: false, error };
  }
}