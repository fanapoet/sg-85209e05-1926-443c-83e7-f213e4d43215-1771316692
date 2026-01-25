import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy, Users, Star, ArrowRight, Loader2 } from "lucide-react";
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

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initDataUnsafe?: {
          start_parameter?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

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
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize user and referral code
  useEffect(() => {
    const initUser = async () => {
      try {
        setIsInitializing(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Get or create profile with referral code
          const profile = await getOrCreateProfile(user.id);
          setReferralCode(profile.referralCode);
          setReferralLink(`https://t.me/bunergy_bot/app?startapp=${profile.referralCode.toLowerCase()}`);
        }
      } catch (err) {
        console.error("Error initializing user:", err);
        toast({
          title: "Connection Error",
          description: "Failed to load referral data. Please refresh the app.",
          variant: "destructive",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initUser();
  }, [toast]);

  // Load referral stats
  useEffect(() => {
    if (!userId) return;

    const loadReferralData = async () => {
      try {
        const [stats, milestones] = await Promise.all([
          getReferralStats(userId),
          getClaimedMilestones(userId)
        ]);
        setReferralStats(stats);
        setClaimedMilestones(milestones);
      } catch (err) {
        console.error("Error loading referral data:", err);
      }
    };

    loadReferralData();
    const interval = setInterval(loadReferralData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userId]);

  // Handle referral binding from URL
  useEffect(() => {
    if (!userId) return;

    const handleReferralBinding = async () => {
      try {
        // Check if already referred
        const alreadyReferred = await checkReferralExists(userId);
        if (alreadyReferred) return;

        // Get start param from Telegram
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_parameter;
        if (!startParam || !startParam.toLowerCase().startsWith("ref")) return;

        const inviterCode = startParam.toUpperCase();
        
        // Find inviter by code
        const inviterId = await findInviterByCode(inviterCode);
        if (!inviterId) {
          console.log("Invalid referral code");
          return;
        }

        // Create referral relationship
        const result = await createReferral(inviterId, userId, inviterCode);
        
        if (result.success) {
          // Claim one-time bonus for both parties
          const bonusResult = await claimReferralBonus(inviterId, userId);
          
          if (bonusResult.success) {
            // Invitee gets 500 BZ
            if (bonusResult.inviteeReward) {
              addBZ(bonusResult.inviteeReward);
              toast({
                title: "Welcome Bonus!",
                description: `You received ${bonusResult.inviteeReward} BZ for joining!`,
              });
            }
            
            // Inviter will get 1000 BZ + 1000 XP on their next app open
            // (handled in their app session)
          }
        }
      } catch (err) {
        console.error("Error handling referral binding:", err);
      }
    };

    handleReferralBinding();
  }, [userId, addBZ, toast]);

  // Load claimed tasks
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

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleClaimMilestone = async (milestoneCount: number, xpReward: number) => {
    if (!userId || claimedMilestones.includes(milestoneCount)) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const tasks: Task[] = [
    {
      id: "daily_check_in",
      title: "Daily Check-in",
      description: "Log in to the game correctly.",
      reward: { type: "BZ", amount: 500 },
      type: "daily",
      target: 1,
      current: 1
    },
    {
      id: "daily_taps",
      title: "Tap 100 Times",
      description: "Tap the bunny 100 times today.",
      reward: { type: "BZ", amount: 1000 },
      type: "daily",
      target: 100,
      current: todayTaps
    },
    {
      id: "daily_idle",
      title: "Claim Idle Income",
      description: "Collect income from your build.",
      reward: { type: "XP", amount: 500 },
      type: "daily",
      target: 1,
      current: hasClaimedIdleToday ? 1 : 0
    },
    {
      id: "weekly_upgrade",
      title: "Upgrade 10 Parts",
      description: "Perform 10 upgrades in Build screen.",
      reward: { type: "BZ", amount: 5000 },
      type: "weekly",
      target: 10,
      current: totalUpgrades
    },
    {
      id: "weekly_convert",
      title: "Convert 500K BZ",
      description: "Convert BZ to BB tokens.",
      reward: { type: "BB", amount: 0.5 },
      type: "weekly",
      target: 500000,
      current: totalConversions
    },
    {
      id: "weekly_invite",
      title: "Invite 3 Friends",
      description: "Get 3 new referrals.",
      reward: { type: "XP", amount: 500 },
      type: "weekly",
      target: 3,
      current: referralCount
    },
    {
      id: "milestone_taps",
      title: "Master Tapper",
      description: "Reach 10,000 lifetime taps.",
      reward: { type: "BB", amount: 1.0 },
      type: "milestone",
      target: 10000,
      current: totalTaps
    },
    {
      id: "milestone_invite",
      title: "Network Master",
      description: "Reach 25 total referrals.",
      reward: { type: "BB", amount: 5.0 },
      type: "milestone",
      target: 25,
      current: referralCount
    }
  ];

  const dailyTasks = tasks.filter(t => t.type === "daily");
  const otherTasks = tasks.filter(t => t.type !== "daily");

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

  if (isInitializing) {
    return (
      <div className="pb-24 p-4 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 p-4 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Tasks & Referrals</h2>
        <p className="text-muted-foreground">Complete tasks and invite friends to earn rewards.</p>
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

        <TabsContent value="referrals" className="space-y-6 mt-4">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <div className="text-center space-y-4">
              <Users className="h-12 w-12 mx-auto text-blue-500" />
              <div>
                <h3 className="text-xl font-bold">Invite Friends</h3>
                <p className="text-muted-foreground">Share your unique referral code!</p>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 bg-background/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium mb-2">Your Referral Code</p>
                  <code className="text-2xl font-bold bg-muted p-3 rounded block">
                    {referralCode || "Loading..."}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Linked to your Telegram account
                  </p>
                </div>

                <div className="p-3 bg-background/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium mb-1">Direct Link</p>
                  <code className="text-xs bg-muted p-2 rounded block break-all">
                    {referralLink || "Loading..."}
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="font-semibold text-green-700 dark:text-green-400">Friend Gets</p>
                  <p className="text-xl font-bold text-green-600">+500 BZ</p>
                  <p className="text-xs text-muted-foreground">Instant bonus</p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="font-semibold text-purple-700 dark:text-purple-400">You Get</p>
                  <p className="text-xl font-bold text-purple-600">+1,000 BZ</p>
                  <p className="text-xs text-muted-foreground">+ 1,000 XP</p>
                </div>
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">
                  💰 Lifetime Share: 20%
                </p>
                <p className="text-xs text-muted-foreground">
                  Earn 20% of all BZ your referrals generate from tapping and idle income forever!
                </p>
              </div>

              <Button 
                className="w-full gap-2" 
                size="lg" 
                onClick={() => {
                  if (referralLink) {
                    if (window.Telegram?.WebApp) {
                      window.Telegram.WebApp.openTelegramLink(
                        `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me on Bunergy and earn rewards!")}`
                      );
                    }
                    navigator.clipboard.writeText(referralLink);
                    toast({
                      title: "Link Copied!",
                      description: "Share this link with your friends to earn rewards.",
                    });
                  }
                }}
              >
                <ArrowRight className="h-4 w-4" />
                Share Referral Link
              </Button>
            </div>
          </Card>

          {/* Pending Income */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">Pending Referral Income</h3>
                <p className="text-xs text-muted-foreground">20% share from your referrals</p>
              </div>
              <Badge variant="outline" className="text-lg">
                {referralStats ? referralStats.pending_earnings.toLocaleString() : "0"} BZ
              </Badge>
            </div>
            <Button 
              className="w-full" 
              variant="default"
              disabled={loading || !referralStats || referralStats.pending_earnings === 0}
              onClick={handleClaimPendingEarnings}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Claim Pending Income
            </Button>
          </Card>

          {/* Referral Milestones */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Referral Milestones</h3>
            <div className="space-y-3">
              {[
                { count: 5, reward: 5000 },
                { count: 10, reward: 15000 },
                { count: 25, reward: 50000 },
                { count: 50, reward: 150000 }
              ].map((milestone) => {
                const reached = referralCount >= milestone.count;
                const claimed = claimedMilestones.includes(milestone.count);

                return (
                  <div 
                    key={milestone.count}
                    className={`p-3 rounded-lg border-2 ${
                      claimed
                        ? "bg-green-50 dark:bg-green-950 border-green-500" 
                        : reached
                        ? "bg-blue-50 dark:bg-blue-950 border-blue-500"
                        : "bg-muted border-muted-foreground/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {claimed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-semibold">{milestone.count} Referrals</p>
                          <p className="text-xs text-muted-foreground">
                            Reward: {milestone.reward.toLocaleString()} XP
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={reached ? "default" : "outline"}>
                          {referralCount}/{milestone.count}
                        </Badge>
                        {reached && !claimed && (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={loading}
                            onClick={() => handleClaimMilestone(milestone.count, milestone.reward)}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Referral List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Your Referrals ({referralStats?.total_referrals || 0})</h3>
            {!referralStats || referralStats.total_referrals === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No referrals yet.</p>
                <p className="text-sm">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referralStats.referrals.slice(0, 10).map((ref, i) => (
                  <Card key={ref.invitee_id} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {String.fromCharCode(65 + (i % 26))}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          User {ref.invitee_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Earned: {ref.total_earned.toLocaleString()} BZ
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-600">
                        +{ref.your_share.toLocaleString()} BZ
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Your share</p>
                    </div>
                  </Card>
                ))}
                {referralStats.total_referrals > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    And {referralStats.total_referrals - 10} more referrals...
                  </p>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}