import { supabase } from "@/integrations/supabase/client";

/**
 * Task State Service
 * Handles syncing task progress to/from database
 * FOLLOWS EXACT PATTERN FROM rewardsService.ts
 */

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

export interface TaskProgressRecord {
  id: string;
  userId: string;
  telegramId: number;
  taskId: string;
  taskType: string;
  currentProgress: number;
  isCompleted: boolean;
  isClaimed: boolean;
  completedAt: string | null;
  claimedAt: string | null;
  resetAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculate reset_at timestamp for task type
 */
export function calculateResetAt(taskType: "daily" | "weekly" | "milestone"): string {
  if (taskType === "milestone") return "2099-12-31T23:59:59Z";
  
  const now = new Date();
  
  if (taskType === "daily") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.toISOString();
  }
  
  if (taskType === "weekly") {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    return monday.toISOString();
  }
  
  return now.toISOString();
}

/**
 * Calculate expires_at timestamp (reset_at + period duration)
 */
function calculateExpiresAt(taskType: "daily" | "weekly" | "milestone", resetAt: string): string {
  if (taskType === "milestone") return "2099-12-31T23:59:59Z";
  
  const reset = new Date(resetAt);
  
  if (taskType === "daily") {
    reset.setDate(reset.getDate() + 1);
    return reset.toISOString();
  }
  
  if (taskType === "weekly") {
    reset.setDate(reset.getDate() + 7);
    return reset.toISOString();
  }
  
  return resetAt;
}

/**
 * Get task progress from database for current period
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function getTaskProgress(telegramId: number): Promise<TaskProgressRecord[]> {
  try {
    console.log("📥 [Task State] Fetching for telegram_id:", telegramId);

    const { data, error } = await (supabase as any)
      .from("user_task_progress")
      .select("*")
      .eq("telegram_id", telegramId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [Task State] Fetch error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [Task State] No existing progress found");
      return [];
    }

    console.log("✅ [Task State] Fetched successfully:", data.length, "tasks");
    
    return data.map(record => ({
      id: record.id,
      userId: record.user_id,
      telegramId: record.telegram_id,
      taskId: record.task_id,
      taskType: record.task_type,
      currentProgress: Number(record.current_progress),
      isCompleted: record.is_completed,
      isClaimed: record.is_claimed,
      completedAt: record.completed_at,
      claimedAt: record.claimed_at,
      resetAt: record.reset_at,
      expiresAt: record.expires_at,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }));
  } catch (error) {
    console.error("❌ [Task State] Fetch exception:", error);
    return [];
  }
}

/**
 * Upsert single task progress
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function upsertTaskProgress(data: TaskProgressData) {
  try {
    console.log("💾 [Task State] Upserting:", data.taskId);

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [Task State] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [Task State] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }

    const expiresAt = calculateExpiresAt(data.taskType, data.resetAt);

    const { data: result, error } = await (supabase as any)
      .from("user_task_progress")
      .upsert({
        telegram_id: tgUser.id,
        user_id: profile.id,
        task_id: data.taskId,
        task_type: data.taskType,
        current_progress: data.currentProgress,
        is_completed: data.isCompleted,
        is_claimed: data.claimed,
        completed_at: data.completedAt,
        claimed_at: data.claimedAt,
        reset_at: data.resetAt,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,task_id,reset_at"
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [Task State] Upsert error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Upserted successfully");
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [Task State] Upsert exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Batch upsert multiple task progress records
 */
export async function batchUpsertTaskProgress(records: TaskProgressData[]) {
  try {
    console.log("💾 [Task State] Batch upserting:", records.length, "tasks");

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [Task State] No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [Task State] Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [Task State] Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }

    const { error } = await (supabase as any)
      .from("user_task_progress")
      .upsert(records.map(data => ({
        telegram_id: tgUser.id,
        user_id: profile.id,
        task_id: data.taskId,
        task_type: data.taskType,
        current_progress: data.currentProgress,
        is_completed: data.isCompleted,
        is_claimed: data.claimed,
        completed_at: data.completedAt,
        claimed_at: data.claimedAt,
        reset_at: data.resetAt,
        expires_at: calculateExpiresAt(data.taskType, data.resetAt),
        updated_at: new Date().toISOString()
      })), {
        onConflict: "user_id,task_id,reset_at"
      });

    if (error) {
      console.error("❌ [Task State] Batch upsert error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [Task State] Batch upserted successfully:", records.length);
    return { success: true };
  } catch (error) {
    console.error("❌ [Task State] Batch upsert exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}