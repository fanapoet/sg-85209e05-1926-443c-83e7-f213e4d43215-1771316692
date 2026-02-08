/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * Single source of truth: localStorage
 * Background sync to user_task_state table
 * Matches Rewards/Boost architecture exactly
 */

import { supabase } from "@/integrations/supabase/client";

export interface TaskProgressData {
  taskId: string;
  taskType: "daily" | "weekly" | "milestone";
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  resetAt: string;
}

const STORAGE_KEY = "bunergy_task_progress";

/**
 * Calculate reset date string (YYYY-MM-DD for daily, YYYY-WXX for weekly)
 */
export function getResetDateString(taskType: "daily" | "weekly" | "milestone"): string {
  if (taskType === "milestone") return "NEVER";
  
  const now = new Date();
  
  if (taskType === "daily") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  if (taskType === "weekly") {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }
  
  return "NEVER";
}

/**
 * Check if task needs reset based on stored resetAt vs current
 */
function shouldResetTask(taskType: "daily" | "weekly" | "milestone", storedResetAt: string): boolean {
  if (taskType === "milestone") return false;
  
  const currentKey = getResetDateString(taskType);
  return currentKey !== storedResetAt;
}

/**
 * Get all task progress from localStorage
 */
function getLocalTaskProgress(): Map<string, TaskProgressData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("📋 [Tasks-Local] No saved tasks, starting fresh");
      return new Map();
    }
    
    const data = JSON.parse(stored);
    const map = new Map<string, TaskProgressData>();
    let resetCount = 0;
    
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      const task = value as TaskProgressData;
      
      // Auto-reset if period changed
      if (shouldResetTask(task.taskType, task.resetAt)) {
        console.log(`🔄 [Tasks-Local] Auto-resetting ${key} (${task.taskType}): ${task.resetAt} → ${getResetDateString(task.taskType)}`);
        map.set(key, {
          taskId: task.taskId,
          taskType: task.taskType,
          currentProgress: 0,
          isCompleted: false,
          isClaimed: false,
          completedAt: null,
          claimedAt: null,
          resetAt: getResetDateString(task.taskType)
        });
        resetCount++;
      } else {
        map.set(key, task);
      }
    });
    
    if (resetCount > 0) {
      console.log(`✅ [Tasks-Local] Auto-reset ${resetCount} tasks on load`);
    }
    
    console.log(`📋 [Tasks-Local] Loaded ${map.size} tasks from localStorage`);
    return map;
  } catch (error) {
    console.error("❌ [Tasks-Local] Failed to load:", error);
    return new Map();
  }
}

/**
 * Save task progress to localStorage
 */
function saveLocalTaskProgress(progress: Map<string, TaskProgressData>): void {
  try {
    const obj: Record<string, TaskProgressData> = {};
    progress.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    console.log(`💾 [Tasks-Local] Saved ${progress.size} tasks to localStorage`);
  } catch (error) {
    console.error("❌ [Tasks-Local] Failed to save:", error);
  }
}

/**
 * Initialize task if not exists (Local-First)
 */
export function initializeTask(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone",
  target: number
): void {
  const progress = getLocalTaskProgress();
  
  if (!progress.has(taskId)) {
    const resetAt = getResetDateString(taskType);
    
    console.log(`🆕 [Tasks-Local] Initializing task: ${taskId} (${taskType})`);
    
    progress.set(taskId, {
      taskId,
      taskType,
      currentProgress: 0,
      isCompleted: false,
      isClaimed: false,
      completedAt: null,
      claimedAt: null,
      resetAt
    });
    saveLocalTaskProgress(progress);
  }
}

/**
 * Update task progress (Local-First)
 */
export function updateTaskProgress(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone",
  currentProgress: number,
  target: number
): TaskProgressData {
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  const resetAt = getResetDateString(taskType);
  
  // Don't update if already claimed in current period
  if (existing?.isClaimed && existing.resetAt === resetAt) {
    console.log(`⏭️ [Tasks-Local] Task ${taskId} already claimed, skipping update`);
    return existing;
  }

  const isCompleted = currentProgress >= target;
  
  const updated: TaskProgressData = {
    taskId,
    taskType,
    currentProgress,
    isCompleted,
    isClaimed: existing?.isClaimed || false,
    completedAt: isCompleted && !existing?.completedAt ? new Date().toISOString() : existing?.completedAt || null,
    claimedAt: existing?.claimedAt || null,
    resetAt
  };
  
  console.log(`📝 [Tasks-Local] Updated ${taskId}: progress=${currentProgress}/${target}, completed=${isCompleted}`);
  
  progress.set(taskId, updated);
  saveLocalTaskProgress(progress);
  
  return updated;
}

