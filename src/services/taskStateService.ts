import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Manages user_task_state table (reset date tracking)
 * Handles daily/weekly reset date persistence
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
    // Explicitly select columns to match DB schema exactly: last_daily_reset (no _date)
    const { data, error } = await supabase
      .from("user_task_state")
      .select("user_id, telegram_id, last_daily_reset, last_weekly_reset")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching task state:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Safely cast to ensure we handle the data regardless of strict type definition mismatches
    const typedData = data as any;

    return {
      telegramId: typedData.telegram_id,
      userId: typedData.user_id,
      // Use the correct column names from DB
      lastDailyReset: typedData.last_daily_reset,
      lastWeeklyReset: typedData.last_weekly_reset,
    };
  } catch (error) {
    console.error("Task state fetch exception:", error);
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

    // Prepare record with correct column names
    const record = {
      user_id: state.userId,
      telegram_id: state.telegramId,
      last_daily_reset: state.lastDailyReset,
      last_weekly_reset: state.lastWeeklyReset,
      updated_at: new Date().toISOString(),
    };

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