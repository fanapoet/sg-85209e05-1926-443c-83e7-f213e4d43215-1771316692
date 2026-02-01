import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase
    .from("referrals")
    .select("id")
    .eq("invitee_id", inviteeId)
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
  inviterId: number,
  inviteeId: number
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
 * Get referral statistics for a user (inviter)
 */
export async function getReferralStats(telegramId: number): Promise<ReferralStats> {
  const { data: referrals, error: refError } = await supabase
    .from("referrals")
    .select("invitee_id, invited_at")
    .eq("inviter_id", telegramId)
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
    (referrals || []).map(async (ref) => {
      const { data: earnings } = await supabase
        .from("referral_earnings")
        .select("tap_earnings, idle_earnings, total_pending")
        .eq("inviter_id", telegramId)
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

  const { data: earningsData } = await supabase
    .from("referral_earnings")
    .select("total_pending")
    .eq("inviter_id", telegramId)
    .eq("claimed", false);

  const pending_earnings = earningsData?.reduce((sum, e) => sum + e.total_pending, 0) || 0;

  const { data: claimedData } = await supabase
    .from("referral_earnings")
    .select("last_snapshot_tap, last_snapshot_idle")
    .eq("inviter_id", telegramId)
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
    .eq("inviter_id", telegramId)
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
      })
      .eq("id", earning.id);
  }

  return { success: true, amount: totalAmount };
}