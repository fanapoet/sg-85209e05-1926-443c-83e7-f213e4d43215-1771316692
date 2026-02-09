import { supabase } from "@/integrations/supabase/client";

export interface TaskStateData {
  telegramId: number;
  userId?: string;
  lastDailyResetDate: string | null;
  lastWeeklyResetDate: string | null;
}

export interface TaskStateRecord {
  id: string;
  userId: string;
  telegramId: number;
  lastDailyResetDate: string | null;
  lastWeeklyResetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getTaskState(telegramId: number): Promise<TaskStateRecord | null> {
  try {
    const { data, error } = await supabase
      .from("user_task_state")
      .select("id, user_id, telegram_id, last_daily_reset_date, last_weekly_reset_date, created_at, updated_at")
      .eq("telegram_id", telegramId)
      .is("task_id", null)
      .maybeSingle();

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      telegramId: data.telegram_id,
      lastDailyResetDate: data.last_daily_reset_date,
      lastWeeklyResetDate: data.last_weekly_reset_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    return null;
  }
}

export async function upsertTaskState(data: TaskStateData) {
  try {
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError) {
      return { success: false, error: profileError.message };
    }
    
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: data.telegramId,
        user_id: profile.id,
        last_daily_reset_date: data.lastDailyResetDate,
        last_weekly_reset_date: data.lastWeeklyResetDate,
        task_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", data.telegramId)
      .eq("task_id", null)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function updateDailyResetDate(telegramId: number, resetDate: string) {
  try {
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const existing = await getTaskState(telegramId);
    
    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: telegramId,
        user_id: profile.id,
        task_id: null,
        last_daily_reset_date: resetDate,
        last_weekly_reset_date: existing?.lastWeeklyResetDate || resetDate,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .eq("task_id", null)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function updateWeeklyResetDate(telegramId: number, resetDate: string) {
  try {
    const tgUser = typeof window !== "undefined" ? (window as any).Telegram?.WebApp?.initDataUnsafe?.user : null;
    
    if (!tgUser) {
      return { success: false, error: "No Telegram user data" };
    }
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();
    
    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const existing = await getTaskState(telegramId);
    
    const { data: result, error } = await supabase
      .from("user_task_state")
      .upsert({
        telegram_id: telegramId,
        user_id: profile.id,
        task_id: null,
        last_daily_reset_date: existing?.lastDailyResetDate || resetDate,
        last_weekly_reset_date: resetDate,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .eq("task_id", null)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}