/**
 * Claim task reward (Local-First)
 */
export function claimTaskReward(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone"
): TaskProgressData | null {
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  if (!existing || !existing.isCompleted || existing.isClaimed) {
    console.log(`❌ [Tasks-Local] Cannot claim ${taskId}: completed=${existing?.isCompleted}, claimed=${existing?.isClaimed}`);
    return null;
  }
  
  const updated: TaskProgressData = {
    ...existing,
    isClaimed: true,
    claimedAt: new Date().toISOString()
  };
  
  console.log(`🎁 [Tasks-Local] Claimed reward for ${taskId}`);
  
  progress.set(taskId, updated);
  saveLocalTaskProgress(progress);
  
  return updated;
}

/**
 * Get single task progress
 */
export function getTaskProgress(taskId: string): TaskProgressData | undefined {
  const progress = getLocalTaskProgress();
  return progress.get(taskId);
}

/**
 * Get all tasks
 */
export function getAllTaskProgress(): TaskProgressData[] {
  const progress = getLocalTaskProgress();
  return Array.from(progress.values());
}

/**
 * BACKGROUND SYNC - Sync tasks to server (user_task_state table)
 * Uses Math.max() logic for timestamps (local wins if newer)
 */
export async function syncTasksWithServer(telegramId: number, userId: string): Promise<void> {
  try {
    console.log("🔄 [Tasks-Sync] Starting background sync...");
    console.log(`🔄 [Tasks-Sync] User: telegramId=${telegramId}, userId=${userId}`);
    
    const localTasks = getLocalTaskProgress();
    console.log(`📤 [Tasks-Sync] Local tasks to sync: ${localTasks.size}`);
    
    if (localTasks.size === 0) {
      console.log("⏭️ [Tasks-Sync] No local tasks to sync");
      return;
    }

    // Fetch server state
    const { data: serverTasks, error: fetchError } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("user_id", userId);

    if (fetchError) {
      console.error("❌ [Tasks-Sync] Failed to fetch server tasks:", fetchError);
      return;
    }

    console.log(`📥 [Tasks-Sync] Server tasks fetched: ${serverTasks?.length || 0}`);

    // Build upsert payload (local-first, Math.max for timestamps)
    const upsertData: any[] = [];
    
    localTasks.forEach((localTask, taskId) => {
      const serverTask = serverTasks?.find(t => t.task_id === taskId && t.reset_at === localTask.resetAt);
      
      if (!serverTask) {
        // New task - insert local state
        console.log(`🆕 [Tasks-Sync] New task for server: ${taskId}`);
        upsertData.push({
          user_id: userId,
          telegram_id: telegramId,
          task_id: localTask.taskId,
          task_type: localTask.taskType,
          current_progress: localTask.currentProgress,
          is_completed: localTask.isCompleted,
          is_claimed: localTask.isClaimed,
          completed_at: localTask.completedAt,
          claimed_at: localTask.claimedAt,
          reset_at: localTask.resetAt,
          updated_at: new Date().toISOString()
        });
      } else {
        // Existing task - use Math.max() for progress, OR latest timestamp for claims
        const localUpdated = localTask.claimedAt || localTask.completedAt || new Date(0).toISOString();
        const serverUpdated = serverTask.claimed_at || serverTask.completed_at || new Date(0).toISOString();
        
        const useLocal = new Date(localUpdated) > new Date(serverUpdated);
        
        if (useLocal) {
          console.log(`🔄 [Tasks-Sync] Local newer for ${taskId}, syncing to server`);
          upsertData.push({
            user_id: userId,
            telegram_id: telegramId,
            task_id: localTask.taskId,
            task_type: localTask.taskType,
            current_progress: Math.max(localTask.currentProgress, serverTask.current_progress),
            is_completed: localTask.isCompleted || serverTask.is_completed,
            is_claimed: localTask.isClaimed || serverTask.is_claimed,
            completed_at: localTask.completedAt || serverTask.completed_at,
            claimed_at: localTask.claimedAt || serverTask.claimed_at,
            reset_at: localTask.resetAt,
            updated_at: new Date().toISOString()
          });
        } else {
          console.log(`⏭️ [Tasks-Sync] Server newer or equal for ${taskId}, skipping`);
        }
      }
    });

    if (upsertData.length === 0) {
      console.log("⏭️ [Tasks-Sync] No changes to sync");
      return;
    }

    // Upsert to server
    console.log(`📤 [Tasks-Sync] Upserting ${upsertData.length} tasks to server...`);
    
    const { error: upsertError } = await supabase
      .from("user_task_state")
      .upsert(upsertData, {
        onConflict: "user_id,task_id,reset_at"
      });

    if (upsertError) {
      console.error("❌ [Tasks-Sync] Upsert failed:", upsertError);
      console.error("❌ [Tasks-Sync] Error details:", JSON.stringify(upsertError, null, 2));
      return;
    }

    console.log("✅ [Tasks-Sync] Successfully synced to server");

  } catch (error) {
    console.error("❌ [Tasks-Sync] Exception:", error);
  }
}

