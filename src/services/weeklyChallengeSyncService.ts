import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type WeeklyChallengeRow = Database["public"]["Tables"]["user_weekly_challenges"]["Row"];
type WeeklyChallengeInsert = Database["public"]["Tables"]["user_weekly_challenges"]["Insert"];
type WeeklyChallengeUpdate = Database["public"]["Tables"]["user_weekly_challenges"]["Update"];

export type ChallengeKey = "tapper" | "builder" | "converter" | "recruiter";

export interface WeeklyChallengeData {
  challengeKey: ChallengeKey;
  currentProgress: number;
  baselineValue: number;
  targetValue: number;
  completed: boolean;
  claimed: boolean;
  weekStartDate: string;
  weekNumber: number;
  year: number;
}

/**
 * Get ISO week number and year for a given date
 */
function getISOWeekData(date: Date = new Date()): { weekNumber: number; year: number } {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  // January 4 is always in week 1
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return { weekNumber, year: tempDate.getFullYear() };
}

/**
 * Get the start date of the current ISO week (Monday)
 */
function getWeekStartDate(date: Date = new Date()): string {
  const tempDate = new Date(date.getTime());
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  tempDate.setDate(diff);
  tempDate.setHours(0, 0, 0, 0);
  return tempDate.toISOString().split("T")[0];
}

/**
 * Load all weekly challenges for a user from the database
 */
export async function loadWeeklyChallenges(
  userId: string,
  telegramId: number
): Promise<WeeklyChallengeData[]> {
  try {
    const weekStartDate = getWeekStartDate();
    const { weekNumber, year } = getISOWeekData();

    console.log("🔄 [WeeklyChallengeSync] Loading challenges:", { userId, telegramId, weekStartDate, weekNumber, year });

    const { data, error } = await supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("❌ [WeeklyChallengeSync] Load error:", error);
      throw error;
    }

    console.log("✅ [WeeklyChallengeSync] Loaded challenges:", data?.length || 0);

    // Convert DB format to app format
    return (data || []).map((row) => ({
      challengeKey: row.challenge_key as ChallengeKey,
      currentProgress: row.current_progress,
      baselineValue: row.baseline_value,
      targetValue: row.target_value,
      completed: row.completed,
      claimed: row.claimed,
      weekStartDate: row.week_start_date,
      weekNumber: row.week_number,
      year: row.year
    }));
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Load failed:", error);
    return [];
  }
}

/**
 * Initialize weekly challenges for a user (creates all 4 challenge types if they don't exist)
 */
