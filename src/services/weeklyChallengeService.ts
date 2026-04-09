import { supabase } from "@/integrations/supabase/client";

/**
 * Weekly Challenge Service
 * Manages user_weekly_challenges table
 * FOLLOWS EXACT PATTERN FROM tasksService.ts and taskStateService.ts
 */

export type ChallengeKey = "builder" | "recruiter" | "converter";

export interface WeeklyChallengeData {
  challengeKey: ChallengeKey;
  baselineValue: number;
  currentProgress: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
  weekStartDate: string;
  year: number;
  weekNumber: number;
}

export interface WeeklyChallengeStats {
  totalUpgrades: number;
  referralCount: number;
  totalConversions: number;
}

/**
 * Get weekly challenges from database (by telegram_id)
 */
export async function getWeeklyChallenges(
  telegramId: number,
  year?: number,
  weekNumber?: number
): Promise<{ success: boolean; data?: WeeklyChallengeData[]; error?: string }> {
  try {
    console.log("🔍 [WeeklyChallenge] Fetching challenges for telegramId:", telegramId, "year:", year, "week:", weekNumber);
    
    // Get user_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [WeeklyChallenge] Profile not found:", profileError);
      return { success: false, error: "Profile not found" };
    }

    let query = supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("telegram_id", telegramId);

    if (year !== undefined) {
      query = query.eq("year", year);
    }
    if (weekNumber !== undefined) {
      query = query.eq("week_number", weekNumber);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ [WeeklyChallenge] Fetch error:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [WeeklyChallenge] No challenges found - returning empty array");
      return { success: true, data: [] };
    }

    const challenges: WeeklyChallengeData[] = data.map(row => ({
      challengeKey: row.challenge_key as ChallengeKey,
      baselineValue: row.baseline_value,
      currentProgress: row.current_progress,
      targetValue: row.target_value,
      completed: row.completed,
      claimed: row.claimed,
      weekStartDate: row.week_start_date,
      year: row.year,
      weekNumber: row.week_number
    }));

    console.log(`✅ [WeeklyChallenge] Loaded ${challenges.length} challenges:`, challenges);
    return { success: true, data: challenges };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update challenge progress (by telegram_id)
 */
export async function updateChallengeProgress(
  telegramId: number,
  challengeKey: ChallengeKey,
  currentValue: number,
  targetValue: number,
  year: number,
  weekNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [WeeklyChallenge] Profile not found:", profileError);
      return { success: false, error: "Profile not found" };
    }

    // Get existing challenge to get baseline
    const { data: existing } = await supabase
      .from("user_weekly_challenges")
      .select("baseline_value, claimed")
      .eq("telegram_id", telegramId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .maybeSingle();

    const baseline = existing?.baseline_value ?? currentValue;
    const progress = Math.max(0, currentValue - baseline);
    const completed = progress >= targetValue;
    const weekStartDate = new Date().toISOString().split("T")[0];

    const record = {
      user_id: profile.id,
      telegram_id: telegramId,
      challenge_key: challengeKey,
      baseline_value: baseline,
      current_progress: progress,
      target_value: targetValue,
      completed,
      claimed: existing?.claimed ?? false,
      week_start_date: weekStartDate,
      year,
      week_number: weekNumber,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("user_weekly_challenges")
      .upsert(record, {
        onConflict: "user_id,challenge_key,week_start_date"
      });

    if (error) {
      console.error("❌ [WeeklyChallenge] Update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Claim weekly challenge reward (by telegram_id)
 */
export async function claimWeeklyChallenge(
  telegramId: number,
  challengeKey: ChallengeKey,
  year: number,
  weekNumber: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [WeeklyChallenge] Profile not found:", profileError);
      return { success: false, error: "Profile not found" };
    }

    const { error } = await supabase
      .from("user_weekly_challenges")
      .update({ 
        claimed: true,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber);

    if (error) {
      console.error("❌ [WeeklyChallenge] Claim error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [WeeklyChallenge] Claimed ${challengeKey}`);
    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Reset weekly challenges (new week) - by telegram_id
 */
export async function resetWeeklyChallenges(
  telegramId: number,
  year: number,
  weekNumber: number,
  currentStats: WeeklyChallengeStats
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [WeeklyChallenge] Profile not found:", profileError);
      return { success: false, error: "Profile not found" };
    }

    const weekStartDate = new Date().toISOString().split("T")[0];

    const challenges = [
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "builder",
        baseline_value: currentStats.totalUpgrades,
        current_progress: 0,
        target_value: 50,
        completed: false,
        claimed: false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      },
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "recruiter",
        baseline_value: currentStats.referralCount,
        current_progress: 0,
        target_value: 5,
        completed: false,
        claimed: false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      },
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "converter",
        baseline_value: currentStats.totalConversions,
        current_progress: 0,
        target_value: 10,
        completed: false,
        claimed: false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      }
    ];

    const { error } = await supabase
      .from("user_weekly_challenges")
      .upsert(challenges, {
        onConflict: "user_id,challenge_key,week_start_date"
      });

    if (error) {
      console.error("❌ [WeeklyChallenge] Reset error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [WeeklyChallenge] Reset all challenges for week ${weekNumber}/${year}`);
    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Sync weekly challenges with current stats (by telegram_id)
 * Called during manual sync
 */
export async function syncWeeklyChallenges(
  telegramId: number,
  year: number,
  weekNumber: number,
  currentStats: WeeklyChallengeStats
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🔄 [WeeklyChallenge-Sync] Starting sync for telegramId:", telegramId);
    console.log("🔄 [WeeklyChallenge-Sync] Current stats:", currentStats);

    // Get user_id from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      const errorMsg = profileError ? JSON.stringify(profileError) : "Profile not found";
      console.error("❌ [WeeklyChallenge-Sync] Profile not found:", errorMsg);
      return { success: false, error: errorMsg };
    }

    const weekStartDate = new Date().toISOString().split("T")[0];

    // Get existing challenges to preserve baselines
    const { data: existing, error: fetchError } = await supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("telegram_id", telegramId)
      .eq("year", year)
      .eq("week_number", weekNumber);

    if (fetchError) {
      console.error("❌ [WeeklyChallenge-Sync] Fetch error:", JSON.stringify(fetchError));
    }

    console.log("📊 [WeeklyChallenge-Sync] Existing challenges:", existing);

    const challenges = [
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "builder",
        baseline_value: existing?.find((c: any) => c.challenge_key === "builder")?.baseline_value || currentStats.totalUpgrades,
        current_progress: Math.max(0, currentStats.totalUpgrades - (existing?.find((c: any) => c.challenge_key === "builder")?.baseline_value || currentStats.totalUpgrades)),
        target_value: 50,
        completed: (currentStats.totalUpgrades - (existing?.find((c: any) => c.challenge_key === "builder")?.baseline_value || currentStats.totalUpgrades)) >= 50,
        claimed: existing?.find((c: any) => c.challenge_key === "builder")?.claimed || false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      },
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "recruiter",
        baseline_value: existing?.find((c: any) => c.challenge_key === "recruiter")?.baseline_value || currentStats.referralCount,
        current_progress: Math.max(0, currentStats.referralCount - (existing?.find((c: any) => c.challenge_key === "recruiter")?.baseline_value || currentStats.referralCount)),
        target_value: 5,
        completed: (currentStats.referralCount - (existing?.find((c: any) => c.challenge_key === "recruiter")?.baseline_value || currentStats.referralCount)) >= 5,
        claimed: existing?.find((c: any) => c.challenge_key === "recruiter")?.claimed || false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      },
      {
        user_id: profile.id,
        telegram_id: telegramId,
        challenge_key: "converter",
        baseline_value: existing?.find((c: any) => c.challenge_key === "converter")?.baseline_value || currentStats.totalConversions,
        current_progress: Math.max(0, currentStats.totalConversions - (existing?.find((c: any) => c.challenge_key === "converter")?.baseline_value || currentStats.totalConversions)),
        target_value: 10,
        completed: (currentStats.totalConversions - (existing?.find((c: any) => c.challenge_key === "converter")?.baseline_value || currentStats.totalConversions)) >= 10,
        claimed: existing?.find((c: any) => c.challenge_key === "converter")?.claimed || false,
        week_start_date: weekStartDate,
        year,
        week_number: weekNumber
      }
    ];

    console.log("📝 [WeeklyChallenge-Sync] Upserting challenges:", JSON.stringify(challenges, null, 2));

    const { data: upsertData, error } = await supabase
      .from("user_weekly_challenges")
      .upsert(challenges, {
        onConflict: "user_id,challenge_key,week_start_date"
      });

    if (error) {
      const errorDetails = {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      };
      console.error("❌ [WeeklyChallenge-Sync] Upsert failed:", JSON.stringify(errorDetails, null, 2));
      return { success: false, error: JSON.stringify(errorDetails) };
    }

    console.log(`✅ [WeeklyChallenge-Sync] Successfully synced ${challenges.length} challenges`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("❌ [WeeklyChallenge-Sync] Exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}