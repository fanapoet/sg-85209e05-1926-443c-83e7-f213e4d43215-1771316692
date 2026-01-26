import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Gift, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGameState } from "@/contexts/GameStateContext";

interface WelcomeData {
  userId: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  referralCode: string;
  isNewUser: boolean;
  inviterUsername?: string;
  inviterBonus?: { bz: number; xp: number };
  inviteeBonus?: number;
  totalReferrals: number;
}

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { addBZ, addXP } = useGameState();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    initializeUser();
  }, [retryCount]);

  const initializeUser = async () => {
    console.log("🚀 Welcome Screen: Starting initialization...");
    setStatus("loading");
    setErrorMessage("");

    try {
      // Step 1: Get Telegram user data
      const telegramUser = getTelegramUser();
      if (!telegramUser) {
        throw new Error("Could not get your Telegram identity. Please reopen the app from Telegram.");
      }

      console.log("✅ Telegram user detected:", telegramUser);

      // Step 2: Check if user exists in Supabase auth
      let userId: string | null = null;
      const { data: { user: existingAuthUser } } = await supabase.auth.getUser();

      if (existingAuthUser) {
        userId = existingAuthUser.id;
        console.log("✅ Existing auth user found:", userId);
      } else {
        // Create anonymous user
        console.log("🆕 Creating new anonymous user...");
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              telegram_id: telegramUser.id,
              username: telegramUser.username,
              first_name: telegramUser.first_name,
              last_name: telegramUser.last_name,
            },
          },
        });

        if (authError || !authData.user) {
          throw new Error(`Failed to create account: ${authError?.message || "Unknown error"}`);
        }

        userId = authData.user.id;
        console.log("✅ New auth user created:", userId);

        // Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 3: Get or create profile
      console.log("🔍 Checking profile...");
      let profile = await getProfile(userId);
      
      if (!profile) {
        console.log("🆕 Creating profile...");
        profile = await createProfile(userId, telegramUser.id);
      }

      if (!profile || !profile.referral_code) {
        throw new Error("Failed to create your profile. Please try again.");
      }

      console.log("✅ Profile ready:", profile);

      // Step 4: Check for incoming referral
      const referralInfo = await handleIncomingReferral(userId, telegramUser.id);

      // Step 5: Get referral stats
      const { data: referrals } = await supabase
        .from("referrals")
        .select("id")
        .eq("inviter_id", userId);

      const totalReferrals = referrals?.length || 0;

      // Step 6: Prepare welcome data
      const welcomeData: WelcomeData = {
        userId,
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        referralCode: profile.referral_code,
        isNewUser: !existingAuthUser,
        inviterUsername: referralInfo?.inviterUsername,
        inviterBonus: referralInfo?.inviterBonus,
        inviteeBonus: referralInfo?.inviteeBonus,
        totalReferrals,
      };

      console.log("✨ Welcome data ready:", welcomeData);
      setWelcomeData(welcomeData);
      setStatus("ready");

    } catch (err: any) {
      console.error("❌ Initialization failed:", err);
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  const getTelegramUser = () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initDataUnsafe?.user) return null;
    return tg.initDataUnsafe.user;
  };

  const getProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("referral_code, telegram_id")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
    }

    return data;
  };

  const createProfile = async (userId: string, telegramId: number) => {
    // Generate referral code
    const referralCode = generateReferralCode(userId);

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        telegram_id: telegramId,
        referral_code: referralCode,
      })
      .select("referral_code, telegram_id")
      .single();

    if (error) {
      console.error("Error creating profile:", error);
      throw new Error("Failed to create profile");
    }

    return data;
  };

  const generateReferralCode = (userId: string): string => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
    return `REF${code}`;
  };

  const handleIncomingReferral = async (userId: string, telegramId: number) => {
    try {
      // Check if already referred
      const { data: existingRef } = await supabase
        .from("referrals")
        .select("id")
        .eq("invitee_id", userId)
        .single();

      if (existingRef) return null;

      // Get start parameter
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_parameter;
      if (!startParam || !startParam.toLowerCase().startsWith("ref")) return null;

      const inviterCode = startParam.toUpperCase();
      console.log("🔗 Processing referral code:", inviterCode);

      // Find inviter
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("id, telegram_id")
        .eq("referral_code", inviterCode)
        .single();

      if (!inviterProfile || inviterProfile.id === userId) return null;

      console.log("✅ Valid inviter found:", inviterProfile.id);

      // Create referral relationship
      const { error: refError } = await supabase
        .from("referrals")
        .insert({
          inviter_id: inviterProfile.id,
          invitee_id: userId,
          referral_code: inviterCode,
          bonus_claimed: false,
        });

      if (refError) {
        console.error("Error creating referral:", refError);
        return null;
      }

      // Create earnings tracking
      await supabase
        .from("referral_earnings")
        .insert({
          inviter_id: inviterProfile.id,
          invitee_id: userId,
          tap_earnings: 0,
          idle_earnings: 0,
          total_pending: 0,
          last_snapshot_tap: 0,
          last_snapshot_idle: 0,
          claimed: false,
        });

      console.log("✅ Referral relationship created");

      return {
        inviterUsername: `User ${inviterProfile.telegram_id || "Unknown"}`,
        inviterBonus: { bz: 1000, xp: 1000 },
        inviteeBonus: 500,
      };

    } catch (err) {
      console.error("⚠️ Error processing referral:", err);
      return null;
    }
  };

  const handleStartPlaying = () => {
    // Apply bonuses
    if (welcomeData?.inviteeBonus) {
      addBZ(welcomeData.inviteeBonus);
    }

    console.log("🎮 Starting game...");
    onComplete();
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Loading State
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/5 to-background">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <Sparkles className="h-8 w-8 text-yellow-500 absolute top-0 right-0 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Bunergy!</h2>
            <p className="text-muted-foreground">Setting up your account...</p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Connecting to Telegram</p>
            <p>✓ Creating your profile</p>
            <p>✓ Generating referral code</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error State
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-500/5 to-background">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </div>
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full" size="lg">
              Retry Connection
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => window.location.reload()}
            >
              Refresh App
            </Button>
          </div>
          {retryCount > 2 && (
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
              <p className="font-semibold mb-1">Still having issues?</p>
              <p>Make sure you&apos;re opening this app from Telegram and have a stable internet connection.</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Ready State - Welcome Screen
  if (status === "ready" && welcomeData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-primary/10 via-purple-500/5 to-background">
        <Card className="w-full max-w-md p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-4xl">
                🐰
              </div>
            </div>
            <h1 className="text-3xl font-bold">Welcome to Bunergy!</h1>
            <p className="text-muted-foreground">
              {welcomeData.isNewUser ? "Let's get you started!" : "Welcome back!"}
            </p>
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Your Identity</p>
                  <p className="font-semibold">
                    {welcomeData.firstName || welcomeData.username || `User ${welcomeData.telegramId}`}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Referral Code</p>
                  <p className="font-mono font-bold text-lg">{welcomeData.referralCode}</p>
                </div>
              </div>
            </Card>

            {welcomeData.totalReferrals > 0 && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Your Referrals</p>
                    <p className="font-bold text-lg">{welcomeData.totalReferrals} Friends Invited</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Bonuses */}
          {welcomeData.inviteeBonus && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Gift className="h-4 w-4" />
                <span>Welcome Bonus!</span>
              </div>
              <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <div className="space-y-2">
                  {welcomeData.inviterUsername && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Invited by:</span>{" "}
                      <span className="font-semibold">{welcomeData.inviterUsername}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      +{welcomeData.inviteeBonus} BZ
                    </Badge>
                    <span className="text-sm text-muted-foreground">Welcome Gift</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Start Button */}
          <Button 
            onClick={handleStartPlaying} 
            size="lg" 
            className="w-full text-lg h-14"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {welcomeData.isNewUser ? "Start Playing!" : "Continue Playing!"}
          </Button>

          {/* Footer Info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Tap, Build, Earn, and Compete!</p>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}