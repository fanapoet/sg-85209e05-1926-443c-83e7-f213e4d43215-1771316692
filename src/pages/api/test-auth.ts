import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    console.log("🔍 Testing Supabase connection...");
    console.log("URL:", supabaseUrl);
    console.log("Key (first 20 chars):", supabaseKey?.substring(0, 20) + "...");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test anonymous sign-in
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("❌ Auth error:", error);
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error,
      });
    }

    console.log("✅ Anonymous auth successful:", data.user?.id);

    return res.status(200).json({
      success: true,
      user: {
        id: data.user?.id,
        isAnonymous: data.user?.is_anonymous,
        createdAt: data.user?.created_at,
      },
      message: "Anonymous authentication is working!",
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Unknown error",
      stack: err.stack,
    });
  }
}