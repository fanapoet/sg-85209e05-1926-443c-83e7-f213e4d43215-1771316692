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
 * Returns only the most recent row per challenge_key to handle duplicate rows
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

    // Order by updated_at so the most recent row wins
    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      console.error("❌ [WeeklyChallenge] Fetch error:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log("ℹ️ [WeeklyChallenge] No challenges found - returning empty array");
      return { success: true, data: [] };
    }

    // Deduplicate by challenge_key, keeping the most recently updated row
    const seen = new Map<string, any>();
    data.forEach((row: any) => {
      const existing = seen.get(row.challenge_key);
      if (!existing) {
        seen.set(row.challenge_key, row);
        return;
      }
      // Prefer most recently updated row for the current week
      if (new Date(row.updated_at || 0) >= new Date(existing.updated_at || 0)) {
        seen.set(row.challenge_key, row);
      }
    });

    const deduped = Array.from(seen.values());

    const challenges: WeeklyChallengeData[] = deduped.map(row => ({
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

    // Get the most recent existing row
    const { data: existingRows, error: existingError } = await supabase
      .from("user_weekly_challenges")
      .select("id, baseline_value, claimed")
      .eq("telegram_id", telegramId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingError) {
      console.error("❌ [WeeklyChallenge] Fetch existing error:", existingError);
      return { success: false, error: existingError.message };
    }

    const existing = existingRows?.[0];
    const baseline = existing?.baseline_value ?? currentValue;
    const progress = Math.max(0, currentValue - baseline);
    const completed = progress >= targetValue;

    if (existing) {
      // Update only progress/completed — NEVER touch claimed
      const { error } = await supabase
        .from("user_weekly_challenges")
        .update({
          current_progress: progress,
          completed,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (error) {
        console.error("❌ [WeeklyChallenge] Update error:", error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new unclaimed row
      const weekStartDate = new Date(year, 0, 1 + (weekNumber - 1) * 7).toISOString().split("T")[0];
      const { error } = await supabase
        .from("user_weekly_challenges")
        .insert({
          user_id: profile.id,
          telegram_id: telegramId,
          challenge_key: challengeKey,
          baseline_value: baseline,
          current_progress: progress,
          target_value: targetValue,
          completed,
          claimed: false,
          week_start_date: weekStartDate,
          year,
          week_number: weekNumber,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("❌ [WeeklyChallenge] Insert error:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Claim weekly challenge reward (by telegram_id)
 * Uses explicit update by ID to avoid duplicate-row ambiguity
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

    // Get the most recent existing row for this challenge (ordered by updated_at)
    const { data: existingRows, error: fetchError } = await supabase
      .from("user_weekly_challenges")
      .select("id, baseline_value, current_progress, target_value, completed, claimed, week_start_date")
      .eq("telegram_id", telegramId)
      .eq("challenge_key", challengeKey)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("❌ [WeeklyChallenge] Fetch existing error:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const existing = existingRows?.[0];

    // Already claimed - don't allow double claim
    if (existing?.claimed) {
      console.log("⚠️ [WeeklyChallenge] Already claimed:", challengeKey);
      return { success: false, error: "Already claimed" };
    }

    const weekStartDate = existing?.week_start_date || new Date(year, 0, 1 + (weekNumber - 1) * 7).toISOString().split("T")[0];
    const targetValue = existing?.target_value ?? (challengeKey === "builder" ? 50 : challengeKey === "recruiter" ? 5 : 10);

    if (existing) {
      // Explicit update by ID — no upsert ambiguity
      const { error } = await supabase
        .from("user_weekly_challenges")
        .update({
          current_progress: targetValue,
          completed: true,
          claimed: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);

      if (error) {
        console.error("❌ [WeeklyChallenge] Claim update error:", error);
        return { success: false, error: error.message };
      }
    } else {
      // No row exists — insert claimed row
      const { error } = await supabase
        .from("user_weekly_challenges")
        .insert({
          user_id: profile.id,
          telegram_id: telegramId,
          challenge_key: challengeKey,
          baseline_value: 0,
          current_progress: targetValue,
          target_value: targetValue,
          completed: true,
          claimed: true,
          week_start_date: weekStartDate,
          year,
          week_number: weekNumber,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("❌ [WeeklyChallenge] Claim insert error:", error);
        return { success: false, error: error.message };
      }
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

    const weekStartDate = new Date(year, 0, 1 + (weekNumber - 1) * 7).toISOString().split("T")[0];

    // Delete existing rows for this user/challenge/week to prevent duplicates
    const { error: deleteError } = await supabase
      .from("user_weekly_challenges")
      .delete()
      .eq("telegram_id", telegramId)
      .eq("year", year)
      .eq("week_number", weekNumber);

    if (deleteError) {
      console.error("❌ [WeeklyChallenge] Reset delete error:", deleteError);
    }

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
 * Initialize weekly challenges for a new week
 * Creates rows with baseline = current stats, progress = 0
 * Skips if rows already exist
 */
export async function initializeChallenges(
  telegramId: number,
  year: number,
  weekNumber: number,
  currentStats: WeeklyChallengeStats
): Promise<{ success: boolean; data?: WeeklyChallengeData[]; error?: string }> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("❌ [WeeklyChallenge] Profile not found:", profileError);
      return { success: false, error: "Profile not found" };
    }

    // Check if rows already exist
    const { data: existingRows } = await supabase
      .from("user_weekly_challenges")
      .select("challenge_key")
      .eq("telegram_id", telegramId)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      console.log("ℹ️ [WeeklyChallenge] Already initialized for this week");
      return { success: true, data: [] };
    }

    const weekStartDate = new Date(year, 0, 1 + (weekNumber - 1) * 7).toISOString().split("T")[0];

    // Delete any stray rows for this user/challenge/week (defensive)
    await supabase
      .from("user_weekly_challenges")
      .delete()
      .eq("telegram_id", telegramId)
      .eq("year", year)
      .eq("week_number", weekNumber);

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
      console.error("❌ [WeeklyChallenge] Initialize error:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: challenges.map(row => ({
        challengeKey: row.challenge_key as ChallengeKey,
        baselineValue: row.baseline_value,
        currentProgress: row.current_progress,
        targetValue: row.target_value,
        completed: row.completed,
        claimed: row.claimed,
        weekStartDate: row.week_start_date,
        year: row.year,
        weekNumber: row.week_number
      }))
    };
  } catch (error) {
    console.error("❌ [WeeklyChallenge] Initialize exception:", error);
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

    const weekStartDate = new Date(year, 0, 1 + (weekNumber - 1) * 7).toISOString().split("T")[0];

    // Get existing challenges to preserve baselines
    const { data: existingRows, error: fetchError } = await supabase
      .from("user_weekly_challenges")
      .select("*")
      .eq("telegram_id", telegramId)
      .eq("year", year)
      .eq("week_number", weekNumber)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      console.error("❌ [WeeklyChallenge-Sync] Fetch error:", JSON.stringify(fetchError));
    }

    // Deduplicate by challenge_key, keeping most recent row
    const existingMap = new Map<ChallengeKey, any>();
    existingRows?.forEach((row: any) => {
      const key = row.challenge_key as ChallengeKey;
      if (!existingMap.has(key)) {
        existingMap.set(key, row);
      }
    });

    const getExisting = (key: ChallengeKey) => existingMap.get(key);

    for (const key of ["builder", "recruiter", "converter"] as ChallengeKey[]) {
      // Use deduped map; if no deduped row, check raw rows too
      let existing = getExisting(key);
      if (!existing && existingRows && existingRows.length > 0) {
        existing = existingRows.find((row: any) => row.challenge_key === key);
      }
      
      const baseline = existing?.baseline_value ?? (key === "builder" ? currentStats.totalUpgrades : key === "recruiter" ? currentStats.referralCount : currentStats.totalConversions);
      const currentValue = key === "builder" ? currentStats.totalUpgrades : key === "recruiter" ? currentStats.referralCount : currentStats.totalConversions;
      const progress = Math.max(0, currentValue - baseline);
      const completed = progress >= (key === "builder" ? 50 : key === "recruiter" ? 5 : 10);

      if (existing) {
        // Update only progress/completed — NEVER touch claimed
        const { error } = await supabase
          .from("user_weekly_challenges")
          .update({
            baseline_value: baseline,
            current_progress: progress,
            completed,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id);

        if (error) {
          console.error(`❌ [WeeklyChallenge-Sync] Update ${key} error:`, error);
        }
      } else {
        // Delete any stray rows first, then insert new unclaimed row
        await supabase
          .from("user_weekly_challenges")
          .delete()
          .eq("telegram_id", telegramId)
          .eq("challenge_key", key)
          .eq("year", year)
          .eq("week_number", weekNumber);

        const { error } = await supabase
          .from("user_weekly_challenges")
          .insert({
            user_id: profile.id,
            telegram_id: telegramId,
            challenge_key: key,
            baseline_value: baseline,
            current_progress: progress,
            target_value: key === "builder" ? 50 : key === "recruiter" ? 5 : 10,
            completed,
            claimed: false,
            week_start_date: weekStartDate,
            year,
            week_number: weekNumber,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error(`❌ [WeeklyChallenge-Sync] Insert ${key} error:`, error);
        }
      }
    }

    console.log(`✅ [WeeklyChallenge-Sync] Successfully synced 3 challenges`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("❌ [WeeklyChallenge-Sync] Exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}