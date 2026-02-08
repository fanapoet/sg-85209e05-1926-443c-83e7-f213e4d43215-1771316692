import { supabase } from "@/integrations/supabase/client";

/**
 * Task Data Service
 * Handles completed task history in user_task_progress table
 */

export interface CompletedTask {
  task_id: string;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  is_claimed: boolean;
  claimed_at: string | null;
  reset_at: string | null;
}

/**
 * Load completed tasks from database
 */
export async function loadCompletedTasksFromDB(
  userId: string
): Promise<CompletedTask[]> {
  try {
    const { data, error } = await supabase
      .from("user_task_progress")
      .select("task_id, current_progress, is_completed, completed_at, is_claimed, claimed_at, reset_at")
      .eq("user_id", userId) as any;

    if (error) {
      console.error("❌ [TASK-DATA-LOAD] Failed:", error);
      return [];
    }

    console.log(`✅ [TASK-DATA-LOAD] Loaded ${data?.length || 0} tasks from DB`);
    return data || [];
  } catch (error) {
    console.error("❌ [TASK-DATA-LOAD] Exception:", error);
    return [];
  }
}

/**
 * Sync completed tasks to database
 * Only syncs tasks that are CLAIMED (to prevent duplicates)
 */
export async function syncCompletedTasksToDB(
  userId: string,
  completedTasks: CompletedTask[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Only sync CLAIMED tasks (filter out completed but not claimed)
    const claimedTasks = completedTasks.filter(t => t.is_claimed);

    if (claimedTasks.length === 0) {
      console.log("ℹ️ [TASK-DATA-SYNC] No claimed tasks to sync");
      return { success: true };
    }

    console.log(`📤 [TASK-DATA-SYNC] Syncing ${claimedTasks.length} claimed tasks to server...`);

    // Prepare upsert data
    const upsertData = claimedTasks.map(task => ({
      user_id: userId,
      task_id: task.task_id,
      current_progress: task.current_progress,
      is_completed: task.is_completed,
      completed_at: task.completed_at,
      is_claimed: task.is_claimed,
      claimed_at: task.claimed_at,
      reset_at: task.reset_at || new Date().toISOString()
    }));

    // Upsert to prevent duplicates (UNIQUE constraint on user_id + task_id + reset_at)
    const { error } = await supabase
      .from("user_task_progress")
      .upsert(upsertData, {
        onConflict: "user_id,task_id,reset_at",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [TASK-DATA-SYNC] Sync failed:", error);
      console.error("❌ [TASK-DATA-SYNC] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.log(`✅ [TASK-DATA-SYNC] Synced ${claimedTasks.length} tasks successfully`);
    return { success: true };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ [TASK-DATA-SYNC] Exception:", message);
    return { success: false, error: message };
  }
}

/**
 * Merge local and server tasks
 * Server wins for claimed tasks, local wins for progress
 */
export function mergeCompletedTasks(
  localTasks: CompletedTask[],
  serverTasks: CompletedTask[]
): CompletedTask[] {
  const merged = new Map<string, CompletedTask>();

  // Start with local tasks
  localTasks.forEach(task => {
    const key = `${task.task_id}|${task.reset_at || 'current'}`;
    merged.set(key, task);
  });

  // Merge server tasks (server wins for claimed status)
  serverTasks.forEach(serverTask => {
    const key = `${serverTask.task_id}|${serverTask.reset_at || 'current'}`;
    const localTask = merged.get(key);

    if (!localTask) {
      // Server has a task we don't have locally
      merged.set(key, serverTask);
    } else {
      // Both exist - merge intelligently
      merged.set(key, {
        ...localTask,
        // Server wins for claimed status (prevent duplicate claims)
        is_claimed: serverTask.is_claimed || localTask.is_claimed,
        claimed_at: serverTask.claimed_at || localTask.claimed_at,
        // Take higher progress
        current_progress: Math.max(localTask.current_progress, serverTask.current_progress),
        is_completed: serverTask.is_completed || localTask.is_completed,
        completed_at: serverTask.completed_at || localTask.completed_at
      });
    }
  });

  const result = Array.from(merged.values());
  console.log(`🔀 [TASK-DATA-MERGE] ${localTasks.length} local + ${serverTasks.length} server = ${result.length} unique`);
  return result;
}