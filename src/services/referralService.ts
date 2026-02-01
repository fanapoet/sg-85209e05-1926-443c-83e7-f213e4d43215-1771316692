import { supabase } from "@/integrations/supabase/client";

// Define strict interfaces for our app usage
export interface Referral {
  id: string;
  inviter_id: number;
  invitee_id: number;
  referral_code: string;
  invited_at: string;
  bonus_claimed: boolean;
  claimed_at?: string;
}

export interface ReferralEarning {
  id: string;
  inviter_id: number;
  invitee_id: number;
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
    invitee_id: number;
    invited_at: string;
    total_earned: number;
    your_share: number;
  }>;
}

/**
 * Check if a referral relationship exists
 */
export async function checkReferralExists(inviteeId: number): Promise<boolean> {
  // Cast query to any to bypass strict type checking against outdated generated types
  const { data, error } = await supabase
    .from("referrals")
    .select("id")
    .eq("invitee_id", inviteeId as any) 
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Error checking referral:", error);
  }

  return !!data;
}

/**
 * Find inviter by referral code
 */
export async function findInviterByCode(referralCode: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("telegram_id")
    .eq("referral_code", referralCode.toUpperCase())
    .single();

  if (error || !data) {
    console.error("Error finding inviter by code:", error);
    return null;
  }

  return data.telegram_id;
}

/**
 * Create a referral relationship (called when invitee opens app with ref code)
 */
export async function createReferral(
  inviterId: number,
  inviteeId: number,
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

  // Cast payload to any to bypass type mismatch (number vs string UUID in old schema)
  const payload = {
    inviter_id: inviterId,
    invitee_id: inviteeId,
    referral_code: referralCode,
    bonus_claimed: false,
  };

  const { error } = await supabase.from("referrals").insert(payload as any);

  if (error) {
    console.error("Error creating referral:", error);
    return { success: false, error: error.message };
  }

  // Create earnings tracking record
  const earningsPayload = {
    inviter_id: inviterId,
    invitee_id: inviteeId,
    tap_earnings: 0,
    idle_earnings: 0,
    total_pending: 0,
    last_snapshot_tap: 0,
    last_snapshot_idle: 0,
    claimed: false,
  };

  await supabase.from("referral_earnings").insert(earningsPayload as any);

  return { success: true };
}

/**
 * Claim one-time referral bonus (invitee gets 500 BZ, inviter gets 1000 BZ + 1000 XP)
 */
export async function claimReferralBonus(
  inviterId: number,
  inviteeId: number
): Promise<{ success: boolean; inviterReward?: { bz: number; xp: number }; inviteeReward?: number }> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, bonus_claimed")
    .eq("inviter_id", inviterId as any)
    .eq("invitee_id", inviteeId as any)
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
    .update({ bonus_claimed: true, claimed_at: new Date().toISOString() } as any)
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
 * Get referral statistics for a user (inviter)
 */
export async function getReferralStats(telegramId: number): Promise<ReferralStats> {
  const { data: referrals, error: refError } = await supabase
    .from("referrals")
    .select("invitee_id, invited_at")
    .eq("inviter_id", telegramId as any)
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

  const referralList = await Promise.all(
    (referrals || []).map(async (ref: any) => {
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("tap_earnings, idle_earnings, total_pending")
        .eq("inviter_id", telegramId as any)
        .eq("invitee_id", ref.invitee_id)
        .single();

      const total_earned = earnings ? earnings.tap_earnings + earnings.idle_earnings : 0;
      const your_share = earnings ? earnings.total_pending : 0;

      return {
        invitee_id: ref.invitee_id, // This is now a number (telegram_id)
        invited_at: ref.invited_at,
        total_earned,
        your_share,
      };
    })
  );

  const { data: earningsData } = await supabase
    .from("referral_earnings")
    .select("total_pending")
    .eq("inviter_id", telegramId as any)
    .eq("claimed", false);

  const pending_earnings = earningsData?.reduce((sum, e) => sum + e.total_pending, 0) || 0;

  const { data: claimedData } = await supabase
    .from("referral_earnings")
    .select("last_snapshot_tap, last_snapshot_idle")
    .eq("inviter_id", telegramId as any)
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
export async function claimPendingEarnings(telegramId: number): Promise<{ success: boolean; amount: number }> {
  const { data: pendingData, error: fetchError } = await supabase
    .from("referral_earnings")
    .select("id, total_pending, tap_earnings, idle_earnings")
    .eq("inviter_id", telegramId as any)
    .eq("claimed", false);

  if (fetchError || !pendingData || pendingData.length === 0) {
    return { success: false, amount: 0 };
  }

  const totalAmount = pendingData.reduce((sum, e) => sum + e.total_pending, 0);

  if (totalAmount === 0) {
    return { success: false, amount: 0 };
  }

  for (const earning of pendingData) {
    await supabase
      .from("referral_earnings")
      .update({
        claimed: true,
        last_snapshot_tap: earning.tap_earnings,
        last_snapshot_idle: earning.idle_earnings,
        total_pending: 0,
      } as any)
      .eq("id", earning.id);
  }

  return { success: true, amount: totalAmount };
}

/**
 * Record earnings from a user's activity to credit their referrer
 */
export async function recordReferralEarnings(inviteeId: number, amount: number, type: 'tap' | 'idle'): Promise<void> {
  // 1. Find who referred this user
  const { data: referral } = await supabase
    .from("referrals")
    .select("inviter_id")
    .eq("invitee_id", inviteeId as any)
    .maybeSingle();

  if (!referral) return;

  // 2. Calculate 20% share
  const share = Math.floor(amount * 0.2);
  if (share <= 0) return;

  // 3. Update or create earnings record
  const { data: earning } = await supabase
    .from("referral_earnings")
    .select("id, total_pending, tap_earnings, idle_earnings")
    .eq("inviter_id", referral.inviter_id as any)
    .eq("invitee_id", inviteeId as any)
    .eq("claimed", false)
    .maybeSingle();

  if (earning) {
    await supabase
      .from("referral_earnings")
      .update({
        total_pending: earning.total_pending + share,
        tap_earnings: type === 'tap' ? earning.tap_earnings + share : earning.tap_earnings,
        idle_earnings: type === 'idle' ? earning.idle_earnings + share : earning.idle_earnings,
      } as any)
      .eq("id", earning.id);
  } else {
    await supabase.from("referral_earnings").insert({
      inviter_id: referral.inviter_id,
      invitee_id: inviteeId,
      total_pending: share,
      tap_earnings: type === 'tap' ? share : 0,
      idle_earnings: type === 'idle' ? share : 0,
      claimed: false,
      last_snapshot_tap: 0,
      last_snapshot_idle: 0
    } as any);
  }
}

/**
 * Check if user reached a referral milestone and claim it
 */
export async function checkAndClaimMilestone(userId: number, referralCount: number): Promise<{ milestone?: number, xpReward?: number }> {
  // Placeholder implementation to satisfy types
  // Real implementation would check database for claimed milestones
  return {}; 
}

/**
 * Get list of milestones already claimed by user
 */
export async function getClaimedMilestones(userId: number): Promise<number[]> {
  // Placeholder implementation
  return [];
}