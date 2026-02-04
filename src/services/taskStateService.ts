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
  if (taskType === "milestone") return "NEVER";
  
  const now = new Date();
  
  if (taskType === "daily") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  
  if (taskType === "weekly") {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    const yyyy = monday.getFullYear();
    const weekNum = Math.ceil((monday.getTime() - new Date(yyyy, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${yyyy}-W${String(weekNum).padStart(2, "0")}`;
  }
  
  return now.toISOString();
}

/**
 * Get task progress from database for current period
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function getTaskProgress(telegramId: number): Promise<TaskProgressRecord[]> {
  try {
    console.log("📥 [TASKS-SYNC] DB Fetch: Starting for telegram_id:", telegramId);

    const { data, error } = await (supabase as any)
      .from("user_task_progress")
      .select("*")
      .eq("telegram_id", telegramId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [TASKS-SYNC] DB Fetch: Error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [TASKS-SYNC] DB Fetch: No existing progress found");
      return [];
    }

    console.log("✅ [TASKS-SYNC] DB Fetch: Success -", data.length, "tasks");
    console.log("🔵 [TASKS-SYNC] DB Fetch: Raw data:", JSON.stringify(data.slice(0, 2))); // Log first 2 records
    
    const records = data.map(record => ({
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
    
    console.log("✅ [TASKS-SYNC] DB Fetch: Mapped", records.length, "records");
    return records;
  } catch (error) {
    console.error("❌ [TASKS-SYNC] DB Fetch: Exception:", error);
    return [];
  }
}

/**
 * Upsert single task progress
 * USES EXACT BUILD AUTHENTICATION PATTERN
 */
export async function upsertTaskProgress(data: TaskProgressData) {
  try {
    console.log("💾 [TASKS-SYNC] DB Upsert: Starting for task:", data.taskId);
    console.log("🔵 [TASKS-SYNC] DB Upsert: Data:", JSON.stringify(data));

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [TASKS-SYNC] DB Upsert: No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [TASKS-SYNC] DB Upsert: Telegram user ID:", tgUser.id);
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [TASKS-SYNC] DB Upsert: Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [TASKS-SYNC] DB Upsert: Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }

    console.log("🔵 [TASKS-SYNC] DB Upsert: Found profile UUID:", profile.id);

    const upsertPayload = {
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
      updated_at: new Date().toISOString()
    };
    
    console.log("🔵 [TASKS-SYNC] DB Upsert: Payload:", JSON.stringify(upsertPayload));

    const { data: result, error } = await (supabase as any)
      .from("user_task_progress")
      .upsert(upsertPayload, {
        onConflict: "user_id,task_id,reset_at"
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("❌ [TASKS-SYNC] DB Upsert: Error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [TASKS-SYNC] DB Upsert: Success for task:", data.taskId);
    return { success: true, data: result };
  } catch (error) {
    console.error("❌ [TASKS-SYNC] DB Upsert: Exception:", error);
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
    console.log("💾 [TASKS-SYNC] DB Batch: Starting for", records.length, "tasks");

    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      console.error("❌ [TASKS-SYNC] DB Batch: No Telegram user data");
      return { success: false, error: "No Telegram user data" };
    }
    
    console.log("🔵 [TASKS-SYNC] DB Batch: Telegram user ID:", tgUser.id);
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("❌ [TASKS-SYNC] DB Batch: Profile lookup error:", profileError);
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      console.error("❌ [TASKS-SYNC] DB Batch: Profile not found for telegram_id:", tgUser.id);
      return { success: false, error: "Profile not found" };
    }

    console.log("🔵 [TASKS-SYNC] DB Batch: Found profile UUID:", profile.id);

    const payloads = records.map(data => ({
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
      updated_at: new Date().toISOString()
    }));
    
    console.log("🔵 [TASKS-SYNC] DB Batch: Upserting", payloads.length, "records");

    const { error } = await (supabase as any)
      .from("user_task_progress")
      .upsert(payloads, {
        onConflict: "user_id,task_id,reset_at"
      });

    if (error) {
      console.error("❌ [TASKS-SYNC] DB Batch: Error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ [TASKS-SYNC] DB Batch: Success -", records.length, "tasks synced");
    return { success: true };
  } catch (error) {
    console.error("❌ [TASKS-SYNC] DB Batch: Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}