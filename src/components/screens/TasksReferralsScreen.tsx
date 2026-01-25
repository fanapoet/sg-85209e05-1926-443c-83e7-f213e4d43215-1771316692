import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy, Users, Star, ArrowRight, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  
  // Track claimed tasks: { [taskId]: timestamp }
  const [claimedTasks, setClaimedTasks] = useState<Record<string, number>>({});

  // Load claimed status
  useEffect(() => {
    const saved = localStorage.getItem("bunergy_claimed_tasks");
    if (saved) {
      setClaimedTasks(JSON.parse(saved));
    }
  }, []);

  // Check if a task is claimed
  const isClaimed = (task: Task) => {
    const claimedTime = claimedTasks[task.id];
    if (!claimedTime) return false;

    if (task.type === "daily") {
      const claimedDate = new Date(claimedTime).toDateString();
      const today = new Date().toDateString();
      return claimedDate === today;
    }

    return true; // Weekly/Milestone claimed forever (or until reset logic elsewhere)
  };

  const handleClaim = (task: Task) => {
    if (isClaimed(task)) return;

    // Grant Reward
    if (task.reward.type === "BZ") addBZ(task.reward.amount);
    if (task.reward.type === "BB") addBB(task.reward.amount);
    if (task.reward.type === "XP") addXP(task.reward.amount);

    // Mark as claimed
    const newClaimed = { ...claimedTasks, [task.id]: Date.now() };
    setClaimedTasks(newClaimed);
    localStorage.setItem("bunergy_claimed_tasks", JSON.stringify(newClaimed));

    toast({
      title: "Reward Claimed!",
      description: `You earned ${task.reward.amount} ${task.reward.type}`,
    });
  };

  const tasks: Task[] = [
    // Daily Tasks
    {
      id: "daily_check_in",
      title: "Daily Check-in",
      description: "Log in to the game correctly.",
      reward: { type: "BZ", amount: 500 },
      type: "daily",
      target: 1,
      current: 1 // Always completed if app is open
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
      reward: { type: "XP", amount: 50 },
      type: "daily",
      target: 1,
      current: hasClaimedIdleToday ? 1 : 0
    },

    // Weekly Tasks (Using total counters for now, simplified)
    {
      id: "weekly_upgrade",
      title: "Upgrade 10 Parts",
      description: "Perform 10 upgrades in the Build screen.",
      reward: { type: "BZ", amount: 5000 },
      type: "weekly",
      target: 10,
      current: totalUpgrades // Now tracks actual upgrades performed
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

    // Milestones
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
                    REF{Math.random().toString(36).substring(2, 8).toUpperCase()}
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code or use the link below
                  </p>
                </div>

                <div className="p-3 bg-background/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium mb-1">Direct Link</p>
                  <code className="text-xs bg-muted p-2 rounded block break-all">
                    https://t.me/bunergy_bot/app?startapp=ref_{Math.random().toString(36).substring(7)}
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

              <Button className="w-full gap-2" size="lg">
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
                {(referralCount * 150).toLocaleString()} BZ
              </Badge>
            </div>
            <Button 
              className="w-full" 
              variant="default"
              disabled={referralCount === 0}
            >
              Claim Pending Income
            </Button>
          </Card>

          {/* Referral Milestones */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Referral Milestones</h3>
            <div className="space-y-3">
              {[
                { count: 5, reward: "5,000 XP", reached: referralCount >= 5 },
                { count: 10, reward: "15,000 XP", reached: referralCount >= 10 },
                { count: 25, reward: "50,000 XP", reached: referralCount >= 25 },
                { count: 50, reward: "150,000 XP", reached: referralCount >= 50 }
              ].map((milestone) => (
                <div 
                  key={milestone.count}
                  className={`p-3 rounded-lg border-2 ${
                    milestone.reached 
                      ? "bg-green-50 dark:bg-green-950 border-green-500" 
                      : "bg-muted border-muted-foreground/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {milestone.reached ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold">{milestone.count} Referrals</p>
                        <p className="text-xs text-muted-foreground">Reward: {milestone.reward}</p>
                      </div>
                    </div>
                    <Badge variant={milestone.reached ? "default" : "outline"}>
                      {referralCount}/{milestone.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Referral List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Your Referrals ({referralCount})</h3>
            {referralCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No referrals yet.</p>
                <p className="text-sm">Share your code to start earning!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: Math.min(referralCount, 10) }).map((_, i) => (
                  <Card key={i} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {String.fromCharCode(65 + (i % 26))}
                      </div>
                      <div>
                        <p className="font-medium text-sm">User {1000 + i}</p>
                        <p className="text-xs text-muted-foreground">
                          Earned: {(Math.random() * 50000).toFixed(0)} BZ
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-600">
                        +{(Math.random() * 10000).toFixed(0)} BZ
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Your share</p>
                    </div>
                  </Card>
                ))}
                {referralCount > 10 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    And {referralCount - 10} more referrals...
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