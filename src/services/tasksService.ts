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
 * Check if task needs reset
 */
function shouldResetTask(taskType: "daily" | "weekly" | "milestone", lastResetAt: string): boolean {
  if (taskType === "milestone") return false;
  
  const currentResetAt = calculateResetAt(taskType);
  return currentResetAt !== lastResetAt;
}

/**
 * Get all task progress from localStorage
 */
function getLocalTaskProgress(): Map<string, TaskProgressData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();
    
    const data = JSON.parse(stored);
    const map = new Map<string, TaskProgressData>();
    
    // Clean up stale tasks that need reset
    Object.entries(data).forEach(([key, value]: [string, any]) => {
      const task = value as TaskProgressData;
      
      if (shouldResetTask(task.taskType, task.resetAt)) {
        // Task needs reset - create fresh entry
        map.set(key, {
          ...task,
          currentProgress: 0,
          isCompleted: false,
          claimed: false,
          completedAt: null,
          claimedAt: null,
          resetAt: calculateResetAt(task.taskType)
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
  console.log(`🔵 [TASKS-SYNC] updateTaskProgress called: ${taskId}, progress: ${currentProgress}/${target}`);
  
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  const resetAt = calculateResetAt(taskType);
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
  
  console.log("✅ [TASKS-SYNC] Progress updated locally:", taskId, currentProgress);
  
  // Background sync (fire-and-forget)
  console.log("🔄 [TASKS-SYNC] Starting background DB sync for:", taskId);
  setTimeout(() => {
    upsertTaskProgressToDB(updated).then(result => {
      if (result.success) {
        console.log("✅ [TASKS-SYNC] Background DB sync success:", taskId);
      } else {
        console.error("❌ [TASKS-SYNC] Background DB sync failed:", taskId, result.error);
      }
    }).catch(err => {
      console.error("❌ [TASKS-SYNC] Background sync exception:", taskId, err);
    });
  }, 1000);
  
  return updated;
}

/**
 * Claim task reward (local-first, background sync)
 */
export function claimTaskReward(
  taskId: string,
  taskType: "daily" | "weekly" | "milestone"
): TaskProgressData | null {
  console.log(`🔵 [TASKS-SYNC] claimTaskReward called: ${taskId}`);
  
  const progress = getLocalTaskProgress();
  const existing = progress.get(taskId);
  
  if (!existing || !existing.isCompleted || existing.claimed) {
    console.warn("⚠️ [TASKS-SYNC] Cannot claim:", { existing, reason: !existing ? "not found" : !existing.isCompleted ? "not completed" : "already claimed" });
    return null;
  }
  
  const updated: TaskProgressData = {
    ...existing,
    claimed: true,
    claimedAt: new Date().toISOString()
  };
  
  progress.set(taskId, updated);
  saveLocalTaskProgress(progress);
  
  console.log("✅ [TASKS-SYNC] Reward claimed locally:", taskId);
  
  // Background sync (fire-and-forget)
  console.log("🔄 [TASKS-SYNC] Starting background DB sync for claim:", taskId);
  setTimeout(() => {
    upsertTaskProgressToDB(updated).then(result => {
      if (result.success) {
        console.log("✅ [TASKS-SYNC] Background claim sync success:", taskId);
      } else {
        console.error("❌ [TASKS-SYNC] Background claim sync failed:", taskId, result.error);
      }
    }).catch(err => {
      console.error("❌ [TASKS-SYNC] Background claim exception:", taskId, err);
    });
  }, 1000);
  
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
    const resetAt = calculateResetAt(taskType);
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
    console.log("✅ [Tasks] Initialized:", taskId);
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
      claimed: t.isClaimed 
    }))));
    
    const localProgress = getLocalTaskProgress();
    console.log("🔵 [TASKS-SYNC] Local tasks before merge:", localProgress.size);
    let mergedCount = 0;
    
    // Merge server data with local using Math.max for progress
    serverTasks.forEach(serverTask => {
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