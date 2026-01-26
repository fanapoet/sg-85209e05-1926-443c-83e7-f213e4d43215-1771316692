import { supabase } from "@/integrations/supabase/client";

/**
 * Get Telegram user data from WebApp
 */
export function getTelegramUser() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.initDataUnsafe?.user) {
    return null;
  }
  return tg.initDataUnsafe.user;
}

/**
 * Check if user is in Telegram environment
 */
export function isInTelegram(): boolean {
  return !!(window.Telegram?.WebApp?.initData);
}

/**
 * Authenticate using Telegram ID (Anonymous Auth + Metadata)
 * Uses anonymous authentication with Telegram metadata
 * This is the main entry point for Telegram Mini App authentication
 */
export async function authenticateWithTelegram() {
  console.log("🔐 Starting Telegram authentication...");

  // 1. Check if in Telegram
  if (!isInTelegram()) {
    throw new Error("NOT_IN_TELEGRAM");
  }

  // 2. Get Telegram user data
  const telegramUser = getTelegramUser();
  if (!telegramUser) {
    throw new Error("NO_TELEGRAM_USER");
  }

  console.log("✅ Telegram user detected:", {
    id: telegramUser.id,
    username: telegramUser.username,
    first_name: telegramUser.first_name,
  });

  // 3. Check if already authenticated with Supabase
  const { data: { user: existingUser } } = await supabase.auth.getUser();
  
  if (existingUser) {
    console.log("✅ Already authenticated with Supabase:", existingUser.id);
    return existingUser;
  }

  // 4. Try to find existing user by Telegram ID in profiles
  console.log("🔍 Searching for existing account by Telegram ID...");
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .single();

  if (existingProfile) {
    console.log("✅ Found existing account, signing in...");
    // User exists but not authenticated - use anonymous auth and link
    const { data: authData, error: anonError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
        },
      },
    });

    if (anonError || !authData.user) {
      console.error("❌ Failed to sign in:", anonError);
      throw new Error(`AUTH_FAILED: ${anonError?.message || "Unknown error"}`);
    }

    console.log("✅ Signed in successfully:", authData.user.id);
    return authData.user;
  }

  // 5. Create new anonymous user
  console.log("🆕 Creating new anonymous user...");
  
  const { data: authData, error: signUpError } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
      },
    },
  });

  if (signUpError || !authData.user) {
    console.error("❌ Failed to create account:", signUpError);
    throw new Error(`AUTH_FAILED: ${signUpError?.message || "Unknown error"}`);
  }

  console.log("✅ New account created:", authData.user.id);
  console.log("🎉 Authentication successful:", authData.user.id);
  return authData.user;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }
  return user;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}