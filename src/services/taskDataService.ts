import { supabase } from "@/integrations/supabase/client";

/**
 * Task Data Service
 * Handles task completion history (write-once records)
 * FOLLOWS EXACT PATTERN FROM rewardDataService.ts
 */

/**
 * Validate timestamp
 */
function validateTimestamp(timestamp: number): number {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    return Date.now();
  }
  return timestamp;
}

/**
 * Validate and convert timestamp to ISO string
 */
function toISOString(timestamp: number): string {
  if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
    console.warn("⚠️ Invalid timestamp:", timestamp, "- using current time");
    return new Date().toISOString();
  }
  
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    console.warn("⚠️ Invalid date from timestamp:", timestamp, "- using current time");
    return new Date().toISOString();
  }
  
  return date.toISOString();
}

/**
 * Load completed tasks from database
 */
export async function loadCompletedTasksFromDB(
  telegramId: number
): Promise<Array<{ taskId: string; completedAt: number; rewardBZ: number; rewardXP: number }> | null> {
  try {
    console.log("📥 [TASK-DATA] Loading from DB for telegram_id:", telegramId);

    const { data, error } = await (supabase
      .from("user_task_progress") as any)
      .select("*")
      .eq("telegram_id", telegramId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("❌ [TASK-DATA] Load error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("📥 [TASK-DATA] No completed tasks found in DB");
      return [];
    }

    // Convert DB format to app format
    const tasks = data.map((row: any) => ({
      taskId: row.task_id,
      completedAt: new Date(row.completed_at).getTime(),
      rewardBZ: Number(row.reward_bz) || 0,
      rewardXP: Number(row.reward_xp) || 0
    }));

    console.log(`✅ [TASK-DATA] Loaded ${tasks.length} completed tasks from DB`);
    return tasks;

  } catch (error: any) {
    console.error("❌ [TASK-DATA] Load exception:", error);
    return null;
  }
}

/**
 * Sync completed tasks to database (UPSERT all local completions)
 */
export async function syncCompletedTasksToDB(
  telegramId: number,
  userId: string,
  tasks: Array<{ taskId: string; completedAt: number; rewardBZ: number; rewardXP: number }>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (tasks.length === 0) {
      console.log("⏭️ [TASK-DATA-SYNC] No tasks to sync");
      return { success: true };
    }

    console.log(`📤 [TASK-DATA-SYNC] Syncing ${tasks.length} completed tasks to DB...`);
    console.log("📤 [TASK-DATA-SYNC] Sample task:", tasks[0]);

    const upsertData = tasks.map(task => {
      const completedAt = toISOString(task.completedAt);
      console.log(`📤 [TASK-DATA-SYNC] Converting timestamp ${task.completedAt} → ${completedAt}`);
      
      return {
        user_id: userId,
        telegram_id: telegramId,
        task_id: task.taskId,
        reward_bz: task.rewardBZ,
        reward_xp: task.rewardXP,
        completed_at: completedAt
      };
    });

    console.log("📤 [TASK-DATA-SYNC] Upsert data sample:", upsertData[0]);

    const { error } = await (supabase
      .from("user_task_progress") as any)
      .upsert(upsertData, {
        onConflict: "user_id,task_id",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [TASK-DATA-SYNC] Sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [TASK-DATA-SYNC] ${tasks.length} tasks synced successfully!`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [TASK-DATA-SYNC] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge local and server completed tasks (deduplicate by taskId, keep all unique)
 */
export function mergeCompletedTasks(
  localTasks: Array<{ taskId: string; completedAt: number; rewardBZ: number; rewardXP: number }>,
  serverTasks: Array<{ taskId: string; completedAt: number; rewardBZ: number; rewardXP: number }>
): Array<{ taskId: string; completedAt: number; rewardBZ: number; rewardXP: number }> {
  const mergedMap = new Map<string, any>();

  // Add all local tasks
  localTasks.forEach(task => {
    mergedMap.set(task.taskId, task);
  });

  // Add server tasks (only if not already present)
  serverTasks.forEach(task => {
    if (!mergedMap.has(task.taskId)) {
      mergedMap.set(task.taskId, task);
    }
  });

  const merged = Array.from(mergedMap.values());
  console.log(`🔀 [TASK-DATA] Merged: ${localTasks.length} local + ${serverTasks.length} server = ${merged.length} unique`);
  return merged;
}