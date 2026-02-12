import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Trophy, Star, Loader2, Users, Gift, TrendingUp, Award, Copy, Share2, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getReferralStats,
  claimPendingEarnings,
  checkAndClaimMilestone,
  getClaimedMilestones,
  type ReferralStats
} from "@/services/referralService";
import { getCurrentTelegramUser } from "@/services/authService";
import type React from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  type: "daily" | "weekly" | "progressive";
  target: number;
  current?: number;
  completed?: boolean;
  claimed?: boolean;
  icon?: React.ReactNode;
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
    totalTaps,
    performTaskClaim,
    currentWeeklyPeriodStart,
    lastWeeklyResetDate,
    lastDailyResetDate,
    resetWeeklyTasks,
    resetDailyTasks,
    telegramId,
    userId: authUserId
  } = useGameState();
  const { toast } = useToast();
  
  // State
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Referral state
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [referralErrorMessage, setReferralErrorMessage] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);

  // Default Task Definitions
  const defaultDailyTasks: Task[] = [
    {
      id: "daily_check_in",
      title: "Daily Check-in",
      description: "Log in to the game today",
      reward: { type: "XP", amount: 1000 },
      type: "daily",
      target: 1,
      current: 0,
      completed: false,
      claimed: false
    },
    {
      id: "daily_tap_100",
      title: "Tap 100 Times",
      description: "Tap the bunny 100 times in a day",
      type: "daily",
      target: 100,
      reward: { type: "BZ", amount: 5000 },
      current: 0,
      completed: false,
      claimed: false,
      icon: <Target className="w-5 h-5" />
    },
    {
      id: "daily_idle",
      title: "Claim Idle Income",
      description: "Collect income from your build",
      reward: { type: "XP", amount: 1000 },
      type: "daily",
      target: 1,
      current: 0,
      completed: false,
      claimed: false
    }
  ];

  const defaultWeeklyTasks: Task[] = [
    {
      id: "weekly_upgrade",
      title: "Upgrade 10 Parts",
      description: "Perform 10 upgrades in Build screen",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 10,
      current: 0,
      completed: false,
      claimed: false
    },
    {
      id: "weekly_convert",
      title: "Convert 500K BZ",
      description: "Convert BZ to BB tokens",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 500000,
      current: 0,
      completed: false,
      claimed: false
    },
    {
      id: "weekly_invite",
      title: "Invite 3 Friends",
      description: "Get 3 new referrals",
      reward: { type: "XP", amount: 2000 },
      type: "weekly",
      target: 3,
      current: 0,
      completed: false,
      claimed: false
    }
  ];

  const progressiveTasks: Task[] = [
    {
      id: "milestone_taps",
      title: "Master Tapper",
      description: "Reach 10,000 lifetime taps",
      reward: { type: "BB", amount: 1.0 },
      type: "progressive",
      target: 10000,
      current: totalTaps
    },
    {
      id: "milestone_invite",
      title: "Network Master",
      description: "Reach 25 total referrals",
      reward: { type: "BB", amount: 5.0 },
      type: "progressive",
      target: 25,
      current: referralCount
    }
  ];

  // Initialization Effect (Loads from LS and sets loading=false)
  useEffect(() => {
    console.log("🎬 [Tasks-Init] Initializing Tasks screen...");
    
    // Load daily tasks
    try {
      const savedDaily = localStorage.getItem("dailyTasks");
      if (savedDaily) {
        console.log("📂 [Tasks-Init] Loading daily tasks from localStorage");
        setDailyTasks(JSON.parse(savedDaily));
      } else {
        setDailyTasks(defaultDailyTasks);
      }
    } catch (e) {
      console.error("❌ Failed to load daily tasks", e);
      setDailyTasks(defaultDailyTasks);
    }

    // Load weekly tasks
    try {
      const savedWeekly = localStorage.getItem("weeklyTasks");
      if (savedWeekly) {
        console.log("📂 [Tasks-Init] Loading weekly tasks from localStorage");
        setWeeklyTasks(JSON.parse(savedWeekly));
      } else {
        setWeeklyTasks(defaultWeeklyTasks);
      }
    } catch (e) {
      console.error("❌ Failed to load weekly tasks", e);
      setWeeklyTasks(defaultWeeklyTasks);
    }

    // Load Referral Data
    const loadReferralData = async () => {
      try {
        const tgUser = getCurrentTelegramUser();
        if (tgUser) {
          setUserId(tgUser.id);
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let hash = tgUser.id;
          let code = "";
          for (let i = 0; i < 8; i++) {
            code += chars[hash % chars.length];
            hash = Math.floor(hash / chars.length);
          }
          setReferralCode(code);
          setReferralLink(`https://t.me/bunergy_bot/BunBun?startapp=${code}`);

          const stats = await getReferralStats(tgUser.id);
          setReferralStats(stats);
          
          const milestones = await getClaimedMilestones(tgUser.id);
          setClaimedMilestones(milestones);
        }
      } catch (err: any) {
        console.error("❌ Failed to load referral data:", err);
        setReferralErrorMessage(err.message || "Failed to load referrals.");
      }
    };
    loadReferralData();

    // Mark initialization complete
    setLoading(false);
    console.log("✅ [Tasks-Init] Initialization complete, loading set to false");
  }, []);

  // Persistence Effects
  useEffect(() => {
    if (!loading && dailyTasks.length > 0) {
      localStorage.setItem("dailyTasks", JSON.stringify(dailyTasks));
    }
  }, [dailyTasks, loading]);

  useEffect(() => {
    if (!loading && weeklyTasks.length > 0) {
      localStorage.setItem("weeklyTasks", JSON.stringify(weeklyTasks));
    }
  }, [weeklyTasks, loading]);

  // Update task progress based on context values
  useEffect(() => {
    if (loading) return;
    
    console.log("🔄 [Tasks-Progress] Updating task progress...");
    console.log("🔄 [Tasks-Progress] Context values:", { todayTaps, totalUpgrades, totalConversions, referralCount });
    console.log("🔄 [Tasks-Progress] 🎯 todayTaps value:", todayTaps, "type:", typeof todayTaps);
    
    // Update Daily Tasks
    setDailyTasks(prev => prev.map(task => {
      if (task.claimed) return task;
      
      let newCurrent = task.current || 0;
      if (task.id === "daily_check_in") newCurrent = 1;
      if (task.id === "daily_tap_100") {
        newCurrent = todayTaps;
        console.log("🔄 [Tasks-Progress] 🎯 daily_tap_100 UPDATE:", { 
          oldCurrent: task.current, 
          newCurrent, 
          todayTaps, 
          target: task.target,
          willBeCompleted: newCurrent >= task.target
        });
      }
      if (task.id === "daily_idle") newCurrent = hasClaimedIdleToday ? 1 : 0;
      
      const isCompleted = newCurrent >= task.target;
      return { ...task, current: newCurrent, completed: isCompleted };
    }));
    
    // Update Weekly Tasks
    setWeeklyTasks(prev => prev.map(task => {
      if (task.claimed) return task;
      
      let newCurrent = task.current || 0;
      if (task.id === "weekly_upgrade") newCurrent = totalUpgrades;
      if (task.id === "weekly_convert") newCurrent = totalConversions;
      if (task.id === "weekly_invite") newCurrent = referralCount;
      
      const isCompleted = newCurrent >= task.target;
      return { ...task, current: newCurrent, completed: isCompleted };
    }));
  }, [todayTaps, hasClaimedIdleToday, totalUpgrades, totalConversions, referralCount, loading]);

  // Check for daily reset
  useEffect(() => {
    // Whenever the reset date changes in context (meaning a reset happened),
    // or on mount, reload the tasks from localStorage to ensure UI is up to date.
    if (!loading) {
      console.log("🔄 [Tasks-UI] Reloading tasks due to reset date update or mount");
      try {
        const savedDaily = localStorage.getItem("dailyTasks");
        if (savedDaily) {
          setDailyTasks(JSON.parse(savedDaily));
        } else {
          setDailyTasks(defaultDailyTasks);
        }
      } catch (e) {
        console.error("❌ Failed to load daily tasks", e);
        setDailyTasks(defaultDailyTasks);
      }

      try {
        const savedWeekly = localStorage.getItem("weeklyTasks");
        if (savedWeekly) {
          setWeeklyTasks(JSON.parse(savedWeekly));
        } else {
          setWeeklyTasks(defaultWeeklyTasks);
        }
      } catch (e) {
        console.error("❌ Failed to load weekly tasks", e);
        setWeeklyTasks(defaultWeeklyTasks);
      }
    }
  }, [lastDailyResetDate, loading]);

  // Weekly Reset Check
  useEffect(() => {
    console.log("🔍 [Tasks-Weekly] Weekly reset check triggered");
    console.log("🔍 [Tasks-Weekly] loading:", loading);
    console.log("🔍 [Tasks-Weekly] lastWeeklyResetDate:", lastWeeklyResetDate);
    
    if (!loading && lastWeeklyResetDate) {
      const now = new Date();
      const resetDate = new Date(lastWeeklyResetDate);
      const diffTime = Math.abs(now.getTime() - resetDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      console.log("📅 [Tasks-Weekly] Current time:", now.toISOString());
      console.log("📅 [Tasks-Weekly] Reset date:", resetDate.toISOString());
      console.log("📅 [Tasks-Weekly] Days passed:", diffDays);

      if (diffDays >= 7) {
        console.log("🔄 [Tasks-Weekly] 7+ days passed! Resetting weekly tasks...");
        
        // Reset weekly task states
        setWeeklyTasks(prev => prev.map(task => ({
          ...task,
          completed: false,
          claimed: false,
          current: 0
        })));
        
        // Update database
        resetWeeklyTasks();
      }
    } else if (!loading && !lastWeeklyResetDate) {
      console.log("⚠️ [Tasks-Weekly] Missing lastWeeklyResetDate - initializing");
      resetWeeklyTasks();
    }
  }, [lastWeeklyResetDate, loading, resetWeeklyTasks]);

  const handleClaim = async (task: Task, taskListType: "daily" | "weekly") => {
    if (task.claimed) return;

    try {
      await performTaskClaim(task.id, task.type, task.reward.type, task.reward.amount);
      
      toast({
        title: "Reward Claimed!",
        description: `You earned ${task.reward.amount} ${task.reward.type}`,
      });
      
      // Update local state
      if (taskListType === "daily") {
        setDailyTasks(prev => prev.map(t => t.id === task.id ? { ...t, claimed: true } : t));
      } else {
        setWeeklyTasks(prev => prev.map(t => t.id === task.id ? { ...t, claimed: true } : t));
      }
    } catch (err) {
      console.error("Error claiming reward:", err);
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    }
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

  const renderTaskCard = (task: Task, listType: "daily" | "weekly" | "progressive") => {
    const isCompleted = task.completed || (task.current !== undefined && task.current >= task.target);
    const isClaimed = task.claimed;
    const currentProgress = task.current || 0;
    
    const progressValue = Math.min(currentProgress, task.target);
    const progressPercent = (progressValue / task.target) * 100;

    // For progressive tasks, check context/derived state
    let canClaim = false;
    let buttonText = "In Progress";
    let buttonAction = () => {};
    const isClaimedMilestone = false;

    if (listType === "progressive") {
        // Find corresponding milestone logic
        if (task.id === "milestone_taps") {
             // Not implemented fully in generic way for progressive, simplified for now
             // Progressive tasks are display-only here or need special handling
             // Let's rely on standard milestones section for referrals
        }
    } else {
        canClaim = !!isCompleted && !isClaimed;
        buttonText = isCompleted ? "Claim Reward" : "In Progress";
        buttonAction = () => handleClaim(task, listType as "daily" | "weekly");
    }

    if (listType === "progressive") {
        // Skip rendering generic card for progressive tasks if they duplicate the Milestones section logic
        // But the user requested progressive tasks tab?
        // Let's render them as simple progress cards
    }

    return (
      <Card key={task.id} className="p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              {task.title}
              {isClaimed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <Badge variant={isClaimed ? "secondary" : "outline"} className="ml-2">
            +{task.reward.amount} {task.reward.type}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.floor(progressValue)} / {task.target}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {listType !== "progressive" && (
            <div className="mt-3 flex justify-end">
            {isClaimed ? (
                <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto text-green-600">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Claimed
                </Button>
            ) : (
                <Button 
                size="sm" 
                className="w-full sm:w-auto"
                disabled={!isCompleted}
                onClick={buttonAction}
                variant={isCompleted ? "default" : "secondary"}
                >
                {buttonText}
                </Button>
            )}
            </div>
        )}
      </Card>
    );
  };

  const milestones = [
    { count: 5, xp: 5000, claimed: claimedMilestones.includes(5) },
    { count: 10, xp: 15000, claimed: claimedMilestones.includes(10) },
    { count: 25, xp: 50000, claimed: claimedMilestones.includes(25) },
    { count: 50, xp: 150000, claimed: claimedMilestones.includes(50) },
  ];

  if (loading) {
    return (
      <div className="pb-24 p-4 max-w-2xl mx-auto flex justify-center items-center min-h-[300px]">
        <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
            <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

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
            {dailyTasks.map(task => renderTaskCard(task, "daily"))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-lg">Weekly Tasks</h3>
            </div>
            {weeklyTasks.map(task => renderTaskCard(task, "weekly"))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-lg">Challenges & Milestones</h3>
            </div>
            {progressiveTasks.map(task => renderTaskCard(task, "progressive"))}
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4 mt-4">
          {referralErrorMessage && (
            <Card className="p-4 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <p className="font-semibold text-red-700 dark:text-red-300">Connection Error</p>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{referralErrorMessage}</p>
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

          {!referralErrorMessage && referralCode && (
            <>
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
                      <p className="text-xs text-muted-foreground mb-1">Earn 20% of all Tap + Idle earnings your referrals generate from the moment they join</p>
                      <Badge variant="outline" className="text-xs">Passive Income Forever</Badge>
                      <p className="text-xs text-muted-foreground mt-2 italic">Claim resets the baseline to prevent double counting</p>
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
                        <Badge variant="outline" className="text-xs">5 refs: +5k XP</Badge>
                        <Badge variant="outline" className="text-xs">10 refs: +15k XP</Badge>
                        <Badge variant="outline" className="text-xs">25 refs: +50k XP</Badge>
                        <Badge variant="outline" className="text-xs">50 refs: +150k XP</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

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
                          <p className="font-medium text-sm">User {String(ref.invitee_id).slice(0, 8)}...</p>
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