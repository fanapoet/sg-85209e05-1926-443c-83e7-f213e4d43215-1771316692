import { supabase } from "@/integrations/supabase/client";

/**
 * Telegram Authentication Service
 * 
 * Handles authentication flow with Telegram Mini App
 * Calls the telegram-auth Edge Function to validate initData
 * and establish Supabase Auth session
 */

export interface TelegramAuthResult {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    expires_in: number;
  };
  profile?: {
    id: string;
    telegram_id: number;
    username?: string;
  };
  error?: string;
}

/**
 * Authenticates user with Telegram Mini App initData
 * Creates/retrieves Supabase Auth session with telegram_id in JWT
 */
export async function authenticateWithTelegram(): Promise<TelegramAuthResult> {
  try {
    // Get Telegram WebApp instance
    const tg = window.Telegram?.WebApp;
    
    if (!tg) {
      console.error("❌ Telegram WebApp not available");
      return {
        success: false,
        error: "Telegram WebApp not available - app must run inside Telegram",
      };
    }

    // Get initData (cryptographically signed by Telegram)
    const initData = tg.initData;
    
    if (!initData) {
      console.error("❌ No initData available");
      return {
        success: false,
        error: "No Telegram initData available",
      };
    }

    console.log("🔐 Calling telegram-auth Edge Function...");

    // Call Edge Function to validate and create session
    const { data, error } = await supabase.functions.invoke("telegram-auth", {
      body: { initData },
    });

    if (error) {
      console.error("❌ Edge Function error:", error);
      return {
        success: false,
        error: error.message || "Authentication failed",
      };
    }

    if (!data?.success || !data?.session) {
      console.error("❌ Invalid response from Edge Function:", data);
      return {
        success: false,
        error: data?.error || "Invalid authentication response",
      };
    }

    console.log("✅ Authentication successful!");
    console.log("👤 Profile:", data.profile);

    // Set session in Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      console.error("❌ Failed to set session:", sessionError);
      return {
        success: false,
        error: "Failed to establish session",
      };
    }

    console.log("✅ Supabase session established!");

    return {
      success: true,
      session: data.session,
      profile: data.profile,
    };
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Checks if user has active Supabase Auth session
 */
export async function checkAuthSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error("❌ Session check error:", error);
    return false;
  }
}

/**
 * Gets current user's telegram_id from JWT claims
 */
export async function getTelegramIdFromSession(): Promise<number | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }

    // Extract telegram_id from JWT claims
    const telegramId = session.user?.user_metadata?.telegram_id;
    
    return telegramId ? parseInt(telegramId) : null;
  } catch (error) {
    console.error("❌ Failed to get telegram_id from session:", error);
    return null;
  }
}

/**
 * Signs out user (clears Supabase session)
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
    console.log("✅ Signed out successfully");
  } catch (error) {
    console.error("❌ Sign out error:", error);
  }
}