/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * Single source of truth: localStorage
 * Background sync: Periodic upserts with Math.max() logic
 * Table: user_task_state (consolidated - stores both reset dates AND task progress)
 */

import { supabase } from "@/integrations/supabase/client";

// Match exact DB schema from user_task_state table
interface UserTaskStateRow {
  id: string;
  user_id: string;
  telegram_id: number;
  last_daily_reset_date: string | null;
  last_weekly_reset_date: string | null;
  created_at: string;
  updated_at: string;
  task_id: string | null;
  task_type: string | null;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
  reset_at: string | null;
  expires_at: string | null;
}

export interface TaskProgressData {
  taskId: string;
  taskType: "daily" | "weekly" | "progressive";
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt?: string;
  claimedAt?: string;
  resetAt?: string;
  expiresAt?: string;
  lastUpdated: number;
}

const STORAGE_KEY = "bunergy_task_progress";
const SYNC_DEBOUNCE_MS = 2000;

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Get all task progress from localStorage
 */
function getLocalTaskProgress(): Map<string, TaskProgressData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();
    
    const data = JSON.parse(stored);
    return new Map(Object.entries(data));
  } catch (error) {
    console.error("❌ [Tasks-Local] Failed to read localStorage:", error);
    return new Map();
  }
}

/**
 * Save all task progress to localStorage
 */
function saveLocalTaskProgress(tasks: Map<string, TaskProgressData>): void {
  try {
    const obj = Object.fromEntries(tasks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    console.log(`✅ [Tasks-Local] Saved ${tasks.size} tasks to localStorage`);
  } catch (error) {
    console.error("❌ [Tasks-Local] Failed to write localStorage:", error);
  }
}

/**
 * Initialize task if not exists (local-first)
 */
export function initializeTask(
  taskId: string,
  taskType: "daily" | "weekly" | "progressive"
): void {
  console.log(`📋 [Tasks-Init] Initializing task: ${taskId} (${taskType})`);
  
  const tasks = getLocalTaskProgress();
  
  if (tasks.has(taskId)) {
    console.log(`ℹ️ [Tasks-Init] Task ${taskId} already exists`);
    return;
  }

  const now = Date.now();
  const newTask: TaskProgressData = {
    taskId,
    taskType,
    currentProgress: 0,
    isCompleted: false,
    isClaimed: false,
    lastUpdated: now,
  };

  // Set reset dates for daily/weekly tasks
  if (taskType === "daily") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    newTask.resetAt = new Date().toISOString().split("T")[0];
    newTask.expiresAt = tomorrow.toISOString();
  } else if (taskType === "weekly") {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(0, 0, 0, 0);
    newTask.resetAt = new Date().toISOString().split("T")[0];
    newTask.expiresAt = nextWeek.toISOString();
  }

  tasks.set(taskId, newTask);
  saveLocalTaskProgress(tasks);
  
  console.log(`✅ [Tasks-Init] Task ${taskId} initialized locally`);
  
  // Schedule background sync
  scheduleSyncToServer();
}

/**
 * Get task progress (local-first)
 */
export function getTaskProgress(taskId: string): TaskProgressData | null {
  const tasks = getLocalTaskProgress();
  return tasks.get(taskId) || null;
}

/**
 * Get all task progress (local-first)
 */
export function getAllTaskProgress(): Map<string, TaskProgressData> {
  return getLocalTaskProgress();
}

/**
 * Update task progress (local-first)
 */
export function updateTaskProgress(
  taskId: string,
  updates: Partial<TaskProgressData>
): void {
  console.log(`📋 [Tasks-Progress] Updating ${taskId}:`, updates);
  
  const tasks = getLocalTaskProgress();
  const existing = tasks.get(taskId);
  
  if (!existing) {
    console.error(`❌ [Tasks-Progress] Task ${taskId} not found`);
    return;
  }

  const updated: TaskProgressData = {
    ...existing,
    ...updates,
    lastUpdated: Date.now(),
  };

  // Auto-complete if progress reaches goal
  if (updates.currentProgress !== undefined && updates.currentProgress > 0) {
    // Check completion logic here if needed
  }

  tasks.set(taskId, updated);
  saveLocalTaskProgress(tasks);
  
  console.log(`✅ [Tasks-Progress] Updated ${taskId} locally`);
  
  // Schedule background sync
  scheduleSyncToServer();
}

/**
 * Claim task reward (local-first)
 */
export function claimTaskReward(taskId: string): boolean {
  console.log(`📋 [Tasks-Claim] Claiming reward for ${taskId}`);
  
  const tasks = getLocalTaskProgress();
  const task = tasks.get(taskId);
  
  if (!task) {
    console.error(`❌ [Tasks-Claim] Task ${taskId} not found`);
    return false;
  }

  if (!task.isCompleted) {
    console.error(`❌ [Tasks-Claim] Task ${taskId} not completed yet`);
    return false;
  }

  if (task.isClaimed) {
    console.error(`❌ [Tasks-Claim] Task ${taskId} already claimed`);
    return false;
  }

  const now = new Date().toISOString();
  task.isClaimed = true;
  task.claimedAt = now;
  task.lastUpdated = Date.now();

  tasks.set(taskId, task);
  saveLocalTaskProgress(tasks);
  
  console.log(`✅ [Tasks-Claim] Claimed ${taskId} locally`);
  
  // Schedule background sync
  scheduleSyncToServer();
  
  return true;
}

/**
 * Check and reset daily/weekly tasks (local-first)
 */
