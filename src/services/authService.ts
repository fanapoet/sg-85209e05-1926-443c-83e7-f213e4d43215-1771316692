import { supabase } from "@/integrations/supabase/client";

/**
 * Auth Service for Bunergy Telegram Mini App
 * Handles anonymous authentication tied to Telegram user IDs
 */

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

/**
 * Get the app URL dynamically based on environment
 * Handles Vercel preview deployments and local development
 */
function getAppUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }
  return window.location.origin;
}

/**
 * Generate a unique 8-character referral code
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (I, O, 0, 1)
  let code = "REF";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Sign in or create user with anonymous auth tied to Telegram ID
 * Initializes ALL profile fields on first signup
 */
export async function signInWithTelegram(telegramUser: TelegramUser) {
  try {
    // Step 1: Sign in anonymously
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          telegram_id: telegramUser.id.toString(),
          telegram_username: telegramUser.username || null,
          telegram_first_name: telegramUser.first_name || null,
          telegram_last_name: telegramUser.last_name || null,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("No user returned from auth");

    // Step 2: Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = not found (expected for new users)
      throw fetchError;
    }

    // Step 3: If profile doesn't exist, create it with ALL fields initialized
    if (!existingProfile) {
      const referralCode = generateReferralCode();
      const displayName = telegramUser.username || 
                         telegramUser.first_name || 
                         `User${telegramUser.id.toString().slice(-6)}`;

      const { error: insertError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        telegram_id: telegramUser.id, // Passed as number to match database type
        telegram_username: telegramUser.username || null,
        telegram_first_name: telegramUser.first_name || null,
        telegram_last_name: telegramUser.last_name || null,
        display_name: displayName,
        referral_code: referralCode,
        
        // Initialize all currency & XP fields
        bz_balance: 0,
        bb_balance: 0,
        xp: 0,
        tier: "Bronze",
        
        // Initialize energy system
        current_energy: 1500,
        max_energy: 1500,
        energy_recovery_rate: 0.3,
        last_energy_update: new Date().toISOString(),
        
        // Initialize boosters (all at level 1)
        booster_income_per_tap: 1,
        booster_energy_per_tap: 1,
        booster_energy_capacity: 1,
        booster_recovery_rate: 1,
        
        // Initialize QuickCharge
        quickcharge_uses_remaining: 5,
        quickcharge_last_reset: new Date().toISOString(),
        quickcharge_cooldown_until: null,
        
        // Initialize build/idle system
        last_claim_timestamp: new Date().toISOString(),
        active_build_part_id: null,
        active_build_end_time: null,
        
        // Initialize referral tracking
        referred_by_code: null,
        total_referrals: 0,
        referral_milestone_5_claimed: false,
        referral_milestone_10_claimed: false,
        referral_milestone_25_claimed: false,
        referral_milestone_50_claimed: false,
        
        // Initialize daily rewards
        daily_reward_streak: 0,
        daily_reward_last_claim: null,
        
        // Initialize NFT tracking
        nfts_owned: [],
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      console.log("✅ New user profile created with full initialization:", {
        userId: authData.user.id,
        telegramId: telegramUser.id,
        username: telegramUser.username,
        referralCode,
        displayName,
      });
    } else {
      console.log("✅ Existing user signed in:", {
        userId: authData.user.id,
        telegramId: telegramUser.id,
        referralCode: existingProfile.referral_code,
      });
    }

    return {
      success: true,
      user: authData.user,
      isNewUser: !existingProfile,
    };
  } catch (error) {
    console.error("❌ Telegram sign-in error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { success: true, session: data.session };
  } catch (error) {
    console.error("❌ Get session error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("❌ Sign out error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}