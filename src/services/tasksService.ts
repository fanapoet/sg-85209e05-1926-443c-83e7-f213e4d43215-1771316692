/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * Single source of truth: localStorage
 * Background sync: Periodic upserts with Math.max() logic
 * Table: user_task_state (consolidated - stores both reset dates AND task progress)
 */

import { supabase } from "@/integrations/supabase/client";
import { getCurrentTelegramUser } from "@/services/authService";

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
 * Get current user info (needed for DB operations)
 */
async function getCurrentUser() {
  try {
    const tgUser = getCurrentTelegramUser();
    if (!tgUser?.id) {
      console.warn("⚠️ [Tasks] No Telegram user found");
      return null;
    }

    // Get user profile from DB
    const { data, error } = await supabase
      .from("profiles")
      .select("id, telegram_id")
      .eq("telegram_id", tgUser.id)
      .single();

    if (error || !data) {
      console.error("❌ [Tasks] Failed to get user profile:", error);
      return null;
    }

    return {
      id: data.id,
      telegram_id: data.telegram_id
    };
  } catch (error) {
    console.error("❌ [Tasks] getCurrentUser exception:", error);
    return null;
  }
}

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
 * Sync all pending local task states to server
 */
export async function syncTasksWithServer(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !user?.telegram_id) {
      console.warn("⚠️ [Tasks-Sync] No user, skipping sync");
      return;
    }

    console.log("🔄 [Tasks-Sync] Starting sync for user:", user.id);

    // Get all tasks from localStorage
    const allTasks = getLocalTaskProgress();
    console.log("🔄 [Tasks-Sync] Found tasks in localStorage:", allTasks.size);

    if (allTasks.size === 0) {
      console.log("ℹ️ [Tasks-Sync] No tasks to sync");
      return;
    }

    // Sync each task
    let syncCount = 0;
    for (const [taskId, taskData] of allTasks.entries()) {
      console.log("📤 [Tasks-Sync] Syncing task:", taskId, taskData);
      await saveTaskToDB(user.id, user.telegram_id, taskId, taskData);
      syncCount++;
    }

    console.log("✅ [Tasks-Sync] Synced tasks:", syncCount);
  } catch (error) {
    console.error("❌ [Tasks-Sync] Exception:", error);
  }
}

/**
 * Load tasks from database and merge with local state
 */
export async function loadTasksFromDB(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      console.warn("⚠️ [Tasks-Load] No authenticated user, skipping DB load");
      return;
    }

    console.log("📥 [Tasks-Load] Fetching tasks from DB for user:", user.id);

    const { data, error } = await supabase
      .from("user_task_state")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("❌ [Tasks-Load] Query failed:", error);
      return;
    }

    console.log("📥 [Tasks-Load] Fetched rows from DB:", data?.length || 0);

    if (!data || data.length === 0) {
      console.log("ℹ️ [Tasks-Load] No tasks found in DB (new user or first sync)");
      return;
    }

    // Merge DB state with local state
    const localTasks = getLocalTaskProgress();
    
    data.forEach((row: any) => {
      const taskId = row.task_id;
      if (!taskId) return;

      console.log("🔄 [Tasks-Load] Processing task from DB:", {
        taskId,
        progress: row.current_progress,
        completed: row.is_completed,
        claimed: row.is_claimed
      });

      const localTask = localTasks.get(taskId);
      const dbTask: TaskProgressData = {
        taskId: taskId,
        taskType: row.task_type as "daily" | "weekly" | "progressive",
        currentProgress: row.current_progress || 0,
        isCompleted: row.is_completed || false,
        isClaimed: row.is_claimed || false,
        completedAt: row.completed_at || undefined,
        claimedAt: row.claimed_at || undefined,
        resetAt: row.reset_at || undefined,
        expiresAt: row.expires_at || undefined,
        lastUpdated: new Date(row.updated_at).getTime()
      };

      // Merge: prefer DB if more recent or if local doesn't exist
      if (!localTask || dbTask.lastUpdated > localTask.lastUpdated) {
        console.log("✅ [Tasks-Load] Using DB state for:", taskId);
        localTasks.set(taskId, dbTask);
      } else {
        console.log("ℹ️ [Tasks-Load] Local state is newer, keeping local for:", taskId);
      }
    });

    saveLocalTaskProgress(localTasks);
    console.log("✅ [Tasks-Load] Task merge completed");
  } catch (error) {
    console.error("❌ [Tasks-Load] Exception:", error);
  }
}

/**
 * Save task progress to database (background, best-effort)
 */
async function saveTaskToDB(
  userId: string,
  telegramId: number,
  taskId: string,
  taskData: TaskProgressData
): Promise<void> {
  try {
    console.log("📤 [Tasks-SaveDB] Attempting upsert for:", {
      taskId,
      userId,
      telegramId,
      taskData
    });

    const { data, error } = await supabase
      .from("user_task_state")
      .upsert({
        user_id: userId,
        telegram_id: telegramId,
        task_id: taskId,
        task_type: taskData.taskType,
        current_progress: taskData.currentProgress,
        is_completed: taskData.isCompleted,
        is_claimed: taskData.isClaimed,
        completed_at: taskData.completedAt || null,
        claimed_at: taskData.claimedAt || null,
        reset_at: taskData.resetAt || null,
        expires_at: taskData.expiresAt || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,task_id"
      })
      .select();

    if (error) {
      console.error("❌ [Tasks-SaveDB] Upsert failed:", {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        taskId,
        userId
      });
    } else {
      console.log("✅ [Tasks-SaveDB] Upsert successful:", {
        taskId,
        data
      });
    }
  } catch (err) {
    console.error("❌ [Tasks-SaveDB] Exception:", err, "for task:", taskId);
  }
}