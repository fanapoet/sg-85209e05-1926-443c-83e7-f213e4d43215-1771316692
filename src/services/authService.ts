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
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
  
  const user = tg.initDataUnsafe.user;
  console.log("✅ Telegram user detected:", {
    id: user.id,
    first_name: user.first_name,
    username: user.username,
  });
  
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
    language_code: user.language_code,
    photo_url: user.photo_url,
  };
}

/**
 * Sign in or create user with Telegram identity
 * This is the ONLY entry point for authentication
 */
export async function signInWithTelegram(telegramUser?: TelegramUser) {
  try {
    // Get Telegram user if not provided
    const tgUser = telegramUser || getTelegramUser();
    
    if (!tgUser) {
      console.error("❌ No Telegram user data available");
      return {
        success: false,
        error: "Telegram user data not available. Please open this app in Telegram.",
      };
    }

    console.log("🔐 Starting auth for Telegram user:", tgUser.id);

    // Step 1: Check if profile exists by telegram_id
    console.log("🔍 Checking for existing profile with telegram_id:", tgUser.id);
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, telegram_id, display_name, bz_balance, xp")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Error checking profile:", checkError);
    } else {
      console.log("🔍 Profile check result:", existingProfile ? "FOUND" : "NOT FOUND", existingProfile);
    }

    if (existingProfile) {
      // Existing user - just sign in
      console.log("✅ Existing user found:", existingProfile.id);
      
      // Sign in anonymously with metadata linking to telegram_id
      const { data: authData, error: signInError } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            telegram_id: tgUser.id.toString(),
            profile_id: existingProfile.id,
          },
        },
      });

      if (signInError) {
        console.error("❌ Sign in error:", signInError);
        return {
          success: false,
          error: `Sign in failed: ${signInError.message}`,
        };
      }

      console.log("✅ Signed in successfully:", authData.user?.id);

      return {
        success: true,
        user: { id: existingProfile.id },
        isNewUser: false,
      };
    }

    // Step 2: New user - create auth + profile atomically
    console.log("🆕 Creating new user for telegram_id:", tgUser.id);

    // Create anonymous auth session FIRST
    console.log("🔐 Step 1: Creating auth session...");
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          telegram_id: tgUser.id.toString(),
        },
      },
    });

    if (authError) {
      console.error("❌ Auth creation failed:", authError);
      return {
        success: false,
        error: `Auth failed: ${authError.message}`,
      };
    }

    if (!authData.user) {
      console.error("❌ No user returned from auth");
      return {
        success: false,
        error: "No user returned from auth",
      };
    }

    console.log("✅ Auth created:", authData.user.id);

    // Generate display data
    const referralCode = generateReferralCode();
    const displayName = tgUser.username || 
                       tgUser.first_name || 
                       `User${tgUser.id.toString().slice(-6)}`;

    // Step 3: Create profile with ALL required fields
    console.log("📝 Step 2: Creating profile...");
    const profileData = {
      id: authData.user.id,
      telegram_id: tgUser.id,
      telegram_username: tgUser.username || null,
      telegram_first_name: tgUser.first_name || null,
      telegram_last_name: tgUser.last_name || null,
      display_name: displayName,
      username: tgUser.username || null,
      referral_code: referralCode,
      
      // Initialize game state
      bz_balance: 5000,
      bb_balance: 0,
      xp: 0,
      tier: "Bronze",
      
      // Energy system
      current_energy: 1500,
      max_energy: 1500,
      energy_recovery_rate: 0.3,
      last_energy_update: new Date().toISOString(),
      
      // Boosters
      booster_income_per_tap: 1,
      booster_energy_per_tap: 1,
      booster_energy_capacity: 1,
      booster_recovery_rate: 1,
      
      // QuickCharge
      quickcharge_uses_remaining: 5,
      quickcharge_last_reset: new Date().toISOString(),
      
      // Build/Idle
      last_claim_timestamp: new Date().toISOString(),
      
      // Referrals
      total_referrals: 0,
      
      // Taps
      total_taps: 0,
      taps_today: 0,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("📝 Profile data to insert:", {
      id: profileData.id,
      telegram_id: profileData.telegram_id,
      display_name: profileData.display_name,
      referral_code: profileData.referral_code,
    });

    const { data: insertedProfile, error: profileError } = await supabase
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("❌ Profile creation failed:", profileError);
      console.error("❌ Full error details:", JSON.stringify(profileError, null, 2));
      
      // Try to clean up auth user if profile creation failed
      console.log("🧹 Cleaning up auth session...");
      await supabase.auth.signOut();
      
      return {
        success: false,
        error: `Profile creation failed: ${profileError.message}`,
      };
    }

    console.log("✅ Profile created successfully:", insertedProfile);
    console.log("✅ Full user setup complete!", {
      user_id: authData.user.id,
      telegram_id: tgUser.id,
      display_name: displayName,
      referral_code: referralCode,
    });

    return {
      success: true,
      user: authData.user,
      profile: insertedProfile,
      isNewUser: true,
    };
  } catch (error) {
    console.error("❌ Unexpected auth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown auth error",
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

/**
 * Get user profile by telegram_id
 */
export async function getProfileByTelegramId(telegramId: number) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (error) {
    console.error("❌ Get profile by telegram_id error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}