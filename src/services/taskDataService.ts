import { supabase } from "@/integrations/supabase/client";

/**
 * Task Data Service
 * Handles task progress records (transactions)
 * Follows EXACT pattern from rewardDataService.ts
 * USES user_task_progress TABLE (not user_task_state)
 */

export interface TaskProgressRecord {
  taskId: string;
  taskType: "daily" | "weekly" | "progressive";
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt?: string;
  claimedAt?: string;
  resetAt?: string;
  expiresAt?: string;
  timestamp: number;
}

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
 * Load task progress from database
 * USES user_task_progress TABLE
 */
export async function loadTaskProgressFromDB(
  telegramId: number
): Promise<TaskProgressRecord[] | null> {
  try {
    console.log("📥 [TASK-PROGRESS] Loading from DB for telegram_id:", telegramId);

    const { data, error } = await supabase
      .from("user_task_progress")
      .select("*")
      .eq("telegram_id", telegramId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ [TASK-PROGRESS] Load error:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log("📥 [TASK-PROGRESS] No progress found in DB (fresh start)");
      return [];
    }

    const records = data.map((row: any) => ({
      taskId: row.task_id,
      taskType: row.task_type as "daily" | "weekly" | "progressive",
      currentProgress: row.current_progress || 0,
      isCompleted: row.is_completed || false,
      isClaimed: row.is_claimed || false,
      completedAt: row.completed_at || undefined,
      claimedAt: row.claimed_at || undefined,
      resetAt: row.reset_at || undefined,
      expiresAt: row.expires_at || undefined,
      timestamp: new Date(row.updated_at).getTime()
    }));

    console.log(`✅ [TASK-PROGRESS] Loaded ${records.length} progress records from DB`);
    return records;

  } catch (error: any) {
    console.error("❌ [TASK-PROGRESS] Load exception:", error);
    return null;
  }
}

/**
 * Sync task progress to database (UPSERT all local progress)
 * USES user_task_progress TABLE
 */
export async function syncTaskProgressToDB(
  telegramId: number,
  userId: string,
  progressRecords: TaskProgressRecord[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (progressRecords.length === 0) {
      console.log("⏭️ [TASK-PROGRESS-SYNC] No progress to sync");
      return { success: true };
    }

    console.log(`📤 [TASK-PROGRESS-SYNC] Syncing ${progressRecords.length} progress records to DB...`);
    console.log("📤 [TASK-PROGRESS-SYNC] Sample record:", progressRecords[0]);

    const upsertData = progressRecords.map(record => {
      const updatedAt = toISOString(record.timestamp);
      
      return {
        user_id: userId,
        telegram_id: telegramId,
        task_id: record.taskId,
        task_type: record.taskType,
        current_progress: record.currentProgress,
        is_completed: record.isCompleted,
        is_claimed: record.isClaimed,
        completed_at: record.completedAt || null,
        claimed_at: record.claimedAt || null,
        reset_at: record.resetAt || null,
        expires_at: record.expiresAt || null,
        updated_at: updatedAt
      };
    });

    console.log("📤 [TASK-PROGRESS-SYNC] Upsert data sample:", upsertData[0]);

    const { error } = await supabase
      .from("user_task_progress")
      .upsert(upsertData, {
        onConflict: "user_id,task_id",
        ignoreDuplicates: false
      });

    if (error) {
      console.error("❌ [TASK-PROGRESS-SYNC] Sync failed:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [TASK-PROGRESS-SYNC] ${progressRecords.length} progress records synced successfully!`);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [TASK-PROGRESS-SYNC] Sync exception:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge local and server task progress (keep most recent by timestamp)
 */
export function mergeTaskProgress(
  localProgress: TaskProgressRecord[],
  serverProgress: TaskProgressRecord[]
): TaskProgressRecord[] {
  const mergedMap = new Map<string, TaskProgressRecord>();

  // Add all local progress
  localProgress.forEach(record => {
    mergedMap.set(record.taskId, record);
  });

  // Merge server progress (keep most recent)
  serverProgress.forEach(record => {
    const existing = mergedMap.get(record.taskId);
    if (!existing || record.timestamp > existing.timestamp) {
      mergedMap.set(record.taskId, record);
    }
  });

  const merged = Array.from(mergedMap.values());
  console.log(`🔀 [TASK-PROGRESS] Merged: ${localProgress.length} local + ${serverProgress.length} server = ${merged.length} unique`);
  return merged;
}