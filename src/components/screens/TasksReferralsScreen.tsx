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
import {
  initializeTask,
  getTaskProgress,
  updateTaskProgress,
  claimTaskReward,
  type TaskProgressData
} from "@/services/tasksService";
import type React from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  type: "daily" | "weekly" | "progressive";
  target: number;
  current: number;
  completed: boolean;
  claimed: boolean;
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
    lastDailyReset,
    telegramId,
  } = useGameState();
  const { toast } = useToast();
  
  // State
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Referral state
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [claimedMilestones, setClaimedMilestones] = useState<number[]>([]);
  const [referralErrorMessage, setReferralErrorMessage] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);

  // Task Definitions with IDs
  const taskDefinitions = {
    daily: [
      {
        id: "daily_check_in",
        title: "Daily Check-in",
        description: "Log in to the game today",
        reward: { type: "XP" as const, amount: 1000 },
        type: "daily" as const,
        target: 1,
        icon: <Star className="w-5 h-5" />
      },
      {
        id: "daily_tap_100",
        title: "Tap 100 Times",
        description: "Tap the bunny 100 times in a day",
        type: "daily" as const,
        target: 100,
        reward: { type: "BZ" as const, amount: 5000 },
        icon: <Target className="w-5 h-5" />
      },
      {
        id: "daily_idle",
        title: "Claim Idle Income",
        description: "Collect income from your build",
        reward: { type: "XP" as const, amount: 1000 },
        type: "daily" as const,
        target: 1,
        icon: <Gift className="w-5 h-5" />
      }
    ],
    weekly: [
      {
        id: "weekly_upgrade",
        title: "Upgrade 10 Parts",
        description: "Perform 10 upgrades in Build screen",
        reward: { type: "XP" as const, amount: 2000 },
        type: "weekly" as const,
        target: 10,
        icon: <TrendingUp className="w-5 h-5" />
      },
      {
        id: "weekly_convert",
        title: "Convert 500K BZ",
        description: "Convert BZ to BB tokens",
        reward: { type: "XP" as const, amount: 2000 },
        type: "weekly" as const,
        target: 500000,
        icon: <Trophy className="w-5 h-5" />
      },
      {
        id: "weekly_invite",
        title: "Invite 3 Friends",
        description: "Get 3 new referrals",
        reward: { type: "XP" as const, amount: 2000 },
        type: "weekly" as const,
        target: 3,
        icon: <Users className="w-5 h-5" />
      }
    ],
    progressive: [
      {
        id: "milestone_taps",
        title: "Master Tapper",
        description: "Reach 10,000 lifetime taps",
        reward: { type: "BB" as const, amount: 1.0 },
        type: "progressive" as const,
        target: 10000,
        icon: <Award className="w-5 h-5" />
      },
      {
        id: "milestone_invite",
        title: "Network Master",
        description: "Reach 25 total referrals",
        reward: { type: "BB" as const, amount: 5.0 },
        type: "progressive" as const,
        target: 25,
        icon: <Users className="w-5 h-5" />
      }
    ]
  };

  // Initialize tasks on first load
  useEffect(() => {
    if (initialized) return;
    
    console.log("🎬 [Tasks-Init] Initializing tasks...");
    
    // Initialize all tasks in tasksService
    [...taskDefinitions.daily, ...taskDefinitions.weekly, ...taskDefinitions.progressive].forEach(def => {
      initializeTask(def.id, def.type);
    });
    
    setInitialized(true);
    setLoading(false);
    
    console.log("✅ [Tasks-Init] All tasks initialized");
  }, [initialized]);

  // Load referral data
  useEffect(() => {
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
  }, []);

  // Function to get current value for a task based on context
  const getCurrentValueForTask = (taskId: string): number => {
    switch (taskId) {
      case "daily_check_in":
        return 1; // Always completed on load
      case "daily_tap_100":
        console.log(`🎯 [Tasks-Value] daily_tap_100: todayTaps=${todayTaps}`);
        return todayTaps;
      case "daily_idle":
        console.log(`🎯 [Tasks-Value] daily_idle: hasClaimedIdleToday=${hasClaimedIdleToday}`);
        return hasClaimedIdleToday ? 1 : 0;
      case "weekly_upgrade":
        console.log(`🎯 [Tasks-Value] weekly_upgrade: totalUpgrades=${totalUpgrades}`);
        return totalUpgrades;
      case "weekly_convert":
        console.log(`🎯 [Tasks-Value] weekly_convert: totalConversions=${totalConversions}`);
        return totalConversions;
      case "weekly_invite":
        console.log(`🎯 [Tasks-Value] weekly_invite: referralCount=${referralCount}`);
        return referralCount;
      case "milestone_taps":
        return totalTaps;
      case "milestone_invite":
        return referralCount;
      default:
        return 0;
    }
  };

  // Build task list from definitions + progress data
  const buildTaskList = (definitions: {
    id: string;
    title: string;
    description: string;
    reward: { type: "BZ" | "BB" | "XP"; amount: number };
    type: "daily" | "weekly" | "progressive";
    target: number;
    icon: React.ReactNode;
  }[]): Task[] => {
    return definitions.map(def => {
      const progress = getTaskProgress(def.id);
      const currentValue = getCurrentValueForTask(def.id);
      
      // Update progress in service if value changed
      if (progress && progress.currentProgress !== currentValue) {
        const isCompleted = currentValue >= def.target;
        console.log(`🔄 [Tasks-Update] ${def.id}: ${progress.currentProgress} → ${currentValue} (completed: ${isCompleted})`);
        updateTaskProgress(def.id, {
          currentProgress: currentValue,
          completed: isCompleted
        });
      }
      
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        reward: def.reward,
        type: def.type,
        target: def.target,
        current: currentValue,
        completed: progress?.completed || currentValue >= def.target,
        claimed: progress?.claimed || false,
        icon: def.icon
      };
    });
  };

  // Update task lists whenever context values change
  useEffect(() => {
    if (!initialized) return;
    
    console.log("🔄 [Tasks-Rebuild] Rebuilding task lists...");
    console.log("🔄 [Tasks-Rebuild] Context values:", {
      todayTaps,
      hasClaimedIdleToday,
      totalUpgrades,
      totalConversions,
      referralCount,
      totalTaps
    });
    
    setDailyTasks(buildTaskList(taskDefinitions.daily));
    setWeeklyTasks(buildTaskList(taskDefinitions.weekly));
  }, [initialized, todayTaps, hasClaimedIdleToday, totalUpgrades, totalConversions, referralCount, totalTaps]);

  // Reload tasks when daily reset occurs
  useEffect(() => {
    if (!initialized || !lastDailyReset) return;
    
    console.log("🔄 [Tasks-Reset] Daily reset detected, reloading tasks...");
    
    // Force rebuild of task lists
    setDailyTasks(buildTaskList(taskDefinitions.daily));
    setWeeklyTasks(buildTaskList(taskDefinitions.weekly));
  }, [lastDailyReset, initialized]);

  const handleClaim = async (task: Task) => {
    if (task.claimed || !task.completed) return;

    console.log(`🎁 [Tasks-Claim] Claiming reward for ${task.id}`);

    try {
      // Claim in tasksService
      const success = await claimTaskReward(task.id);
      
      if (!success) {
        throw new Error("Failed to claim reward");
      }

      // Add rewards to context
      if (task.reward.type === "BZ") {
        addBZ(task.reward.amount);
      } else if (task.reward.type === "BB") {
        addBB(task.reward.amount);
      } else if (task.reward.type === "XP") {
        addXP(task.reward.amount);
      }

      // Also use performTaskClaim to sync with DB
      await performTaskClaim(task.id, task.type, task.reward.type, task.reward.amount);
      
      toast({
        title: "Reward Claimed!",
        description: `You earned ${task.reward.amount} ${task.reward.type}`,
      });
      
      // Rebuild task lists to reflect claimed state
      setDailyTasks(buildTaskList(taskDefinitions.daily));
      setWeeklyTasks(buildTaskList(taskDefinitions.weekly));
      
      console.log(`✅ [Tasks-Claim] Claimed ${task.id} successfully`);
    } catch (err) {
      console.error("❌ [Tasks-Claim] Error:", err);
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

  const renderTaskCard = (task: Task) => {
    const progressValue = Math.min(task.current, task.target);
    const progressPercent = (progressValue / task.target) * 100;

    return (
      <Card key={task.id} className="p-4 mb-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h3 className="font-semibold flex items-center gap-2">
              {task.icon}
              {task.title}
              {task.claimed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          <Badge variant={task.claimed ? "secondary" : "outline"} className="ml-2">
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

        <div className="mt-3 flex justify-end">
          {task.claimed ? (
            <Button variant="ghost" size="sm" disabled className="w-full sm:w-auto text-green-600">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Claimed
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="w-full sm:w-auto"
              disabled={!task.completed}
              onClick={() => handleClaim(task)}
              variant={task.completed ? "default" : "secondary"}
            >
              {task.completed ? "Claim Reward" : "In Progress"}
            </Button>
          )}
        </div>
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
            {dailyTasks.map(task => renderTaskCard(task))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold text-lg">Weekly Tasks</h3>
            </div>
            {weeklyTasks.map(task => renderTaskCard(task))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-lg">Challenges & Milestones</h3>
            </div>
            {buildTaskList(taskDefinitions.progressive).map(task => renderTaskCard(task))}
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