import { supabase } from "@/integrations/supabase/client";

export type ChallengeKey = "builder" | "recruiter" | "converter";

export interface WeeklyChallengeData {
  challengeKey: ChallengeKey;
  baselineValue: number;
  currentProgress: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
  weekNumber: number;
  year: number;
}

// Get all weekly challenges for a user
export async function getWeeklyChallenges(userId: string, year: number, weekNumber: number) {
  try {
    const { data, error } = await supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .eq("week_number", weekNumber);

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
  userId: string,
  challengeData: WeeklyChallengeData
) {
  try {
    // Find existing record to get its ID, bypassing the need for a named constraint in upsert
    const { data: existing } = await supabase
      .from("user_weekly_challenges")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_key", challengeData.challengeKey)
      .eq("year", challengeData.year)
      .eq("week_number", challengeData.weekNumber)
      .maybeSingle();

    const payload: any = {
      user_id: userId,
      challenge_key: challengeData.challengeKey,
      baseline_value: challengeData.baselineValue,
      current_progress: challengeData.currentProgress,
      target_value: challengeData.targetValue,
      completed: challengeData.completed,
      claimed: challengeData.claimed,
      year: challengeData.year,
      week_number: challengeData.weekNumber
    };

    if (existing?.id) {
      payload.id = existing.id;
    }

    const { data, error } = await supabase
      .from("user_weekly_challenges")
      .upsert(payload)
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
  userId: string,
  year: number,
  weekNumber: number,
  currentStats: { totalUpgrades: number; referralCount: number; totalConversions: number }
) {
  try {
    const challenges: WeeklyChallengeData[] = [
      { challengeKey: "builder", baselineValue: currentStats.totalUpgrades, currentProgress: 0, targetValue: 50, completed: false, claimed: false, weekNumber, year },
      { challengeKey: "recruiter", baselineValue: currentStats.referralCount, currentProgress: 0, targetValue: 5, completed: false, claimed: false, weekNumber, year },
      { challengeKey: "converter", baselineValue: currentStats.totalConversions, currentProgress: 0, targetValue: 10, completed: false, claimed: false, weekNumber, year }
    ];

    const results = await Promise.all(
      challenges.map(c => upsertWeeklyChallenge(userId, c))
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
  userId: string,
  challengeKey: ChallengeKey,
  currentProgress: number,
  targetValue: number,
  year: number,
  weekNumber: number
) {
  try {
    const { data: existing } = await supabase
      .from("user_weekly_challenges")
      .select("id, baseline_value, claimed")
      .eq("user_id", userId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .maybeSingle();

    const baselineValue = existing?.baseline_value || 0;
    const progress = Math.max(0, currentProgress - baselineValue);
    const completed = progress >= targetValue;

    const payload: any = {
      user_id: userId,
      challenge_key: challengeKey,
      baseline_value: baselineValue,
      current_progress: progress,
      target_value: targetValue,
      completed,
      claimed: existing ? existing.claimed : false,
      year,
      week_number: weekNumber
    };

    if (existing?.id) {
      payload.id = existing.id;
    }

    const { error } = await supabase
      .from("user_weekly_challenges")
      .upsert(payload);

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
  userId: string,
  challengeKey: ChallengeKey,
  year: number,
  weekNumber: number
) {
  try {
    const { error } = await supabase
      .from("user_weekly_challenges")
      .update({ 
        claimed: true,
        claimed_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber);

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
  userId: string,
  year: number,
  weekNumber: number,
  currentStats: { totalUpgrades: number; referralCount: number; totalConversions: number }
) {
  try {
    const updates = [
      updateChallengeProgress(userId, "builder", currentStats.totalUpgrades, 50, year, weekNumber),
      updateChallengeProgress(userId, "recruiter", currentStats.referralCount, 5, year, weekNumber),
      updateChallengeProgress(userId, "converter", currentStats.totalConversions, 10, year, weekNumber)
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