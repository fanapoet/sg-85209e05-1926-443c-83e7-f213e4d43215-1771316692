/**
 * Tasks Service - LOCAL-FIRST with Background Sync
 * All state in localStorage, database sync happens in background
 * FOLLOWS EXACT PATTERN FROM rewardsService.ts
 */

import { 
  getTaskProgress as getTaskProgressFromDB,
  upsertTaskProgress as upsertTaskProgressToDB,
  batchUpsertTaskProgress,
  calculateResetAt,
  type TaskProgressData
} from "./taskStateService";

export type { TaskProgressData };

const STORAGE_KEY = "bunergy_task_progress";

/**
 * Calculate reset date string (YYYY-MM-DD)
 * Uses LOCAL time to match user's day
 */
function getResetDateString(taskType: "daily" | "weekly" | "milestone"): string {
  if (taskType === "milestone") return "NEVER";
  
  const now = new Date();
  
  if (taskType === "daily") {
    // Return YYYY-MM-DD
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  
  if (taskType === "weekly") {
    // Return YYYY-Www
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
 * Check if task needs reset
 */
function shouldResetTask(taskType: "daily" | "weekly" | "milestone", lastResetKey: string): boolean {
  if (taskType === "milestone") return false;
  
  const currentKey = getResetDateString(taskType);
  
  // Debug log to catch reset issues
  if (currentKey !== lastResetKey) {
    console.log(`[Tasks] Resetting ${taskType} task. Old: ${lastResetKey}, New: ${currentKey}`);
    return true;
  }
  
  return false;
}

/**
 * Get all task progress from localStorage
 */
function getLocalTaskProgress(): Map<string, TaskProgressData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[Tasks] No local storage found, returning empty map");
      return new Map();
    }
    
    const data = JSON.parse(stored);
    const map = new Map<string, TaskProgressData>();
    
    // Clean up stale tasks that need reset
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      const task = value as TaskProgressData;
      
      // MIGRATION: If resetAt is ISO string (old format), force reset to use new format
      const isOldFormat = task.resetAt && task.resetAt.includes("T");
      
      if (isOldFormat || shouldResetTask(task.taskType, task.resetAt)) {
        // Task needs reset - create fresh entry with NO old data
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
        // Task is current
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
    console.log(`[Tasks] Saved ${progress.size} tasks to localStorage`);
  } catch (error) {
    console.error("❌ [Tasks] Failed to save to localStorage:", error);
  }
}

/**
 * Update task progress (local-first, background sync)
 */
export function updateTaskProgress(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone",
  currentProgress: number,
  target: number
): TaskProgressData {
  console.log(`[Tasks] updateTaskProgress: ${taskId}, ${currentProgress}/${target}`);
  
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  const resetAt = getResetDateString(taskType);
  const isCompleted = currentProgress >= target;
  
  // Don't update if already claimed and completed (unless force update needed)
  if (existing?.claimed) {
     // Keep existing state if claimed
     return existing;
  }

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
  
  // Background sync
  setTimeout(() => {
    upsertTaskProgressToDB(updated).then(result => {
      if (result.success) {
        console.log(`[Tasks] Sync success: ${taskId}`);
      } else {
        console.error(`[Tasks] Sync failed: ${taskId}`, result.error);
      }
    }).catch(err => console.error(`[Tasks] Sync error: ${taskId}`, err));
  }, 100);
  
  return updated;
}

/**
 * Claim task reward (local-first, background sync)
 */
export function claimTaskReward(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone"
): TaskProgressData | null {
  console.log(`[Tasks] claimTaskReward: ${taskId}`);
  
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  if (!existing || !existing.isCompleted || existing.claimed) {
    console.warn(`[Tasks] Cannot claim ${taskId}:`, existing);
    return null;
  }
  
  const updated: TaskProgressData = {
    ...existing,
    claimed: true,
    claimedAt: new Date().toISOString(),
    resetAt: getResetDateString(taskType) // Ensure reset key is preserved
  };
  
  progress.set(taskId, updated);
  saveLocalTaskProgress(progress);
  
  console.log(`[Tasks] Claimed locally: ${taskId}`);
  
  // Background sync
  setTimeout(() => {
    upsertTaskProgressToDB(updated).then(result => {
      if (result.success) {
        console.log(`[Tasks] Claim sync success: ${taskId}`);
      } else {
        console.error(`[Tasks] Claim sync failed: ${taskId}`, result.error);
      }
    }).catch(err => console.error(`[Tasks] Claim sync error: ${taskId}`, err));
  }, 100);
  
  return updated;
}

/**
 * Get task progress
 */
export function getTaskProgress(taskId: string): TaskProgressData | undefined {
  const progress = getLocalTaskProgress();
  return progress.get(taskId);
}

/**
 * Get all current task progress
 */
export function getAllTaskProgress(): TaskProgressData[] {
  const progress = getLocalTaskProgress();
  return Array.from(progress.values());
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
    console.log(`[Tasks] Initializing new task: ${taskId} (${resetAt})`);
    
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
 * Load task progress from database and merge with local (Math.max)
 * FOLLOWS EXACT PATTERN FROM rewardsService.ts
 */
export async function loadAndMergeTaskProgress(telegramId: number): Promise<void> {
  try {
    console.log("🔵 [TASKS-SYNC] ========== LOAD AND MERGE START ==========");
    console.log("🔵 [TASKS-SYNC] Telegram ID:", telegramId);
    console.log("🔄 [TASKS-SYNC] Loading from database...");
    
    const serverTasks = await getTaskProgressFromDB(telegramId);
    
    console.log("🔵 [TASKS-SYNC] Server response:", serverTasks.length, "tasks");
    
    if (serverTasks.length === 0) {
      console.log("ℹ️ [TASKS-SYNC] No server data, using local state only");
      console.log("🔵 [TASKS-SYNC] ========== LOAD AND MERGE END (NO SERVER DATA) ==========");
      return;
    }
    
    console.log("✅ [TASKS-SYNC] Loaded from server:", serverTasks.length, "tasks");
    console.log("🔵 [TASKS-SYNC] Server tasks:", JSON.stringify(serverTasks.map(t => ({ 
      id: t.taskId, 
      progress: t.currentProgress, 
      completed: t.isCompleted, 
      claimed: t.isClaimed,
      resetAt: t.resetAt
    }))));
    
    const localProgress = getLocalTaskProgress();
    console.log("🔵 [TASKS-SYNC] Local tasks before merge:", localProgress.size);
    let mergedCount = 0;
    
    // Filter server tasks to only current reset period
    const currentServerTasks = serverTasks.filter(serverTask => {
      const currentResetKey = getResetDateString(serverTask.taskType as "daily" | "weekly" | "milestone");
      const isCurrentPeriod = serverTask.resetAt === currentResetKey;
      
      if (!isCurrentPeriod) {
        console.log(`ℹ️ [TASKS-SYNC] Skipping old period task: ${serverTask.taskId} (${serverTask.resetAt} vs ${currentResetKey})`);
      }
      
      return isCurrentPeriod;
    });
    
    console.log("🔵 [TASKS-SYNC] Current period tasks:", currentServerTasks.length, "of", serverTasks.length);
    
    // Merge current period server data with local using Math.max for progress
    currentServerTasks.forEach(serverTask => {
      const localTask = localProgress.get(serverTask.taskId);
      
      console.log(`🔵 [TASKS-SYNC] Merging task: ${serverTask.taskId}`);
      console.log(`   Local: ${localTask ? `progress=${localTask.currentProgress}, claimed=${localTask.claimed}` : 'NOT FOUND'}`);
      console.log(`   Server: progress=${serverTask.currentProgress}, claimed=${serverTask.isClaimed}`);
      
      if (!localTask) {
        // Server has data we don't have locally
        localProgress.set(serverTask.taskId, {
          taskId: serverTask.taskId,
          taskType: serverTask.taskType as "daily" | "weekly" | "milestone",
          currentProgress: serverTask.currentProgress,
          isCompleted: serverTask.isCompleted,
          claimed: serverTask.isClaimed,
          completedAt: serverTask.completedAt,
          claimedAt: serverTask.claimedAt,
          resetAt: serverTask.resetAt
        });
        mergedCount++;
        console.log(`✅ [TASKS-SYNC] Added from server: ${serverTask.taskId}`);
      } else {
        // Merge: use Math.max for progress, keep claimed status if either is true
        const mergedProgress = Math.max(localTask.currentProgress, serverTask.currentProgress);
        const mergedCompleted = localTask.isCompleted || serverTask.isCompleted;
        const mergedClaimed = localTask.claimed || serverTask.isClaimed;
        
        console.log(`   Merged: progress=${mergedProgress}, completed=${mergedCompleted}, claimed=${mergedClaimed}`);
        
        if (mergedProgress !== localTask.currentProgress || 
            mergedCompleted !== localTask.isCompleted || 
            mergedClaimed !== localTask.claimed) {
          
          localProgress.set(serverTask.taskId, {
            ...localTask,
            currentProgress: mergedProgress,
            isCompleted: mergedCompleted,
            claimed: mergedClaimed,
            completedAt: mergedCompleted ? (localTask.completedAt || serverTask.completedAt) : null,
            claimedAt: mergedClaimed ? (localTask.claimedAt || serverTask.claimedAt) : null
          });
          mergedCount++;
          console.log(`✅ [TASKS-SYNC] Updated task: ${serverTask.taskId}`);
        } else {
          console.log(`ℹ️ [TASKS-SYNC] No changes needed: ${serverTask.taskId}`);
        }
      }
    });
    
    saveLocalTaskProgress(localProgress);
    console.log("✅ [TASKS-SYNC] Merge complete:", mergedCount, "tasks updated");
    console.log("🔵 [TASKS-SYNC] Final local tasks count:", localProgress.size);
    
    // Background sync local data back to server (fire-and-forget)
    console.log("🔄 [TASKS-SYNC] Starting background batch sync to server...");
    setTimeout(() => {
      const allTasks = Array.from(localProgress.values());
      console.log("🔵 [TASKS-SYNC] Batch syncing", allTasks.length, "tasks to server");
      batchUpsertTaskProgress(allTasks).then(result => {
        if (result.success) {
          console.log("✅ [TASKS-SYNC] Background batch sync success");
        } else {
          console.error("❌ [TASKS-SYNC] Background batch sync failed:", result.error);
        }
      }).catch(err => {
        console.error("❌ [TASKS-SYNC] Background batch sync exception:", err);
      });
    }, 2000);
    
    console.log("🔵 [TASKS-SYNC] ========== LOAD AND MERGE END ==========");
    
  } catch (error) {
    console.error("❌ [TASKS-SYNC] Load and merge failed:", error);
    console.log("🔵 [TASKS-SYNC] ========== LOAD AND MERGE END (ERROR) ==========");
  }
}