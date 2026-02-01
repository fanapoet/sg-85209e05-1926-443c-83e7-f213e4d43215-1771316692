import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Trophy, Star, Loader2, Users, Gift, TrendingUp, Award, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateProfile,
  getReferralStats,
  claimPendingEarnings,
  checkAndClaimMilestone,
  getClaimedMilestones,
  createReferral,
  claimReferralBonus,
  checkReferralExists,
  findInviterByCode,
  type ReferralStats
} from "@/services/referralService";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  type: "daily" | "weekly" | "milestone";
  target: number;
  current?: number;
  action?: string;
  link?: string;
}

export function TasksReferralsScreen() {
  const { 
    addBZ, 
    addBB, 
    addXP, 
    referralCount, 
    todayTaps, 
    hasClaimedIdleToday, 
    totalUpgrades, 
    totalConversions, 
    totalTaps 
  } = useGameState();
  const { toast } = useToast();
  
  // Track claimed tasks
  const [claimedTasks, setClaimedTasks] = useState<Record<string, number>>({});
  
  // Referral state
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  
  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize user and referral code
  useEffect(() => {
    const loadReferralData = async () => {
      console.log("📊 Loading referral data...");
      setIsLoading(true);
      setErrorMessage("");

      try {
        // Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("Not authenticated. Please restart the app.");
        }
        
        console.log("✅ User authenticated:", user.id);
        setUserId(user.id);

        // Get Profile & Referral Code
        console.log("🔍 Fetching profile...");
        const profile = await getOrCreateProfile(user.id);
        
        if (!profile.referralCode) {
          throw new Error("Failed to load referral code.");
        }
        
        console.log("✅ Profile loaded:", profile);
        setReferralCode(profile.referralCode);
        setReferralLink(`https://t.me/bunergy_bot/BunBun?startapp=${profile.referralCode}`);

        // Get Referral Stats
        console.log("🔍 Fetching stats...");
        const stats = await getReferralStats(user.id);
        setReferralStats(stats);
        console.log("✅ Stats loaded:", stats);
        
        // Get Milestones
        const milestones = await getClaimedMilestones(user.id);
        setClaimedMilestones(milestones);
        console.log("✅ Milestones loaded:", milestones);

        console.log("✨ Referral Data Loaded Successfully!");
      } catch (err: any) {
        console.error("❌ Failed to load referral data:", err);
        setErrorMessage(err.message || "Failed to load referrals. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadReferralData();
  }, []);

  // Handle incoming referral from URL start_param
  const handleIncomingReferral = async (currentUserId: string) => {
    try {
      const alreadyReferred = await checkReferralExists(currentUserId);
      if (alreadyReferred) return;

      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_parameter;
      if (!startParam || !startParam.toLowerCase().startsWith("ref")) return;

      console.log("🔗 Processing referral link:", startParam);
      const inviterCode = startParam.toUpperCase();
      const inviterId = await findInviterByCode(inviterCode);
      
      if (!inviterId) {
        console.warn("⚠️ Invalid inviter code");
        return;
      }

      const result = await createReferral(inviterId, currentUserId, inviterCode);
      if (result.success) {
        const bonusResult = await claimReferralBonus(inviterId, currentUserId);
        if (bonusResult.success && bonusResult.inviteeReward) {
          addBZ(bonusResult.inviteeReward);
          toast({
            title: "Welcome Bonus!",
            description: `You received ${bonusResult.inviteeReward} BZ for joining!`,
          });
        }
      }
    } catch (err) {
      console.error("⚠️ Error processing referral:", err);
    }
  };

  // Load claimed tasks from local storage
  useEffect(() => {
    const saved = localStorage.getItem("bunergy_claimed_tasks");
    if (saved) {
      setClaimedTasks(JSON.parse(saved));
    }
  }, []);

  const isClaimed = (task: Task) => {
    const claimedTime = claimedTasks[task.id];
    if (!claimedTime) return false;

    if (task.type === "daily") {
      const claimedDate = new Date(claimedTime).toDateString();
      const today = new Date().toDateString();
      return claimedDate === today;
    }

    return true;
  };

  const handleClaim = (task: Task) => {
    if (isClaimed(task)) return;

    if (task.reward.type === "BZ") addBZ(task.reward.amount);
    if (task.reward.type === "BB") addBB(task.reward.amount);
    if (task.reward.type === "XP") addXP(task.reward.amount);

    const newClaimed = { ...claimedTasks, [task.id]: Date.now() };
    setClaimedTasks(newClaimed);
    localStorage.setItem("bunergy_claimed_tasks", JSON.stringify(newClaimed));

    toast({
      title: "Reward Claimed!",
      description: `You earned ${task.reward.amount} ${task.reward.type}`,
    });
  };

  const handleClaimPendingEarnings = async () => {
    if (!userId || !referralStats) return;

    try {
      const result = await claimPendingEarnings(userId);
      if (result.success && result.amount > 0) {
        addBZ(result.amount);
        toast({
          title: "Earnings Claimed!",
          description: `You received ${result.amount.toLocaleString()} BZ from referrals!`,
        });
        
        // Refresh stats
        const newStats = await getReferralStats(userId);
        setReferralStats(newStats);
      } else {
        toast({
          title: "No Earnings",
          description: "No pending earnings to claim.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error claiming earnings:", err);
      toast({
        title: "Error",
        description: "Failed to claim earnings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClaimMilestone = async (milestoneCount: number, xpReward: number) => {
    if (!userId || claimedMilestones.includes(milestoneCount)) return;

    try {
      const result = await checkAndClaimMilestone(userId, referralCount);
      if (result.milestone && result.xpReward) {
        addXP(result.xpReward);
        setClaimedMilestones([...claimedMilestones, result.milestone]);
        toast({
          title: "Milestone Reached!",
          description: `You earned ${result.xpReward.toLocaleString()} XP for ${result.milestone} referrals!`,
        });
      }
    } catch (err) {
      console.error("Error claiming milestone:", err);
    }
  };

  const handleCopyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Link Copied!",
        description: "Share this link with friends to earn rewards together!",
      });
    }
  };

  const handleShareTelegram = () => {
    if (referralLink) {
      const shareText = encodeURIComponent(
        "⚡ Join me on Bunergy and let's earn together!\n\n🎮 Tap to earn BZ\n⚡ Build energy empire\n🏆 Level up for rewards\n\nStart now:"
      );
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${shareText}`,
        "_blank"
      );
    }
  };

  const tasks: Task[] = [
    {
      id: "daily_check_in",
      title: "Daily Check-in",
      description: "Log in to the game today",
      reward: { type: "XP", amount: 1000 },
      type: "daily",
      target: 1,
      current: 1
    },
    {
      id: "daily_taps",
      title: "Tap 100 Times",
      description: "Tap the bunny 100 times today",
      reward: { type: "XP", amount: 1000 },
      type: "daily",
      target: 100,
      current: todayTaps
    },
    {
      id: "daily_idle",
      title: "Claim Idle Income",
      description: "Collect income from your build",
      reward: { type: "XP", amount: 1000 },
      type: "daily",
      target: 1,
      current: hasClaimedIdleToday ? 1 : 0
    },
    {
      id: "weekly_upgrade",
      title: "Upgrade 10 Parts",
      description: "Perform 10 upgrades in Build screen",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 10,
      current: totalUpgrades
    },
    {
      id: "weekly_convert",
      title: "Convert 500K BZ",
      description: "Convert BZ to BB tokens",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 500000,
      current: totalConversions
    },
    {
      id: "weekly_invite",
      title: "Invite 3 Friends",
      description: "Get 3 new referrals",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 3,
      current: referralCount
    },
    {
      id: "milestone_taps",
      title: "Master Tapper",
      description: "Reach 10,000 lifetime taps",
      reward: { type: "BB", amount: 1.0 },
      type: "milestone",
      target: 10000,
      current: totalTaps
    },
    {
      id: "milestone_invite",
      title: "Network Master",
      description: "Reach 25 total referrals",
      reward: { type: "BB", amount: 5.0 },
      type: "milestone",
      target: 25,
      current: referralCount
    }
  ];

  const dailyTasks = tasks.filter(t => t.type === "daily");
  const otherTasks = tasks.filter(t => t.type !== "daily");

  // Referral milestones
  const milestones = [
    { count: 5, xp: 3000, claimed: claimedMilestones.includes(5) },
    { count: 10, xp: 8000, claimed: claimedMilestones.includes(10) },
    { count: 25, xp: 25000, claimed: claimedMilestones.includes(25) },
    { count: 50, xp: 50000, claimed: claimedMilestones.includes(50) },
  ];

  const renderTaskCard = (task: Task) => {
    const claimed = isClaimed(task);
    const progress = Math.min(task.current || 0, task.target);
    const progressPercent = (progress / task.target) * 100;
    const isCompleted = progress >= task.target;

    return (
      <Card key={task.id} className="p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              {task.title}
              {claimed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <Badge variant={claimed ? "secondary" : "outline"} className="ml-2">
            +{task.reward.amount} {task.reward.type}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.floor(progress)} / {task.target}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="mt-3 flex justify-end">
          {claimed ? (
            <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Claimed
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="w-full sm:w-auto"
              disabled={!isCompleted}
              onClick={() => handleClaim(task)}
              variant={isCompleted ? "default" : "secondary"}
            >
              {isCompleted ? "Claim Reward" : "In Progress"}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  // Milestone check effect - simplified
  useEffect(() => {
    const checkMilestones = async () => {
      // TODO: Re-implement milestone checking with new service structure
      // For now, we skip this to prevent errors
    };
    
    checkMilestones();
  }, [referralCount]);

  return (
    <div className="pb-24 p-4 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tasks & Referrals</h2>
        <p className="text-muted-foreground">Complete tasks and invite friends to earn rewards</p>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-lg">Daily Tasks</h3>
            </div>
            {dailyTasks.map(renderTaskCard)}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-lg">Challenges & Milestones</h3>
            </div>
            {otherTasks.map(renderTaskCard)}
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4 mt-4">
          {isLoading && !errorMessage && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
              <p className="text-muted-foreground">Loading referral data...</p>
            </div>
          )}

          {errorMessage && (
            <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <p className="font-semibold text-red-700 dark:text-red-300">Connection Error</p>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{errorMessage}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Refresh App
              </Button>
            </Card>
          )}

          {!isLoading && !errorMessage && referralCode && (
            <>
              {/* Referral Stats Overview */}
              <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-lg">Your Referral Stats</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{referralStats?.total_referrals || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Friends</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{(referralStats?.pending_earnings || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Pending BZ</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{referralStats?.total_claimed || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Claimed</p>
                  </div>
                </div>

                {referralStats?.pending_earnings && referralStats.pending_earnings > 0 && (
                  <Button 
                    className="w-full" 
                    onClick={handleClaimPendingEarnings}
                    variant="default"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Claim {referralStats.pending_earnings.toLocaleString()} BZ
                  </Button>
                )}
              </Card>

              {/* Referral Code & Link */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Your Referral Code
                </h3>
                
                <div className="bg-muted p-4 rounded-lg text-center mb-4">
                  <p className="text-3xl font-bold tracking-wider font-mono">{referralCode}</p>
                  <p className="text-xs text-muted-foreground mt-1">Share this code with friends</p>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">Your invite link:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted rounded text-sm border focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleShareTelegram}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share to Telegram
                </Button>
              </Card>

              {/* Rewards Breakdown */}
              <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-lg">Referral Rewards</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">One-Time Signup Bonus</p>
                      <p className="text-xs text-muted-foreground mb-1">When a friend joins using your link</p>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">+2,500 XP</Badge>
                        <Badge variant="outline" className="text-xs">+1,000 BZ</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">20% Lifetime Share</p>
                      <p className="text-xs text-muted-foreground mb-1">Earn 20% of everything your referrals earn from tapping and building</p>
                      <Badge variant="outline" className="text-xs">Passive Income Forever</Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Award className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Milestone Bonuses</p>
                      <p className="text-xs text-muted-foreground mb-2">Extra XP rewards for reaching referral milestones</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Badge variant="outline" className="text-xs">5 refs: +3k XP</Badge>
                        <Badge variant="outline" className="text-xs">10 refs: +8k XP</Badge>
                        <Badge variant="outline" className="text-xs">25 refs: +25k XP</Badge>
                        <Badge variant="outline" className="text-xs">50 refs: +50k XP</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Milestones Progress */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold text-lg">Milestone Progress</h3>
                </div>

                <div className="space-y-3">
                  {milestones.map((milestone) => {
                    const progress = Math.min((referralCount / milestone.count) * 100, 100);
                    const isReached = referralCount >= milestone.count;
                    const canClaim = isReached && !milestone.claimed;

                    return (
                      <div key={milestone.count} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {milestone.claimed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-muted" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{milestone.count} Referrals</p>
                              <p className="text-xs text-muted-foreground">+{milestone.xp.toLocaleString()} XP</p>
                            </div>
                          </div>
                          {canClaim ? (
                            <Button 
                              size="sm" 
                              onClick={() => handleClaimMilestone(milestone.count, milestone.xp)}
                            >
                              Claim
                            </Button>
                          ) : milestone.claimed ? (
                            <Badge variant="secondary" className="text-xs">Claimed</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{referralCount}/{milestone.count}</Badge>
                          )}
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Referral List */}
              {referralStats?.referrals && referralStats.referrals.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Your Referrals ({referralStats.referrals.length})
                  </h3>
                  <div className="space-y-2">
                    {referralStats.referrals.map((ref) => (
                      <div key={ref.invitee_id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">User {ref.invitee_id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(ref.invited_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+{ref.your_share.toLocaleString()} BZ</p>
                          <p className="text-xs text-muted-foreground">Your 20%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}