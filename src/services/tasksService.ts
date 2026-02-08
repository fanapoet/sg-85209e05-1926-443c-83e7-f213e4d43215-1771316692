/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * Orchestrates TaskState (resets) and TaskData (completions)
 * Matches Rewards pattern exactly
 */

import { 
  getTaskState, 
  upsertTaskState, 
  updateDailyResetDate, 
  updateWeeklyResetDate,
  type TaskStateRecord 
} from "./taskStateService";

import { 
  loadCompletedTasksFromDB, 
  syncCompletedTasksToDB,
  mergeCompletedTasks,
  type CompletedTask
} from "./taskDataService";

export interface TaskProgressData {
  taskId: string;
  taskType: "daily" | "weekly" | "milestone";
  currentProgress: number;
  isCompleted: boolean;
  claimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  resetAt: string;
}

const STORAGE_KEY = "bunergy_task_progress";

/**
 * Calculate reset date string (YYYY-MM-DD)
 * Uses LOCAL time to match user's day
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
      return new Map();
    }
    
    const data = JSON.parse(stored);
    const map = new Map<string, TaskProgressData>();
    
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      const task = value as TaskProgressData;
      
      if (shouldResetTask(task.taskType, task.resetAt)) {
        map.set(key, {
          taskId: task.taskId,
          taskType: task.taskType,
          currentProgress: 0,
          isCompleted: false,
          claimed: false,
          completedAt: null,
          claimedAt: null,
          resetAt: getResetDateString(task.taskType)
        });
      } else {
        map.set(key, task);
      }
    });
    
    return map;
  } catch (error) {
    console.error("❌ [Tasks] Failed to load from localStorage:", error);
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
  } catch (error) {
    console.error("❌ [Tasks] Failed to save to localStorage:", error);
  }
}

/**
 * Initialize task if not exists
 */
export function initializeTask(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone",
  target: number
): void {
  const progress = getLocalTaskProgress();
  
  if (!progress.has(taskId)) {
    const resetAt = getResetDateString(taskType);
    
    progress.set(taskId, {
      taskId,
      taskType,
      currentProgress: 0,
      isCompleted: false,
      claimed: false,
      completedAt: null,
      claimedAt: null,
      resetAt
    });
    saveLocalTaskProgress(progress);
  }
}

/**
 * Update task progress (Local First)
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
  
  if (existing?.claimed && existing.resetAt === resetAt) {
    return existing;
  }

  const isCompleted = currentProgress >= target;
  
  const updated: TaskProgressData = {
    taskId,
    taskType,
    currentProgress,
    isCompleted,
    claimed: existing?.claimed || false,
    completedAt: isCompleted && !existing?.completedAt ? new Date().toISOString() : existing?.completedAt || null,
    claimedAt: existing?.claimedAt || null,
    resetAt
  };
  
  progress.set(taskId, updated);
  saveLocalTaskProgress(progress);
  
  return updated;
}

/**
 * Claim task reward
 */
