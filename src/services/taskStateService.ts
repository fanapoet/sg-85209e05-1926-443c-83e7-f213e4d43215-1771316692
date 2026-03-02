import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Manages user_task_state table (reset date tracking)
 * Handles daily/weekly reset date persistence
 * SIMPLIFIED TO MATCH ACTUAL USAGE PATTERN
 */

export interface TaskState {
  telegramId: number;
  userId: string;
  lastDailyReset: string;
  lastWeeklyReset: string;
}

/**
 * Get task state from database
 */
export async function getTaskState(telegramId: number): Promise<TaskState | null> {
  try {
    const { data, error } = await supabase
      .from("user_task_state")
      .select("user_id, telegram_id, last_daily_reset, last_weekly_reset")
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

    console.log("✅ [Task State] Fetched successfully");
    return {
      telegramId: data.telegram_id,
      userId: data.user_id,
      lastDailyReset: data.last_daily_reset,
      lastWeeklyReset: data.last_weekly_reset,
    };
  } catch (error) {
    console.error("❌ [Task State] Fetch exception:", error);
    return null;
  }
}

/**
 * Upsert task state to database
 * SIMPLIFIED: Just upsert with provided data (RLS policies are public)
 */
export async function upsertTaskState(state: TaskState): Promise<{ success: boolean; error?: any }> {
  try {
    console.log(`🔄 [Task State] Upserting state for telegram_id: ${state.telegramId}`);
    console.log(`🔄 [Task State] Data:`, state);

    // Simple upsert - RLS policies are public (same as user_reward_state)
    const record = {
      user_id: state.userId,
      telegram_id: state.telegramId,
      last_daily_reset: state.lastDailyReset,
      last_weekly_reset: state.lastWeeklyReset,
      updated_at: new Date().toISOString(),
    };

    console.log("🔄 [Task State] Upserting record:", record);

    const { error } = await supabase
      .from("user_task_state")
      .upsert(record, {
        onConflict: "telegram_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("❌ [Task State] Upsert error:", error.message || error);
      console.error("❌ [Task State] Error code:", error.code);
      console.error("❌ [Task State] Error details:", error.details);
      return { success: false, error: error.message || error };
    }

    console.log(`✅ [Task State] State upserted successfully`);
    return { success: true };
  } catch (error: any) {
    console.error("❌ [Task State] Unexpected upsert error:", error.message || error);
    return { success: false, error: error.message || error };
  }
}