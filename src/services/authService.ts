import { supabase } from "@/integrations/supabase/client";

/**
 * SINGLE SOURCE OF TRUTH for user authentication in Bunergy
 * Uses Telegram ID as the primary identity - NO Supabase Auth needed
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
 * Get Telegram user data from WebApp
 */
function getTelegramUser(): TelegramUser | null {
  if (typeof window === "undefined") return null;
  
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user) {
    console.warn("⚠️ No Telegram user data available");
    return null;
  }
  
  return tg.initDataUnsafe.user;
}

/**
 * Generate a unique referral code from Telegram ID
 */
function generateReferralCode(telegramId: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = telegramId;
  let code = "";
  
  for (let i = 0; i < 8; i++) {
    code += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length);
  }
  
  return code.toUpperCase();
}

/**
 * SINGLE ENTRY POINT for user authentication
 * Creates or retrieves user profile based on Telegram ID
 */
export async function initializeUser() {
  try {
    const tgUser = getTelegramUser();
    
    if (!tgUser) {
      console.error("❌ No Telegram user data - must run in Telegram");
      return {
        success: false,
        error: "No Telegram user data available. Please open this app in Telegram.",
      };
    }

    console.log("🔐 Initializing user for Telegram ID:", tgUser.id);

    // Step 1: Check if user already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Database check error:", checkError);
      return {
        success: false,
        error: `Database error: ${checkError.message}`,
      };
    }

    // Step 2: If user exists, return it
    if (existingProfile) {
      console.log("✅ Existing user found:", existingProfile.telegram_id);
      return {
        success: true,
        profile: existingProfile,
        isNewUser: false,
      };
    }

    // Step 3: Create new user with ALL Telegram data
    console.log("🆕 Creating new user for Telegram ID:", tgUser.id);
    console.log("📝 User data:", {
      id: tgUser.id,
      username: tgUser.username,
      first_name: tgUser.first_name,
      last_name: tgUser.last_name,
    });
    
    const displayName = tgUser.username || tgUser.first_name || `User${tgUser.id}`;
    const referralCode = generateReferralCode(tgUser.id);
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    console.log("🔑 Generated UUID:", newId);
    console.log("🎫 Generated Referral Code:", referralCode);

    const newProfile = {
      id: newId,
      telegram_id: tgUser.id,
      telegram_username: tgUser.username || null,
      telegram_first_name: tgUser.first_name || null,
      telegram_last_name: tgUser.last_name || null,
      display_name: displayName,
      username: tgUser.username || null,
      referral_code: referralCode,
      
      // Starting balances
      bz_balance: 5000,
      bb_balance: 0,
      xp: 0,
      tier: "Bronze",
      
      // Energy system
      current_energy: 1500,
      max_energy: 1500,
      energy_recovery_rate: 0.3,
      last_energy_update: now,
      
      // Boosters
      booster_income_per_tap: 1,
      booster_energy_per_tap: 1,
      booster_energy_capacity: 1,
      booster_recovery_rate: 1,
      
      // QuickCharge
      quickcharge_uses_remaining: 5,
      quickcharge_last_reset: now,
      
      // Build/Idle
      last_claim_timestamp: now,
      
      // Referrals
      total_referrals: 0,
      
      // Taps
      total_taps: 0,
      taps_today: 0,
      
      // Timestamps
      created_at: now,
      updated_at: now,
    };

    console.log("📝 About to insert profile with data:", {
      id: newProfile.id,
      telegram_id: newProfile.telegram_id,
      display_name: newProfile.display_name,
      referral_code: newProfile.referral_code,
    });

    const { data: createdProfile, error: insertError } = await supabase
      .from("profiles")
      .insert(newProfile as any)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Profile creation failed:", insertError);
      console.error("❌ Full error details:", JSON.stringify(insertError, null, 2));
      console.error("❌ Error code:", insertError.code);
      console.error("❌ Error message:", insertError.message);
      console.error("❌ Error hint:", insertError.hint);
      console.error("❌ Error details:", insertError.details);
      return {
        success: false,
        error: `Failed to create profile: ${insertError.message}`,
      };
    }

    console.log("✅ User created successfully!");
    console.log("✅ Profile data:", createdProfile);

    return {
      success: true,
      profile: createdProfile,
      isNewUser: true,
    };
  } catch (error) {
    console.error("❌ Unexpected error in initializeUser:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user profile by Telegram ID
 */
export async function getUserProfile(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegramId)
      .single();

    if (error) {
      console.error("❌ Get profile error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (error) {
    console.error("❌ Get profile error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get current Telegram user (convenience function)
 */
export function getCurrentTelegramUser(): TelegramUser | null {
  return getTelegramUser();
}