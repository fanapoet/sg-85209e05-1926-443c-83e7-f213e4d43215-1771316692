import { supabase } from "@/integrations/supabase/client";

export interface Referral {
  id: string;
  inviter_id: string;
  invitee_id: string;
  referral_code: string;
  invited_at: string;
  bonus_claimed: boolean;
  claimed_at?: string;
}

export interface ReferralEarning {
  id: string;
  inviter_id: string;
  invitee_id: string;
  tap_earnings: number;
  idle_earnings: number;
  total_pending: number;
  last_snapshot_tap: number;
  last_snapshot_idle: number;
  claimed: boolean;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  pending_earnings: number;
  total_claimed: number;
  referrals: Array<{
    invitee_id: string;
    invited_at: string;
    total_earned: number;
    your_share: number;
  }>;
}

/**
 * Generate a stable referral code from user ID
 */
export function generateReferralCode(userId: string): string {
  // Create a simple hash from user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
  return `REF${code}`;
}

/**
 * Get or create user profile with referral code
 */
export async function getOrCreateProfile(userId: string): Promise<{ referralCode: string; telegramId?: number }> {
  // First check if profile exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("referral_code, telegram_id")
    .eq("id", userId)
    .single();

  if (existingProfile && !fetchError) {
    return {
      referralCode: existingProfile.referral_code,
      telegramId: existingProfile.telegram_id || undefined,
    };
  }

  // Profile doesn't exist, create it
  const referralCode = generateReferralCode(userId);
  
  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      referral_code: referralCode,
    })
    .select("referral_code, telegram_id")
    .single();

  if (insertError) {
    console.error("Error creating profile:", insertError);
    // Return generated code even if insert fails (might be a race condition)
    return { referralCode };
  }

  return {
    referralCode: newProfile.referral_code,
    telegramId: newProfile.telegram_id || undefined,
  };
}

/**
 * Check if a referral relationship exists
 */
export async function checkReferralExists(inviteeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id")
    .eq("invitee_id", inviteeId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking referral:", error);
  }

  return !!data;
}

/**
 * Find inviter by referral code
 */
export async function findInviterByCode(referralCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", referralCode.toUpperCase())
    .single();

  if (error || !data) {
    console.error("Error finding inviter by code:", error);
    return null;
  }

  return data.id;
}

/**
 * Create a referral relationship (called when invitee opens app with ref code)
 */
export async function createReferral(
  inviterId: string,
  inviteeId: string,
  referralCode: string
): Promise<{ success: boolean; error?: string }> {
  // Prevent self-referral
  if (inviterId === inviteeId) {
    return { success: false, error: "Cannot refer yourself" };
  }

  // Check if invitee already has a referrer
  const exists = await checkReferralExists(inviteeId);
  if (exists) {
    return { success: false, error: "User already referred" };
  }

  const { error } = await supabase.from("referrals").insert({
    inviter_id: inviterId,
    invitee_id: inviteeId,
    referral_code: referralCode,
    bonus_claimed: false,
  });

  if (error) {
    console.error("Error creating referral:", error);
    return { success: false, error: error.message };
  }

  // Create earnings tracking record
  await supabase.from("referral_earnings").insert({
    inviter_id: inviterId,
    invitee_id: inviteeId,
    tap_earnings: 0,
    idle_earnings: 0,
    total_pending: 0,
    last_snapshot_tap: 0,
    last_snapshot_idle: 0,
    claimed: false,
  });

  return { success: true };
}

/**
 * Claim one-time referral bonus (invitee gets 500 BZ, inviter gets 1000 BZ + 1000 XP)
 */
