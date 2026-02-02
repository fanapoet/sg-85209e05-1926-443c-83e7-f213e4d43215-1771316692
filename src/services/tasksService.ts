import { supabase } from "@/integrations/supabase/client";

/**
 * Tasks Service
 * Handles task progress, completion, and reward claiming
 */

export interface TaskProgressData {
  userId: string;
  taskId: string;
  currentProgress: number;
  isCompleted?: boolean;
  claimed?: boolean;
}

export interface UserTaskProgress {
  id: string;
  taskId: string;
  currentProgress: number;
  isCompleted: boolean;
  claimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

/**
 * Update task progress
 */
export async function updateTaskProgress(data: TaskProgressData) {
  try {
    console.log("💾 [Task Progress] Updating:", data);

    const { data: result, error } = await supabase
      .from("user_task_progress")
      .upsert({
        user_id: data.userId,
        task_id: data.taskId,
        current_progress: data.currentProgress,
        is_completed: data.isCompleted || false,
        claimed: data.claimed || false,
        completed_at: data.isCompleted ? new Date().toISOString() : null,
        claimed_at: data.claimed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        reset_at: new Date().toISOString() // For daily/weekly resets
      }, {
        onConflict: "user_id,task_id,reset_at"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [Task Progress] Database error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task Progress] Updated successfully:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task Progress] Unexpected error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Mark task as completed
 */
export async function completeTask(userId: string, taskId: string) {
  try {
    console.log("💾 [Task] Marking completed:", { userId, taskId });

    const { data: result, error } = await supabase
      .from("user_task_progress")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .select()
      .single();

    if (error) {
      console.error("❌ [Task] Complete error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task] Marked completed:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task] Complete error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Claim task reward
 */
export async function claimTaskReward(userId: string, taskId: string) {
  try {
    console.log("💾 [Task] Claiming reward:", { userId, taskId });

    const { data: result, error } = await supabase
      .from("user_task_progress")
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("is_completed", true)
      .select()
      .single();

    if (error) {
      console.error("❌ [Task] Claim error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task] Reward claimed:", result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task] Claim error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get all user task progress
 */
export async function getUserTaskProgress(userId: string): Promise<UserTaskProgress[]> {
  try {
    const { data, error } = await supabase
      .from("user_task_progress")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [Task] Fetch error:", error);
      return [];
    }

    return (data || []).map(record => ({
      id: record.id,
      taskId: record.task_id,
      currentProgress: record.current_progress,
      isCompleted: record.is_completed,
      claimed: record.claimed,
      completedAt: record.completed_at,
      claimedAt: record.claimed_at,
      createdAt: record.created_at
    }));
  } catch (error) {
    console.error("❌ [Task] Fetch error:", error);
    return [];
  }
}

/**
 * Get active tasks from database
 */
export async function getActiveTasks() {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ [Tasks] Fetch error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ [Tasks] Fetch error:", error);
    return [];
  }
}