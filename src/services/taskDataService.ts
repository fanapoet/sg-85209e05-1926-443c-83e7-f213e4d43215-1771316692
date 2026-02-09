import { supabase } from "@/integrations/supabase/client";

/**
 * Task Data Service
 * Handles CRUD operations for user_task_progress table
 * Follows EXACT rewards pattern for consistency
 */

export interface TaskProgress {
  taskId: string;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
  completedAt?: string;
  claimedAt?: string;
  resetAt: string;
  taskType: string;
  expiresAt?: string;
}

/**
 * Load task progress from database (EXACT REWARDS PATTERN)
 */
export async function loadTaskProgressFromDB(
  telegramId: string
): Promise<TaskProgress[]> {
  try {
    console.log(`📥 [Task Data] Loading progress for telegram_id: ${telegramId}`);

    // Use any cast to bypass strict typing issues with custom/renamed columns
    const { data, error } = await supabase
      .from("user_task_progress")
      .select("*")
      .eq("telegram_id", parseInt(telegramId) as any);

    if (error) {
      console.error("❌ [Task Data] Load error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [Task Data] No progress found in DB");
      return [];
    }

    // Map DB columns to interface with explicit casting for safety
    const progress: TaskProgress[] = (data as any[]).map((row) => ({
      taskId: row.task_id,
      currentProgress: row.current_progress,
      completed: row.completed, // Now matches DB column name
      claimed: row.claimed,     // Now matches DB column name
      completedAt: row.completed_at,
      claimedAt: row.claimed_at,
      resetAt: row.reset_at,
      taskType: row.task_type,
      expiresAt: row.expires_at,
    }));

    console.log(`✅ [Task Data] Loaded ${progress.length} progress records`);
    return progress;
  } catch (error) {
    console.error("❌ [Task Data] Unexpected error:", error);
    return [];
  }
}

/**
 * Sync task progress to database (EXACT REWARDS PATTERN)
 */
export async function syncTaskProgressToDB(
  telegramId: string,
  progressRecords: TaskProgress[]
): Promise<{ success: boolean; error?: any }> {
  try {
    if (progressRecords.length === 0) {
      console.log("ℹ️ [Task Data] No progress to sync");
      return { success: true };
    }

    console.log(`🔄 [Task Data] Syncing ${progressRecords.length} records for telegram_id: ${telegramId}`);

    // Get user_id from profiles (EXACT REWARDS PATTERN)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (profileError || !profile) {
      console.error("❌ [Task Data] Profile not found:", profileError);
      return { success: false, error: profileError };
    }

    // Prepare records for upsert
    const dbRecords = progressRecords.map((task) => ({
      user_id: profile.id,
      telegram_id: parseInt(telegramId), // Ensure numeric for bigint column
      task_id: task.taskId,
      current_progress: task.currentProgress,
      completed: task.completed,
      claimed: task.claimed,
      completed_at: task.completedAt || null,
      claimed_at: task.claimedAt || null,
      reset_at: task.resetAt,
      task_type: task.taskType,
      expires_at: task.expiresAt || null,
      updated_at: new Date().toISOString(),
    }));

    // Upsert with composite unique key (user_id, task_id, reset_at)
    // Cast to any to bypass type checks on dynamic/renamed columns
    const { error: upsertError } = await supabase
      .from("user_task_progress")
      .upsert(dbRecords as any, {
        onConflict: "user_id,task_id,reset_at",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("❌ [Task Data] Sync error:", upsertError);
      return { success: false, error: upsertError };
    }

    console.log(`✅ [Task Data] Synced ${progressRecords.length} records successfully`);
    return { success: true };
  } catch (error) {
    console.error("❌ [Task Data] Unexpected sync error:", error);
    return { success: false, error };
  }
}

/**
 * Merge local and server task progress (EXACT REWARDS PATTERN)
 */
export function mergeTaskProgress(
  local: TaskProgress[],
  server: TaskProgress[]
): TaskProgress[] {
  const merged = new Map<string, TaskProgress>();

  // Add all server records first (server is source of truth)
  server.forEach((task) => {
    const key = `${task.taskId}-${task.resetAt}`;
    merged.set(key, task);
  });

  // Add local records that don't exist on server
  local.forEach((task) => {
    const key = `${task.taskId}-${task.resetAt}`;
    if (!merged.has(key)) {
      merged.set(key, task);
    }
  });

  const result = Array.from(merged.values());
  console.log(
    `🔀 [Task Data] Merged tasks: ${local.length} local + ${server.length} server = ${result.length} unique`
  );
  return result;
}