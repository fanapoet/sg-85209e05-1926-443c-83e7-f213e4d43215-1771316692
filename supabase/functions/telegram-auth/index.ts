import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Telegram Mini App Authentication Edge Function
 * 
 * Validates Telegram initData and creates/returns Supabase Auth session
 * with telegram_id stored in JWT claims for RLS policies
 */

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  [key: string]: any;
}

/**
 * Validates Telegram Mini App initData cryptographically
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateTelegramData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    
    if (!hash) {
      console.error("❌ No hash in initData");
      return null;
    }

    // Remove hash from params
    urlParams.delete("hash");
    
    // Sort params alphabetically and create data-check-string
    const dataCheckArray: string[] = [];
    for (const [key, value] of Array.from(urlParams.entries()).sort()) {
      dataCheckArray.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArray.join("
");

    // Create secret key: HMAC-SHA256(token, "WebAppData")
    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculate hash: HMAC-SHA256(data-check-string, secret_key)
    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Compare hashes
    if (calculatedHash !== hash) {
      console.error("❌ Hash mismatch - invalid initData");
      return null;
    }

    // Parse user data
    const userParam = urlParams.get("user");
    if (!userParam) {
      console.error("❌ No user data in initData");
      return null;
    }

    const user: TelegramUser = JSON.parse(userParam);
    const authDate = parseInt(urlParams.get("auth_date") || "0");

    // Check if data is not too old (24 hours)
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) {
      console.error("❌ initData too old (>24 hours)");
      return null;
    }

    console.log("✅ Telegram data validated successfully for user:", user.id);
    return {
      user,
      auth_date: authDate,
      hash,
    };
  } catch (error) {
    console.error("❌ Validation error:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN not configured");
    }

    // Parse request body
    const { initData } = await req.json();
    
    if (!initData) {
      return new Response(
        JSON.stringify({ error: "initData is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔐 Validating Telegram initData...");

    // Validate Telegram data
    const validatedData = validateTelegramData(initData, botToken);
    
    if (!validatedData) {
      return new Response(
        JSON.stringify({ error: "Invalid Telegram data" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user } = validatedData;
    const telegramId = user.id;

    // Create Supabase Admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log(`👤 Processing auth for Telegram user: ${telegramId}`);

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, telegram_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile lookup error:", profileError);
      throw profileError;
    }

    let userId: string;

    if (existingProfile) {
      // User exists - use existing profile ID
      userId = existingProfile.id;
      console.log(`✅ Found existing profile: ${userId}`);
    } else {
      // New user - create profile
      console.log("🆕 Creating new profile...");
      
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          telegram_id: telegramId,
          username: user.username,
          full_name: `${user.first_name}${user.last_name ? " " + user.last_name : ""}`,
          is_premium: user.is_premium || false,
          avatar_url: user.photo_url,
          language_code: user.language_code || "en",
        })
        .select("id")
        .single();

      if (createError || !newProfile) {
        console.error("❌ Profile creation error:", createError);
        throw createError || new Error("Failed to create profile");
      }

      userId = newProfile.id;
      console.log(`✅ Created new profile: ${userId}`);
    }

    // Create/get Supabase Auth user with custom claims
    // Use telegram_id as the email to create a unique auth user
    const email = `telegram_${telegramId}@bunbun.app`;
    const password = crypto.randomUUID(); // Random password (user won't need it)

    console.log("🔑 Creating/retrieving Supabase Auth session...");

    // Try to get existing auth user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    let authUserId: string;

    if (existingAuthUser) {
      authUserId = existingAuthUser.id;
      console.log(`✅ Found existing auth user: ${authUserId}`);
    } else {
      // Create new auth user
      const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          username: user.username,
          full_name: `${user.first_name}${user.last_name ? " " + user.last_name : ""}`,
          profile_id: userId,
        },
      });

      if (authError || !newAuthUser.user) {
        console.error("❌ Auth user creation error:", authError);
        throw authError || new Error("Failed to create auth user");
      }

      authUserId = newAuthUser.user.id;
      console.log(`✅ Created new auth user: ${authUserId}`);
    }

    // Generate session token with custom claims
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: "https://bunbun.app", // Not used but required
      },
    });

    if (sessionError || !sessionData) {
      console.error("❌ Session generation error:", sessionError);
      throw sessionError || new Error("Failed to generate session");
    }

    // Create actual session
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !session) {
      console.error("❌ Sign in error:", signInError);
      throw signInError || new Error("Failed to sign in");
    }

    console.log("✅ Authentication successful!");

    // Return session with profile data
    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: session.session?.access_token,
          refresh_token: session.session?.refresh_token,
          expires_at: session.session?.expires_at,
          expires_in: session.session?.expires_in,
        },
        profile: {
          id: userId,
          telegram_id: telegramId,
          username: user.username,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("❌ Edge Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});