/**
 * Load tasks from server and merge with local (on app start)
 */
export async function loadTasksFromServer(userId: string): Promise<void> {
  try {
    console.log("📥 [Tasks-Load] Loading tasks from server...");
    
    const { data: serverTasks, error } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("❌ [Tasks-Load] Failed to load:", error);
      return;
    }

    if (!serverTasks || serverTasks.length === 0) {
      console.log("ℹ️ [Tasks-Load] No server tasks found");
      return;
    }

    console.log(`📥 [Tasks-Load] Loaded ${serverTasks.length} tasks from server`);

    const localTasks = getLocalTaskProgress();
    let mergeCount = 0;

    serverTasks.forEach(serverTask => {
      const localTask = localTasks.get(serverTask.task_id);
      
      if (!localTask) {
        // Server has task we don't have locally - add it
        console.log(`🆕 [Tasks-Load] Adding server task to local: ${serverTask.task_id}`);
        localTasks.set(serverTask.task_id, {
          taskId: serverTask.task_id,
          taskType: serverTask.task_type as "daily" | "weekly" | "milestone",
          currentProgress: serverTask.current_progress,
          isCompleted: serverTask.is_completed,
          isClaimed: serverTask.is_claimed,
          completedAt: serverTask.completed_at,
          claimedAt: serverTask.claimed_at,
          resetAt: serverTask.reset_at
        });
        mergeCount++;
      } else {
        // Both exist - use Math.max() logic
        const localUpdated = localTask.claimedAt || localTask.completedAt || new Date(0).toISOString();
        const serverUpdated = serverTask.claimed_at || serverTask.completed_at || new Date(0).toISOString();
        
        if (new Date(serverUpdated) > new Date(localUpdated)) {
          console.log(`🔄 [Tasks-Load] Server newer for ${serverTask.task_id}, updating local`);
          localTasks.set(serverTask.task_id, {
            taskId: serverTask.task_id,
            taskType: serverTask.task_type as "daily" | "weekly" | "milestone",
            currentProgress: Math.max(serverTask.current_progress, localTask.currentProgress),
            isCompleted: serverTask.is_completed || localTask.isCompleted,
            isClaimed: serverTask.is_claimed || localTask.isClaimed,
            completedAt: serverTask.completed_at || localTask.completedAt,
            claimedAt: serverTask.claimed_at || localTask.claimedAt,
            resetAt: serverTask.reset_at
          });
          mergeCount++;
        }
      }
    });

    if (mergeCount > 0) {
      saveLocalTaskProgress(localTasks);
      console.log(`✅ [Tasks-Load] Merged ${mergeCount} tasks from server`);
    } else {
      console.log("⏭️ [Tasks-Load] No merge needed, local is up to date");
    }

  } catch (error) {
    console.error("❌ [Tasks-Load] Exception:", error);
  }
}