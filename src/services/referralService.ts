import { supabase } from "@/integrations/supabase/client";

export interface Referral {
  id: string;
  inviter_id: string;
  invitee_id: string;
  referral_code: string;
  invited_at: string;
  inviter_reward_claimed: boolean;
  invitee_reward_claimed: boolean;
}

export interface ReferralEarning {
  id: string;
  inviter_id: string;
  invitee_id: string;
  earnings_type: "tap" | "idle" | "boost";
  amount: number;
  share_amount: number;
  claimed: boolean;
  earned_at: string;
  claimed_at?: string;
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
  });

  if (error) {
    console.error("Error creating referral:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Claim invitee reward (500 BZ - one-time)
 */
export async function claimInviteeReward(inviteeId: string): Promise<{ success: boolean; reward: number }> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, invitee_reward_claimed")
    .eq("invitee_id", inviteeId)
    .single();

  if (error || !data) {
    return { success: false, reward: 0 };
  }

  if (data.invitee_reward_claimed) {
    return { success: false, reward: 0 };
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from("referrals")
    .update({ invitee_reward_claimed: true })
    .eq("id", data.id);

  if (updateError) {
    console.error("Error claiming invitee reward:", updateError);
    return { success: false, reward: 0 };
  }

  return { success: true, reward: 500 };
}

/**
 * Claim inviter reward (1000 BZ + 1000 XP - one-time)
 */
export async function claimInviterReward(
  inviterId: string,
  inviteeId: string
): Promise<{ success: boolean; bzReward: number; xpReward: number }> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, inviter_reward_claimed")
    .eq("inviter_id", inviterId)
    .eq("invitee_id", inviteeId)
    .single();

  if (error || !data) {
    return { success: false, bzReward: 0, xpReward: 0 };
  }

  if (data.inviter_reward_claimed) {
    return { success: false, bzReward: 0, xpReward: 0 };
  }

  // Mark as claimed
  const { error: updateError } = await supabase
    .from("referrals")
    .update({ inviter_reward_claimed: true })
    .eq("id", data.id);

  if (updateError) {
    console.error("Error claiming inviter reward:", updateError);
    return { success: false, bzReward: 0, xpReward: 0 };
  }

  return { success: true, bzReward: 1000, xpReward: 1000 };
}

/**
 * Record earnings for 20% lifetime share
 */
export async function recordReferralEarnings(
  inviteeId: string,
  earningsType: "tap" | "idle" | "boost",
  amount: number
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

  const shareAmount = Math.floor(amount * 0.2); // 20% share

  const { error } = await supabase.from("referral_earnings").insert({
    inviter_id: referralData.inviter_id,
    invitee_id: inviteeId,
    earnings_type: earningsType,
    amount,
    share_amount: shareAmount,
    claimed: false,
  });

  if (error) {
    console.error("Error recording referral earnings:", error);
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
        .select("amount, share_amount, claimed")
        .eq("inviter_id", userId)
        .eq("invitee_id", ref.invitee_id);

      const total_earned = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const your_share = earnings?.reduce((sum, e) => sum + e.share_amount, 0) || 0;

      return {
        invitee_id: ref.invitee_id,
        invited_at: ref.invited_at,
        total_earned,
        your_share,
      };
    })
  );

  // Get pending earnings (unclaimed)
  const { data: pendingData } = await supabase
    .from("referral_earnings")
    .select("share_amount")
    .eq("inviter_id", userId)
    .eq("claimed", false);

  const pending_earnings = pendingData?.reduce((sum, e) => sum + e.share_amount, 0) || 0;

  // Get total claimed earnings
  const { data: claimedData } = await supabase
    .from("referral_earnings")
    .select("share_amount")
    .eq("inviter_id", userId)
    .eq("claimed", true);

  const total_claimed = claimedData?.reduce((sum, e) => sum + e.share_amount, 0) || 0;

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
    .select("id, share_amount")
    .eq("inviter_id", userId)
    .eq("claimed", false);

  if (fetchError || !pendingData || pendingData.length === 0) {
    return { success: false, amount: 0 };
  }

  const totalAmount = pendingData.reduce((sum, e) => sum + e.share_amount, 0);
  const earningIds = pendingData.map((e) => e.id);

  // Mark as claimed
  const { error: updateError } = await supabase
    .from("referral_earnings")
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .in("id", earningIds);

  if (updateError) {
    console.error("Error claiming earnings:", updateError);
    return { success: false, amount: 0 };
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

/**
 * Find inviter by referral code
 */
export async function findInviterByCode(referralCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("referrals")
    .select("inviter_id")
    .eq("referral_code", referralCode)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data.inviter_id;
}