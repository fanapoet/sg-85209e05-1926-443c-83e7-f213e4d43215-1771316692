/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * Simplified to use taskStateService and taskDataService
 * Follows EXACT pattern from Rewards screen
 */

import { getCurrentTelegramUser } from "@/services/authService";
import { loadTaskProgressFromDB, syncTaskProgressToDB, mergeTaskProgress, TaskProgressRecord } from "@/services/taskDataService";
import { getTaskState, upsertTaskState } from "@/services/taskStateService";

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
 * FOLLOWS EXACT REWARDS PATTERN
 */
export async function syncTasksWithServer(): Promise<void> {
  try {
    const tgUser = getCurrentTelegramUser();
    if (!tgUser?.id) {
      console.warn("⚠️ [Tasks-Sync] No Telegram user, skipping sync");
      return;
    }

    console.log("🔄 [Tasks-Sync] Starting sync for telegram_id:", tgUser.id);

    // Get user profile to get UUID
    const { data: profile } = await (await import("@/integrations/supabase/client")).supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (!profile) {
      console.error("❌ [Tasks-Sync] Profile not found");
      return;
    }

    // Get all tasks from localStorage
    const allTasks = getLocalTaskProgress();
    console.log("🔄 [Tasks-Sync] Found tasks in localStorage:", allTasks.size);

    if (allTasks.size === 0) {
      console.log("ℹ️ [Tasks-Sync] No tasks to sync");
      return;
    }

    // Convert to TaskProgressRecord format
    const progressRecords: TaskProgressRecord[] = Array.from(allTasks.values()).map(task => ({
      taskId: task.taskId,
      taskType: task.taskType,
      currentProgress: task.currentProgress,
      isCompleted: task.isCompleted,
      isClaimed: task.isClaimed,
      completedAt: task.completedAt,
      claimedAt: task.claimedAt,
      resetAt: task.resetAt,
      expiresAt: task.expiresAt,
      timestamp: task.lastUpdated
    }));

    // Sync task progress to database
    const result = await syncTaskProgressToDB(tgUser.id, profile.id, progressRecords);
    
    if (result.success) {
      console.log(`✅ [Tasks-Sync] Synced ${progressRecords.length} tasks successfully`);
    } else {
      console.error("❌ [Tasks-Sync] Sync failed:", result.error);
    }

    // CRITICAL: Sync reset dates to user_task_state table (EXACT REWARDS PATTERN)
    const today = new Date().toISOString().split("T")[0];
    
    // Find most recent daily and weekly reset dates from tasks
    let lastDailyReset = today;
    let lastWeeklyReset = today;
    
    allTasks.forEach(task => {
      if (task.resetAt) {
        if (task.taskType === "daily" && task.resetAt > lastDailyReset) {
          lastDailyReset = task.resetAt;
        }
        if (task.taskType === "weekly" && task.resetAt > lastWeeklyReset) {
          lastWeeklyReset = task.resetAt;
        }
      }
    });

    // Get current state from DB
    const currentState = await getTaskState(tgUser.id);
    
    // Upsert with Math.max logic (never overwrite with older dates)
    await upsertTaskState({
      telegramId: tgUser.id,
      userId: profile.id,
      lastDailyResetDate: currentState?.lastDailyResetDate && currentState.lastDailyResetDate > lastDailyReset 
        ? currentState.lastDailyResetDate 
        : lastDailyReset,
      lastWeeklyResetDate: currentState?.lastWeeklyResetDate && currentState.lastWeeklyResetDate > lastWeeklyReset
        ? currentState.lastWeeklyResetDate
        : lastWeeklyReset
    });
    
    console.log("✅ [Tasks-Sync] Reset dates synced to user_task_state");
  } catch (error) {
    console.error("❌ [Tasks-Sync] Exception:", error);
  }
}

/**
 * Load tasks from database and merge with local state
 * FOLLOWS EXACT REWARDS PATTERN
 */
export async function loadTasksFromDB(): Promise<void> {
  try {
    const tgUser = getCurrentTelegramUser();
    if (!tgUser?.id) {
      console.warn("⚠️ [Tasks-Load] No Telegram user, skipping DB load");
      return;
    }

    console.log("📥 [Tasks-Load] Fetching tasks from DB for telegram_id:", tgUser.id);

    const serverProgress = await loadTaskProgressFromDB(tgUser.id);

    if (!serverProgress || serverProgress.length === 0) {
      console.log("ℹ️ [Tasks-Load] No tasks found in DB (new user or first sync)");
      return;
    }

    console.log(`📥 [Tasks-Load] Fetched ${serverProgress.length} tasks from DB`);

    // Merge with local state
    const localTasks = getLocalTaskProgress();
    const localProgress: TaskProgressRecord[] = Array.from(localTasks.values()).map(task => ({
      taskId: task.taskId,
      taskType: task.taskType,
      currentProgress: task.currentProgress,
      isCompleted: task.isCompleted,
      isClaimed: task.isClaimed,
      completedAt: task.completedAt,
      claimedAt: task.claimedAt,
      resetAt: task.resetAt,
      expiresAt: task.expiresAt,
      timestamp: task.lastUpdated
    }));

    const mergedProgress = mergeTaskProgress(localProgress, serverProgress);

    // Convert back to TaskProgressData and save
    const mergedTasks = new Map<string, TaskProgressData>();
    mergedProgress.forEach(record => {
      mergedTasks.set(record.taskId, {
        taskId: record.taskId,
        taskType: record.taskType,
        currentProgress: record.currentProgress,
        isCompleted: record.isCompleted,
        isClaimed: record.isClaimed,
        completedAt: record.completedAt,
        claimedAt: record.claimedAt,
        resetAt: record.resetAt,
        expiresAt: record.expiresAt,
        lastUpdated: record.timestamp
      });
    });

    saveLocalTaskProgress(mergedTasks);
    console.log("✅ [Tasks-Load] Task merge completed");
  } catch (error) {
    console.error("❌ [Tasks-Load] Exception:", error);
  }
}