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
                <p className="text-muted-foreground">Earn 500 XP + 10% of their earnings!</p>
              </div>
              
              <div className="p-4 bg-background/50 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium mb-1">Your Referral Link</p>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  https://t.me/bunergy_bot/app?startapp=ref_{Math.random().toString(36).substring(7)}
                </code>
              </div>

              <Button className="w-full gap-2">
                <ArrowRight className="h-4 w-4" />
                Share Link
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="font-semibold">Your Referrals ({referralCount})</h3>
            {referralCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                <p>No referrals yet.</p>
                <p className="text-sm">Invite friends to boost your earnings!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: Math.min(referralCount, 5) }).map((_, i) => (
                  <Card key={i} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">User {Math.floor(Math.random() * 10000)}</p>
                        <p className="text-xs text-muted-foreground">Joined today</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">+50 BZ</Badge>
                  </Card>
                ))}
                {referralCount > 5 && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    And {referralCount - 5} others...
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