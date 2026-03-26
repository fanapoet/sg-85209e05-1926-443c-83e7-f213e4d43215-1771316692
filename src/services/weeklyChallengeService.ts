import { supabase } from "@/integrations/supabase/client";

export type ChallengeType = "builder" | "recruiter" | "converter";

export interface WeeklyChallengeData {
  challengeType: ChallengeType;
  baselineValue: number;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
  weekStartDate: string;
  weekNumber: number;
}

// Get all weekly challenges for a user
export async function getWeeklyChallenges(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("telegram_id", telegramId);

    if (error) {
      console.error("❌ [WeeklyChallenge] Failed to fetch challenges:", error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception fetching challenges:", error);
    return { success: false, error: String(error), data: null };
  }
}

// Initialize or update a weekly challenge
export async function upsertWeeklyChallenge(
  telegramId: number,
  userId: string,
  challengeData: WeeklyChallengeData
) {
  try {
    const { data, error } = await supabase
      .from("user_weekly_challenges")
      .upsert({
        telegram_id: telegramId,
        user_id: userId,
        challenge_type: challengeData.challengeType,
        baseline_value: challengeData.baselineValue,
        current_progress: challengeData.currentProgress,
        completed: challengeData.completed,
        claimed: challengeData.claimed,
        week_start_date: challengeData.weekStartDate,
        week_number: challengeData.weekNumber,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id,challenge_type,week_start_date"
      })
      .select()
      .single();

    if (error) {
      console.error("❌ [WeeklyChallenge] Failed to upsert challenge:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception upserting challenge:", error);
    return { success: false, error: String(error) };
  }
}

// Reset all challenges for a new week
export async function resetWeeklyChallenges(
  telegramId: number,
  userId: string,
  weekStartDate: string,
  weekNumber: number,
  currentStats: { totalUpgrades: number; referralCount: number; totalConversions: number }
) {
  try {
    // Create new baseline records for the new week
    const challenges: WeeklyChallengeData[] = [
      {
        challengeType: "builder",
        baselineValue: currentStats.totalUpgrades,
        currentProgress: 0,
        completed: false,
        claimed: false,
        weekStartDate,
        weekNumber
      },
      {
        challengeType: "recruiter",
        baselineValue: currentStats.referralCount,
        currentProgress: 0,
        completed: false,
        claimed: false,
        weekStartDate,
        weekNumber
      },
      {
        challengeType: "converter",
        baselineValue: currentStats.totalConversions,
        currentProgress: 0,
        completed: false,
        claimed: false,
        weekStartDate,
        weekNumber
      }
    ];

    const results = await Promise.all(
      challenges.map(c => upsertWeeklyChallenge(telegramId, userId, c))
    );

    const allSuccess = results.every(r => r.success);
    if (!allSuccess) {
      const errors = results.filter(r => !r.success).map(r => r.error);
      console.error("❌ [WeeklyChallenge] Some challenges failed to reset:", errors);
      return { success: false, error: errors.join(", ") };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception resetting challenges:", error);
    return { success: false, error: String(error) };
  }
}

// Update challenge progress
export async function updateChallengeProgress(
  telegramId: number,
  userId: string,
  challengeType: ChallengeType,
  currentProgress: number,
  targetValue: number,
  weekStartDate: string,
  weekNumber: number
) {
  try {
    // Get current baseline
    const { data: existing } = await supabase
      .from("user_weekly_challenges")
      .select("baseline_value")
      .eq("telegram_id", telegramId)
      .eq("challenge_type", challengeType)
      .eq("week_start_date", weekStartDate)
      .maybeSingle();

    const baselineValue = existing?.baseline_value || 0;
    const progress = Math.max(0, currentProgress - baselineValue);
    const completed = progress >= targetValue;

    const { error } = await supabase
      .from("user_weekly_challenges")
      .upsert({
        telegram_id: telegramId,
        user_id: userId,
        challenge_type: challengeType,
        baseline_value: baselineValue,
        current_progress: progress,
        completed,
        claimed: existing ? undefined : false, // Don't overwrite claimed status
        week_start_date: weekStartDate,
        week_number: weekNumber,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "telegram_id,challenge_type,week_start_date"
      });

    if (error) {
      console.error("❌ [WeeklyChallenge] Failed to update progress:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception updating progress:", error);
    return { success: false, error: String(error) };
  }
}

// Mark challenge as claimed
export async function claimWeeklyChallenge(
  telegramId: number,
  challengeType: ChallengeType,
  weekStartDate: string
) {
  try {
    const { error } = await supabase
      .from("user_weekly_challenges")
      .update({ 
        claimed: true,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegramId)
      .eq("challenge_type", challengeType)
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("❌ [WeeklyChallenge] Failed to claim challenge:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception claiming challenge:", error);
    return { success: false, error: String(error) };
  }
}

// Sync all weekly challenges with current game stats
export async function syncWeeklyChallenges(
  telegramId: number,
  userId: string,
  weekStartDate: string,
  weekNumber: number,
  currentStats: { totalUpgrades: number; referralCount: number; totalConversions: number }
) {
  try {
    const updates = [
      updateChallengeProgress(telegramId, userId, "builder", currentStats.totalUpgrades, 50, weekStartDate, weekNumber),
      updateChallengeProgress(telegramId, userId, "recruiter", currentStats.referralCount, 5, weekStartDate, weekNumber),
      updateChallengeProgress(telegramId, userId, "converter", currentStats.totalConversions, 10, weekStartDate, weekNumber)
    ];

    const results = await Promise.all(updates);
    const allSuccess = results.every(r => r.success);

    if (!allSuccess) {
      const errors = results.filter(r => !r.success).map(r => r.error);
      console.error("❌ [WeeklyChallenge] Some syncs failed:", errors);
      return { success: false, error: errors.join(", ") };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception syncing challenges:", error);
    return { success: false, error: String(error) };
  }
}