export async function claimReferralBonus(
  inviterId: string,
  inviteeId: string
): Promise<{ success: boolean; inviterReward?: { bz: number; xp: number }; inviteeReward?: number }> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, bonus_claimed")
    .eq("inviter_id", inviterId)
    .eq("invitee_id", inviteeId)
    .single();

  if (error || !data) {
    return { success: false };
  }

  if (data.bonus_claimed) {
    return { success: false };
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from("referrals")
    .update({ bonus_claimed: true, claimed_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    console.error("Error claiming bonus:", updateError);
    return { success: false };
  }

  return {
    success: true,
    inviterReward: { bz: 1000, xp: 1000 },
    inviteeReward: 500,
  };
}

/**
 * Record earnings for 20% lifetime share (call this when invitee earns BZ)
 */
export async function recordReferralEarnings(
  inviteeId: string,
  tapAmount: number,
  idleAmount: number
): Promise<void> {
  // Find the inviter
  const { data: referralData } = await supabase
    .from("referrals")
    .select("inviter_id")
    .eq("invitee_id", inviteeId)
    .single();

  if (!referralData) {
    return; // No referrer, nothing to record
  }

  // Get or create earnings record
  const { data: earnings } = await supabase
    .from("referral_earnings")
    .select("*")
    .eq("inviter_id", referralData.inviter_id)
    .eq("invitee_id", inviteeId)
    .single();

  if (!earnings) {
    // Create new earnings record
    await supabase.from("referral_earnings").insert({
      inviter_id: referralData.inviter_id,
      invitee_id: inviteeId,
      tap_earnings: tapAmount,
      idle_earnings: idleAmount,
      total_pending: Math.floor((tapAmount + idleAmount) * 0.2),
      last_snapshot_tap: tapAmount,
      last_snapshot_idle: idleAmount,
      claimed: false,
    });
  } else {
    // Update existing record
    const newTapEarnings = earnings.tap_earnings + tapAmount;
    const newIdleEarnings = earnings.idle_earnings + idleAmount;
    const newPending = Math.floor((newTapEarnings + newIdleEarnings - earnings.last_snapshot_tap - earnings.last_snapshot_idle) * 0.2);

    await supabase
      .from("referral_earnings")
      .update({
        tap_earnings: newTapEarnings,
        idle_earnings: newIdleEarnings,
        total_pending: earnings.total_pending + newPending,
      })
      .eq("id", earnings.id);
  }
}

/**
 * Get referral statistics for a user (inviter)
 */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  // Get all referrals
  const { data: referrals, error: refError } = await supabase
    .from("referrals")
    .select("invitee_id, invited_at")
    .eq("inviter_id", userId)
    .order("invited_at", { ascending: false });

  if (refError) {
    console.error("Error fetching referrals:", refError);
    return {
      total_referrals: 0,
      pending_earnings: 0,
      total_claimed: 0,
      referrals: [],
    };
  }

  const total_referrals = referrals?.length || 0;

  // Get earnings for each invitee
  const referralList = await Promise.all(
    (referrals || []).map(async (ref) => {
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("tap_earnings, idle_earnings, total_pending")
        .eq("inviter_id", userId)
        .eq("invitee_id", ref.invitee_id)
        .single();

      const total_earned = earnings ? earnings.tap_earnings + earnings.idle_earnings : 0;
      const your_share = earnings ? earnings.total_pending : 0;

      return {
        invitee_id: ref.invitee_id,
        invited_at: ref.invited_at,
        total_earned,
        your_share,
      };
    })
  );

  // Get pending earnings (unclaimed)
  const { data: earningsData } = await supabase
    .from("referral_earnings")
    .select("total_pending")
    .eq("inviter_id", userId)
    .eq("claimed", false);

  const pending_earnings = earningsData?.reduce((sum, e) => sum + e.total_pending, 0) || 0;

  // Get total claimed earnings (calculate from snapshots)
  const { data: claimedData } = await supabase
    .from("referral_earnings")
    .select("last_snapshot_tap, last_snapshot_idle")
    .eq("inviter_id", userId)
    .eq("claimed", true);

  const total_claimed = claimedData?.reduce((sum, e) => sum + Math.floor((e.last_snapshot_tap + e.last_snapshot_idle) * 0.2), 0) || 0;

  return {
    total_referrals,
    pending_earnings,
    total_claimed,
    referrals: referralList,
  };
}

/**
 * Claim pending referral earnings (20% share)
 */
export async function claimPendingEarnings(userId: string): Promise<{ success: boolean; amount: number }> {
  // Get unclaimed earnings
  const { data: pendingData, error: fetchError } = await supabase
    .from("referral_earnings")
    .select("id, total_pending, tap_earnings, idle_earnings")
    .eq("inviter_id", userId)
    .eq("claimed", false);

  if (fetchError || !pendingData || pendingData.length === 0) {
    return { success: false, amount: 0 };
  }

  const totalAmount = pendingData.reduce((sum, e) => sum + e.total_pending, 0);

  if (totalAmount === 0) {
    return { success: false, amount: 0 };
  }

  // Mark as claimed and update snapshots
  for (const earning of pendingData) {
    await supabase
      .from("referral_earnings")
      .update({
        claimed: true,
        last_snapshot_tap: earning.tap_earnings,
        last_snapshot_idle: earning.idle_earnings,
        total_pending: 0,
      })
      .eq("id", earning.id);
  }

  return { success: true, amount: totalAmount };
}

/**
 * Check and claim referral milestones (5, 10, 25, 50 referrals)
 */
export async function checkAndClaimMilestone(
  userId: string,
  referralCount: number
): Promise<{ milestone?: number; xpReward?: number }> {
  const milestones = [
    { count: 5, xp: 5000 },
    { count: 10, xp: 15000 },
    { count: 25, xp: 50000 },
    { count: 50, xp: 150000 },
  ];

  // Find the highest eligible milestone
  const eligible = milestones.filter((m) => referralCount >= m.count).sort((a, b) => b.count - a.count);

  if (eligible.length === 0) {
    return {};
  }

  const nextMilestone = eligible[0];

  // Check if already claimed
  const { data: existingClaim } = await supabase
    .from("referral_milestones")
    .select("id")
    .eq("user_id", userId)
    .eq("milestone", nextMilestone.count)
    .single();

  if (existingClaim) {
    return {}; // Already claimed
  }

  // Claim milestone
  const { error } = await supabase.from("referral_milestones").insert({
    user_id: userId,
    milestone: nextMilestone.count,
    xp_reward: nextMilestone.xp,
  });

  if (error) {
    console.error("Error claiming milestone:", error);
    return {};
  }

  return { milestone: nextMilestone.count, xpReward: nextMilestone.xp };
}

/**
 * Get claimed milestones for a user
 */
export async function getClaimedMilestones(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("referral_milestones")
    .select("milestone")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching milestones:", error);
    return [];
  }

  return data?.map((m) => m.milestone) || [];
}