export function claimTaskReward(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone"
): TaskProgressData | null {
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  if (!existing || !existing.isCompleted || existing.claimed) {
    return null;
  }
  
  const updated: TaskProgressData = {
    ...existing,
    claimed: true,
    claimedAt: new Date().toISOString()
  };
  
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
 * MAIN SYNC FUNCTION
 * Orchestrates the full sync process:
 * 1. Check/Update Reset Dates (TaskState)
 * 2. Sync Completed Tasks (TaskData)
 */
export async function syncTasksWithServer(telegramId: string, userId: string): Promise<void> {
  try {
    console.log("🔄 [TASKS-SYNC] Starting sync for:", telegramId);
    
    const localTasks = getLocalTaskProgress();
    const currentDailyReset = getResetDateString("daily");
    const currentWeeklyReset = getResetDateString("weekly");
    
    const [serverState, serverCompletions] = await Promise.all([
      getTaskState(telegramId),
      loadCompletedTasksFromDB(userId)
    ]);
    
    let needsDailyReset = false;
    let needsWeeklyReset = false;
    
    if (!serverState || serverState.lastDailyResetDate !== currentDailyReset) {
      console.log("📅 [TASKS-SYNC] New daily period detected. Server:", serverState?.lastDailyResetDate, "Local:", currentDailyReset);
      needsDailyReset = true;
      await updateDailyResetDate(telegramId, currentDailyReset);
    }
    
    if (!serverState || serverState.lastWeeklyResetDate !== currentWeeklyReset) {
      console.log("📅 [TASKS-SYNC] New weekly period detected. Server:", serverState?.lastWeeklyResetDate, "Local:", currentWeeklyReset);
      needsWeeklyReset = true;
      await updateWeeklyResetDate(telegramId, currentWeeklyReset);
    }
    
    if (needsDailyReset || needsWeeklyReset) {
      console.log("🔄 [TASKS-SYNC] Applying resets to local tasks...");
      let resetCount = 0;
      
      localTasks.forEach((task, taskId) => {
        let shouldReset = false;
        
        if (needsDailyReset && task.taskType === "daily" && task.resetAt !== currentDailyReset) {
          shouldReset = true;
        }
        
        if (needsWeeklyReset && task.taskType === "weekly" && task.resetAt !== currentWeeklyReset) {
          shouldReset = true;
        }
        
        if (shouldReset) {
          console.log(`🔄 [TASKS-SYNC] Resetting task ${taskId} (${task.taskType})`);
          localTasks.set(taskId, {
            ...task,
            currentProgress: 0,
            isCompleted: false,
            claimed: false,
            completedAt: null,
            claimedAt: null,
            resetAt: task.taskType === "daily" ? currentDailyReset : currentWeeklyReset
          });
          resetCount++;
        }
      });
      
      if (resetCount > 0) {
        saveLocalTaskProgress(localTasks);
        console.log(`✅ [TASKS-SYNC] Reset ${resetCount} tasks`);
      }
    }
    
    if (!serverState) {
      await upsertTaskState({
        telegramId,
        userId,
        lastDailyResetDate: currentDailyReset,
        lastWeeklyResetDate: currentWeeklyReset
      });
    }

    if (serverCompletions && serverCompletions.length > 0) {
      let localUpdated = false;
      
      serverCompletions.forEach(comp => {
        const local = localTasks.get(comp.task_id);
        
        if (local && local.taskType === "milestone") {
          if (!local.isCompleted || !local.claimed) {
            localTasks.set(comp.task_id, {
              ...local,
              isCompleted: true,
              claimed: true,
              completedAt: comp.completed_at || new Date().toISOString(),
              claimedAt: comp.claimed_at || new Date().toISOString()
            });
            localUpdated = true;
          }
        }
      });
      
      if (localUpdated) {
        saveLocalTaskProgress(localTasks);
        console.log("✅ [TASKS-SYNC] Merged server completions to local");
      }
    }

    const allTasksArray = Array.from(localTasks.values());
    const tasksToSync = allTasksArray.filter(t => t.isCompleted && t.claimed);
    
    if (tasksToSync.length > 0) {
      console.log(`📤 [TASKS-SYNC] Syncing ${tasksToSync.length} claimed tasks to server...`);
      
      const syncPayload: CompletedTask[] = tasksToSync.map(t => ({
        task_id: t.taskId,
        current_progress: t.currentProgress,
        is_completed: t.isCompleted,
        completed_at: t.completedAt,
        claimed: t.claimed,
        claimed_at: t.claimedAt,
        reset_at: t.resetAt
      }));
      
      const syncResult = await syncCompletedTasksToDB(userId, syncPayload);
      
      if (!syncResult.success) {
        console.error("❌ [TASKS-SYNC] Failed to sync tasks:", syncResult.error);
      }
    } else {
      console.log("⏭️ [TASKS-SYNC] No claimed tasks to sync");
    }
    
    console.log("✅ [TASKS-SYNC] Sync complete");

  } catch (error) {
    console.error("❌ [TASKS-SYNC] Failed:", error);
  }
}