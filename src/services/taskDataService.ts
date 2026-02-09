import { supabase } from "@/integrations/supabase/client";

/**
 * Task Data Service
 * Handles syncing task progress to/from user_task_progress table
 */

export interface TaskProgress {
  taskId: string;
  currentProgress: number;
  isCompleted: boolean;
  claimed: boolean;
  completedAt?: string;
  claimedAt?: string;
  resetAt: string;
}

/**
 * Load all task progress from database for a user
 */
export async function loadTaskProgressFromDB(
  telegramId: number
): Promise<TaskProgress[]> {
  try {
    console.log("📥 [Task Data] Loading progress for telegram_id:", telegramId);

    // Get user_id from profiles table first
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [Task Data] Profile lookup error:", profileError);
      return [];
    }

    // Now fetch task progress using the user_id (UUID from profiles, which is also in users table)
    const { data, error } = (await supabase
      .from("user_task_progress")
      .select("*")
      .eq("user_id", profile.id)
      .order("reset_at", { ascending: false })) as any;

    if (error) {
      console.error("❌ [Task Data] Load error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [Task Data] No progress found");
      return [];
    }

    console.log(`✅ [Task Data] Loaded ${data.length} task progress records`);

    return data.map((record: any) => ({
      taskId: record.task_id,
      currentProgress: record.current_progress || 0,
      isCompleted: record.is_completed || false,
      claimed: record.claimed || false,
      completedAt: record.completed_at,
      claimedAt: record.claimed_at,
      resetAt: record.reset_at
    }));
  } catch (error) {
    console.error("❌ [Task Data] Load exception:", error);
    return [];
  }
}

/**
 * Sync task progress to database
 * Uses composite unique key (user_id, task_id, reset_at)
 */
export async function syncTaskProgressToDB(
  telegramId: number,
  progressData: TaskProgress[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`💾 [Task Data] Syncing ${progressData.length} tasks for telegram_id:`, telegramId);

    if (progressData.length === 0) {
      console.log("ℹ️ [Task Data] No progress to sync");
      return { success: true };
    }

    // Get user_id from profiles table first
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [Task Data] Profile lookup error:", profileError);
      return { success: false, error: "Profile not found" };
    }

    console.log("🔵 [Task Data] Using user_id:", profile.id);

    // Upsert all task progress records
    const records = progressData.map(task => ({
      user_id: profile.id, // UUID from profiles (same as users.id)
      task_id: task.taskId,
      current_progress: task.currentProgress,
      is_completed: task.isCompleted,
      claimed: task.claimed,
      completed_at: task.completedAt || null,
      claimed_at: task.claimedAt || null,
      reset_at: task.resetAt,
      updated_at: new Date().toISOString()
    }));

    // CRITICAL: Use composite key (user_id, task_id, reset_at) for onConflict
    const { error } = (await supabase
      .from("user_task_progress")
      .upsert(records, {
        onConflict: "user_id,task_id,reset_at" // Composite unique constraint
      })) as any;

    if (error) {
      console.error("❌ [Task Data] Sync error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [Task Data] Synced ${records.length} task progress records`);
    return { success: true };
  } catch (error) {
    console.error("❌ [Task Data] Sync exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Merge local and server task progress
 * Server data takes precedence for conflicts
 */
export function mergeTaskProgress(
  local: TaskProgress[],
  server: TaskProgress[]
): TaskProgress[] {
  const merged = new Map<string, TaskProgress>();

  // Add all local progress first
  local.forEach(task => {
    const key = `${task.taskId}_${task.resetAt}`;
    merged.set(key, task);
  });

  // Server data overwrites local for same task+reset
  server.forEach(task => {
    const key = `${task.taskId}_${task.resetAt}`;
    merged.set(key, task);
  });

  const result = Array.from(merged.values());
  console.log(`🔄 [Task Data] Merged: ${local.length} local + ${server.length} server = ${result.length} unique`);
  return result;
}