export function checkAndResetTasks(): void {
  console.log("📋 [Tasks-Reset] Checking for task resets...");
  
  const tasks = getLocalTaskProgress();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  let resetCount = 0;

  tasks.forEach((task, taskId) => {
    if (task.taskType === "progressive") return; // Skip progressive tasks

    const shouldReset =
      (task.taskType === "daily" && task.resetAt !== today) ||
      (task.taskType === "weekly" && task.expiresAt && new Date(task.expiresAt) < now);

    if (shouldReset) {
      console.log(`🔄 [Tasks-Reset] Resetting ${taskId} (${task.taskType})`);
      
      // Reset progress but keep task structure
      task.currentProgress = 0;
      task.isCompleted = false;
      task.isClaimed = false;
      task.completedAt = undefined;
      task.claimedAt = undefined;
      task.lastUpdated = Date.now();

      // Update reset dates
      if (task.taskType === "daily") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        task.resetAt = today;
        task.expiresAt = tomorrow.toISOString();
      } else if (task.taskType === "weekly") {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        task.resetAt = today;
        task.expiresAt = nextWeek.toISOString();
      }

      tasks.set(taskId, task);
      resetCount++;
    }
  });

  if (resetCount > 0) {
    saveLocalTaskProgress(tasks);
    console.log(`✅ [Tasks-Reset] Reset ${resetCount} tasks`);
    scheduleSyncToServer();
  } else {
    console.log("ℹ️ [Tasks-Reset] No tasks need reset");
  }
}

/**
 * Schedule background sync (debounced)
 */
function scheduleSyncToServer(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncTasksWithServer().catch((error) => {
      console.error("❌ [Tasks-Sync-Auto] Background sync failed:", error);
    });
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Sync tasks to server (background operation)
 */
export async function syncTasksWithServer(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("ℹ️ [Tasks-Sync] No user, skipping sync");
      return;
    }

    // Get Telegram ID from metadata
    const telegramId = user.user_metadata?.telegram_id;
    if (!telegramId) {
      console.error("❌ [Tasks-Sync] No telegram_id in user metadata");
      return;
    }

    const tasks = getLocalTaskProgress();
    if (tasks.size === 0) {
      console.log("ℹ️ [Tasks-Sync] No tasks to sync");
      return;
    }

    console.log(`📋 [Tasks-Sync] Syncing ${tasks.size} tasks to server...`);

    // Prepare upsert data (one row per task)
    const upsertData = Array.from(tasks.values()).map((task) => ({
      user_id: user.id,
      telegram_id: telegramId,
      task_id: task.taskId,
      task_type: task.taskType,
      current_progress: task.currentProgress,
      is_completed: task.isCompleted,
      is_claimed: task.isClaimed,
      completed_at: task.completedAt || null,
      claimed_at: task.claimedAt || null,
      reset_at: task.resetAt || null,
      expires_at: task.expiresAt || null,
      updated_at: new Date().toISOString(),
    }));

    // Upsert with conflict resolution on (user_id, task_id)
    const { error } = await supabase
      .from("user_task_state")
      .upsert(upsertData, {
        onConflict: "user_id,task_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("❌ [Tasks-Sync] Upsert failed:", error);
      console.error("❌ [Tasks-Sync] Error details:", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
      });
      throw error;
    }

    console.log(`✅ [Tasks-Sync] Successfully synced ${tasks.size} tasks`);
  } catch (error) {
    console.error("❌ [Tasks-Sync] Exception:", error);
    throw error;
  }
}

/**
 * Load tasks from server and merge with local (on app init)
 */
export async function loadTasksFromDB(userId: string, telegramId: number): Promise<void> {
  try {
    console.log("📋 [Tasks-Load] Loading tasks from server...");

    const { data: serverTasks, error } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("user_id", userId)
      .not("task_id", "is", null) as { data: UserTaskStateRow[] | null; error: any };

    if (error) {
      console.error("❌ [Tasks-Load] Query failed:", error);
      return;
    }

    if (!serverTasks || serverTasks.length === 0) {
      console.log("ℹ️ [Tasks-Load] No server tasks found");
      return;
    }

    console.log(`📋 [Tasks-Load] Found ${serverTasks.length} tasks on server`);

    const localTasks = getLocalTaskProgress();
    let mergeCount = 0;

    serverTasks.forEach((serverTask) => {
      if (!serverTask.task_id) return;

      const localTask = localTasks.get(serverTask.task_id);
      const serverUpdated = new Date(serverTask.updated_at).getTime();

      // Merge logic: Use server data if local doesn't exist OR server is newer
      if (!localTask || serverUpdated > localTask.lastUpdated) {
        const merged: TaskProgressData = {
          taskId: serverTask.task_id,
          taskType: (serverTask.task_type as "daily" | "weekly" | "progressive") || "progressive",
          currentProgress: serverTask.current_progress || 0,
          isCompleted: serverTask.is_completed || false,
          isClaimed: serverTask.is_claimed || false,
          completedAt: serverTask.completed_at || undefined,
          claimedAt: serverTask.claimed_at || undefined,
          resetAt: serverTask.reset_at || undefined,
          expiresAt: serverTask.expires_at || undefined,
          lastUpdated: serverUpdated,
        };

        localTasks.set(serverTask.task_id, merged);
        mergeCount++;
        console.log(`🔄 [Tasks-Load] Merged ${serverTask.task_id} from server (newer)`);
      } else {
        console.log(`ℹ️ [Tasks-Load] Kept local ${serverTask.task_id} (newer or equal)`);
      }
    });

    if (mergeCount > 0) {
      saveLocalTaskProgress(localTasks);
      console.log(`✅ [Tasks-Load] Merged ${mergeCount} tasks from server`);
    } else {
      console.log("ℹ️ [Tasks-Load] No merges needed (local is up-to-date)");
    }

  } catch (error) {
    console.error("❌ [Tasks-Load] Exception:", error);
  }
}