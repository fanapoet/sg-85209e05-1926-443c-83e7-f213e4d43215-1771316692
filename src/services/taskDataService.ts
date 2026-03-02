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
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toISOString().split("T")[0];
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch (e) {
    console.warn("⚠️ [Task Data] Invalid date format:", dateStr);
  }
  
  return new Date().toISOString().split("T")[0];
}

/**
 * Load task progress from database (EXACT REWARDS PATTERN)
 */
export async function loadTaskProgressFromDB(
  telegramId: string
): Promise<TaskProgress[]> {
  try {
    console.log(`📥 [Task Data] Loading progress for telegram_id: ${telegramId}`);

    // Split query to avoid "excessively deep" type instantiation error
    const { data, error } = await supabase
      .from("user_task_progress")
      .select("*")
      .eq("telegram_id", parseInt(telegramId));

    if (error) {
      console.error("❌ [Task Data] Load error:", JSON.stringify(error));
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [Task Data] No progress found in DB");
      return [];
    }

    const progress: TaskProgress[] = data.map((row: any) => ({
      taskId: row.task_id,
      currentProgress: row.current_progress,
      completed: row.completed,
      claimed: row.claimed,
      completedAt: row.completed_at,
      claimedAt: row.claimed_at,
      resetAt: normalizeDate(row.reset_at),
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", parseInt(telegramId))
      .single();

    if (profileError || !profile) {
      console.error("❌ [Task Data] Profile not found:", JSON.stringify(profileError));
      return { success: false, error: profileError };
    }

    const dbRecords = progressRecords.map((task) => ({
      user_id: profile.id,
      telegram_id: parseInt(telegramId),
      task_id: task.taskId,
      current_progress: task.currentProgress,
      completed: task.completed ?? false,
      claimed: task.claimed ?? false,
      completed_at: task.completedAt || null,
      claimed_at: task.claimedAt || null,
      reset_at: normalizeDate(task.resetAt),
      task_type: task.taskType,
      expires_at: task.expiresAt || null,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("user_task_progress")
      .upsert(dbRecords, {
        onConflict: "user_id,task_id,reset_at",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("❌ [Task Data] Sync error:", JSON.stringify(upsertError));
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

  server.forEach((task) => {
    const key = `${task.taskId}-${task.resetAt}`;
    merged.set(key, task);
  });

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