export async function initializeWeeklyChallenges(
  userId: string,
  telegramId: number,
  baselines: {
    taps: number;
    upgrades: number;
    conversionEvents: number;
    referrals: number;
  }
): Promise<WeeklyChallengeData[]> {
  try {
    const weekStartDate = getWeekStartDate();
    const { weekNumber, year } = getISOWeekData();

    console.log("🔄 [WeeklyChallengeSync] Initializing challenges:", { userId, telegramId, weekStartDate, weekNumber, year, baselines });

    // Define all 4 challenge types with their targets
    const challenges: Array<{ key: ChallengeKey; target: number; baseline: number }> = [
      { key: "tapper", target: 10000, baseline: baselines.taps },
      { key: "builder", target: 5, baseline: baselines.upgrades },
      { key: "converter", target: 10, baseline: baselines.conversionEvents },
      { key: "recruiter", target: 3, baseline: baselines.referrals }
    ];

    // Check which challenges already exist
    const { data: existing } = await supabase
      .from("user_weekly_challenges")
      .select("challenge_key")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartDate);

    const existingKeys = new Set((existing || []).map((e) => e.challenge_key));

    // Insert only missing challenges
    const toInsert: WeeklyChallengeInsert[] = challenges
      .filter((c) => !existingKeys.has(c.key))
      .map((c) => ({
        user_id: userId,
        telegram_id: telegramId,
        challenge_key: c.key,
        baseline_value: c.baseline,
        target_value: c.target,
        week_start_date: weekStartDate,
        week_number: weekNumber,
        year: year,
        current_progress: 0,
        completed: false,
        claimed: false
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("user_weekly_challenges")
        .insert(toInsert);

      if (error) {
        console.error("❌ [WeeklyChallengeSync] Initialize error:", error);
        throw error;
      }

      console.log(`✅ [WeeklyChallengeSync] Initialized ${toInsert.length} new challenges`);
    } else {
      console.log("✅ [WeeklyChallengeSync] All challenges already exist");
    }

    // Load and return all challenges
    return await loadWeeklyChallenges(userId, telegramId);
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Initialize failed:", error);
    return [];
  }
}

/**
 * Update a single weekly challenge's progress
 */
export async function updateChallengeProgress(
  userId: string,
  challengeKey: ChallengeKey,
  currentProgress: number,
  completed: boolean = false
): Promise<boolean> {
  try {
    const weekStartDate = getWeekStartDate();

    console.log("🔄 [WeeklyChallengeSync] Updating progress:", { userId, challengeKey, currentProgress, completed, weekStartDate });

    const updateData: WeeklyChallengeUpdate = {
      current_progress: currentProgress,
      completed: completed,
      completed_at: completed ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("user_weekly_challenges")
      .update(updateData)
      .eq("user_id", userId)
      .eq("challenge_key", challengeKey)
      .eq("week_start_date", weekStartDate);

    if (error) {
      console.error("❌ [WeeklyChallengeSync] Update error:", error);
      throw error;
    }

    console.log("✅ [WeeklyChallengeSync] Progress updated successfully");
    return true;
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Update failed:", error);
    return false;
  }
}

/**
 * Claim a completed weekly challenge reward
 */
export async function claimChallengeReward(
  userId: string,
  challengeKey: ChallengeKey
): Promise<boolean> {
  try {
    const weekStartDate = getWeekStartDate();

    console.log("🔄 [WeeklyChallengeSync] Claiming reward:", { userId, challengeKey, weekStartDate });

    const { error } = await supabase
      .from("user_weekly_challenges")
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .eq("challenge_key", challengeKey)
      .eq("week_start_date", weekStartDate)
      .eq("completed", true); // Only allow claiming if completed

    if (error) {
      console.error("❌ [WeeklyChallengeSync] Claim error:", error);
      throw error;
    }

    console.log("✅ [WeeklyChallengeSync] Reward claimed successfully");
    return true;
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Claim failed:", error);
    return false;
  }
}

/**
 * Reset weekly challenges (called when week changes)
 * Creates new challenge records for the new week with updated baselines
 */
export async function resetWeeklyChallenges(
  userId: string,
  telegramId: number,
  newBaselines: {
    taps: number;
    upgrades: number;
    conversionEvents: number;
    referrals: number;
  }
): Promise<boolean> {
  try {
    const weekStartDate = getWeekStartDate();
    const { weekNumber, year } = getISOWeekData();

    console.log("🔄 [WeeklyChallengeSync] Resetting challenges for new week:", { userId, weekStartDate, weekNumber, year, newBaselines });

    // Initialize challenges for the new week
    await initializeWeeklyChallenges(userId, telegramId, newBaselines);

    console.log("✅ [WeeklyChallengeSync] Challenges reset successfully");
    return true;
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Reset failed:", error);
    return false;
  }
}

/**
 * Get challenge statistics for analytics
 */
export async function getChallengeStats(userId: string): Promise<{
  totalCompleted: number;
  totalClaimed: number;
  currentWeekProgress: number;
}> {
  try {
    const weekStartDate = getWeekStartDate();

    // Get all-time stats
    const { data: allTime } = await supabase
      .from("user_weekly_challenges")
      .select("completed, claimed")
      .eq("user_id", userId);

    // Get current week stats
    const { data: currentWeek } = await supabase
      .from("user_weekly_challenges")
      .select("current_progress, target_value")
      .eq("user_id", userId)
      .eq("week_start_date", weekStartDate);

    const totalCompleted = (allTime || []).filter((c) => c.completed).length;
    const totalClaimed = (allTime || []).filter((c) => c.claimed).length;
    const currentWeekProgress = currentWeek
      ? currentWeek.reduce((sum, c) => sum + (c.current_progress / c.target_value), 0) / currentWeek.length
      : 0;

    return {
      totalCompleted,
      totalClaimed,
      currentWeekProgress: Math.round(currentWeekProgress * 100)
    };
  } catch (error) {
    console.error("❌ [WeeklyChallengeSync] Stats failed:", error);
    return { totalCompleted: 0, totalClaimed: 0, currentWeekProgress: 0 };
  }
}