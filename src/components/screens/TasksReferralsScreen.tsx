import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Copy, 
  CheckCircle2, 
  Gift, 
  Trophy,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  Star,
  Award,
  LucideIcon
} from "lucide-react";

// Task types
interface Task {
  id: string;
  title: string;
  description: string;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  progress: number;
  target: number;
  iconName: string;
  category: "daily" | "weekly" | "progressive";
}

// Referral data
interface Referral {
  id: string;
  username: string;
  joinedAt: number;
  totalEarnings: number;
  pendingShare: number;
}

// Milestone rewards
interface Milestone {
  referrals: number;
  xp: number;
  claimed: boolean;
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Calendar, Zap, Clock, TrendingUp, Users, Target, Star, Trophy, Award
};

// Default tasks configuration
const getDefaultTasks = (): Task[] => [
  {
    id: "daily_visit",
    title: "Daily Check-in",
    description: "Open the app today",
    reward: { type: "BZ", amount: 1000 },
    progress: 1,
    target: 1,
    iconName: "Calendar",
    category: "daily"
  },
  {
    id: "daily_tap",
    title: "Tap 100 Times",
    description: "Tap the bunny 100 times today",
    reward: { type: "BZ", amount: 2000 },
    progress: 0,
    target: 100,
    iconName: "Zap",
    category: "daily"
  },
  {
    id: "daily_idle",
    title: "Claim Idle Income",
    description: "Claim your build rewards",
    reward: { type: "XP", amount: 500 },
    progress: 0,
    target: 1,
    iconName: "Clock",
    category: "daily"
  },
  {
    id: "weekly_upgrade",
    title: "Upgrade 10 Parts",
    description: "Upgrade any build parts 10 times",
    reward: { type: "BZ", amount: 15000 },
    progress: 0,
    target: 10,
    iconName: "TrendingUp",
    category: "weekly"
  },
  {
    id: "weekly_refer",
    title: "Invite 3 Friends",
    description: "Bring 3 new players this week",
    reward: { type: "XP", amount: 3000 },
    progress: 0,
    target: 3,
    iconName: "Users",
    category: "weekly"
  },
  {
    id: "weekly_convert",
    title: "Convert 500K BZ",
    description: "Convert BZ to BB",
    reward: { type: "BB", amount: 0.1 },
    progress: 0,
    target: 500000,
    iconName: "Target",
    category: "weekly"
  },
  {
    id: "prog_taps",
    title: "Master Tapper",
    description: "Reach 10,000 total taps",
    reward: { type: "XP", amount: 10000 },
    progress: 0,
    target: 10000,
    iconName: "Star",
    category: "progressive"
  },
  {
    id: "prog_builds",
    title: "Expert Builder",
    description: "Complete Stage 3",
    reward: { type: "BB", amount: 1.0 },
    progress: 0,
    target: 1,
    iconName: "Trophy",
    category: "progressive"
  },
  {
    id: "prog_network",
    title: "Network Master",
    description: "Refer 25 friends",
    reward: { type: "XP", amount: 50000 },
    progress: 0,
    target: 25,
    iconName: "Award",
    category: "progressive"
  }
];

export function TasksReferralsScreen() {
  const { 
    bz, bb, xp, referralCount,
    totalTaps, todayTaps, totalUpgrades, totalConversions, hasClaimedIdleToday,
    addBZ, addBB, addXP, addReferral 
  } = useGameState();

  const [referralCode] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = localStorage.getItem("bunergy_referral_code");
    if (stored) return stored;
    const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem("bunergy_referral_code", newCode);
    return newCode;
  });

  const [referrals, setReferrals] = useState<Referral[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("bunergy_referrals");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [pendingShareTotal, setPendingShareTotal] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("bunergy_milestones");
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { referrals: 5, xp: 5000, claimed: false },
      { referrals: 10, xp: 15000, claimed: false },
      { referrals: 25, xp: 50000, claimed: false },
      { referrals: 50, xp: 150000, claimed: false }
    ];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") return getDefaultTasks();
    try {
      const stored = localStorage.getItem("bunergy_tasks");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((task: any) => ({ ...task, iconName: task.iconName || "Star" }));
      }
    } catch {}
    return getDefaultTasks();
  });

  // Track progress based on real game state
  useEffect(() => {
    setTasks(prevTasks => prevTasks.map(task => {
      // Daily: Tap 100 times (uses TODAY'S taps)
      if (task.id === "daily_tap") {
        return { ...task, progress: Math.min(todayTaps, task.target) };
      }
      
      // Daily: Claim Idle (reset daily)
      if (task.id === "daily_idle") {
        return { ...task, progress: hasClaimedIdleToday ? 1 : 0 };
      }
      
      // Weekly: Upgrade 10 parts
      if (task.id === "weekly_upgrade") {
        return { ...task, progress: Math.min(totalUpgrades, task.target) };
      }
      
      // Weekly: Refer 3 friends
      if (task.id === "weekly_refer") {
        return { ...task, progress: Math.min(referralCount, task.target) };
      }
      
      // Weekly: Convert 500k
      if (task.id === "weekly_convert") {
        return { ...task, progress: Math.min(totalConversions, task.target) };
      }
      
      // Progressive: Master Tapper (uses TOTAL taps)
      if (task.id === "prog_taps") {
        return { ...task, progress: Math.min(totalTaps, task.target) };
      }
      
      // Progressive: Expert Builder (Stage 3 complete)
      if (task.id === "prog_builds") {
        const buildParts = localStorage.getItem("buildParts");
        if (buildParts) {
          const parts = JSON.parse(buildParts);
          const stage3Parts = Object.keys(parts).filter(k => k.startsWith("s3p"));
          const stage3L5Count = stage3Parts.filter(k => parts[k].level >= 5).length;
          return { ...task, progress: stage3L5Count >= 10 ? 1 : 0 };
        }
        return task;
      }
      
      // Progressive: Network Master
      if (task.id === "prog_network") {
        return { ...task, progress: Math.min(referralCount, task.target) };
      }
      
      return task;
    }));
  }, [totalTaps, todayTaps, totalUpgrades, totalConversions, hasClaimedIdleToday, referralCount]);

  useEffect(() => {
    const total = referrals.reduce((sum, ref) => sum + ref.pendingShare, 0);
    setPendingShareTotal(Math.floor(total));
  }, [referrals]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bunergy_tasks", JSON.stringify(tasks));
      localStorage.setItem("bunergy_milestones", JSON.stringify(milestones));
      localStorage.setItem("bunergy_referrals", JSON.stringify(referrals));
    }
  }, [tasks, milestones, referrals]);

  const copyReferralLink = () => {
    const link = `https://t.me/bunergy_bot?start=${referralCode}`;
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const claimPendingShare = () => {
    if (pendingShareTotal > 0) {
      addBZ(pendingShareTotal);
      setReferrals(refs => refs.map(ref => ({ ...ref, pendingShare: 0 })));
    }
  };

  const claimMilestone = (index: number) => {
    const milestone = milestones[index];
    if (referralCount >= milestone.referrals && !milestone.claimed) {
      addXP(milestone.xp);
      setMilestones(prev => prev.map((m, i) => i === index ? { ...m, claimed: true } : m));
    }
  };

  const claimTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.progress < task.target) return;
    
    if (task.reward.type === "BZ") addBZ(task.reward.amount);
    else if (task.reward.type === "BB") addBB(task.reward.amount);
    else if (task.reward.type === "XP") addXP(task.reward.amount);
    
    // Only remove if progressive, otherwise just mark collected/reset
    // Note: Simplification for now, usually we mark "claimed: true" for daily
    // But here we reset progress to 0 to prevent re-claiming immediately
    // Ideally we should have a 'claimed' flag for daily tasks too
    
    if (task.category === "progressive") {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: 0 } : t));
    }
  };

  const getTasksByCategory = (category: Task["category"]) => tasks.filter(t => t.category === category);

  const renderTaskCard = (task: Task) => {
    const isComplete = task.progress >= task.target;
    const progressPercent = (task.progress / task.target) * 100;
    const Icon = iconMap[task.iconName] || Star;
    
    return (
      <Card key={task.id} className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isComplete ? "bg-green-500/10" : "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${isComplete ? "text-green-500" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-medium text-sm">{task.title}</h4>
                <p className="text-xs text-muted-foreground">{task.description}</p>
              </div>
              {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {task.progress.toLocaleString()} / {task.target.toLocaleString()}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {task.reward.type === "BB" ? `+${task.reward.amount.toFixed(6)} BB` : `+${task.reward.amount.toLocaleString()} ${task.reward.type}`}
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              {isComplete && (
                <Button size="sm" className="w-full mt-2" onClick={() => claimTask(task.id)}>
                  Claim Reward
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <Tabs defaultValue="referrals" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Your Referral Link</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg p-3 text-sm font-mono break-all">
                  t.me/bunergy_bot?start={referralCode}
                </div>
                <Button size="icon" variant="outline" onClick={copyReferralLink}>
                  {copiedCode ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-muted-foreground text-xs">Total Referrals</div>
                  <div className="font-bold text-lg">{referralCount}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-muted-foreground text-xs">Pending Share</div>
                  <div className="font-bold text-lg">{pendingShareTotal.toLocaleString()} BZ</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Referral Bonuses</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-lg"><Gift className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">One-Time Binding Bonus</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Your friend gets <span className="font-semibold text-foreground">+500 BZ</span></div>
                    <div className="text-xs text-muted-foreground">You get <span className="font-semibold text-foreground">+1,000 BZ + 1,000 XP</span></div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">20% Lifetime Share</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Earn 20% of all BZ your referrals make from Tap + Idle income</div>
                    <div className="text-xs text-primary mt-1">Current pending: {pendingShareTotal.toLocaleString()} BZ</div>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={claimPendingShare} disabled={pendingShareTotal === 0}>
                Claim Pending Share ({pendingShareTotal.toLocaleString()} BZ)
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Milestone Rewards</h3>
            </div>
            <div className="space-y-2">
              {milestones.map((milestone, index) => {
                const isUnlocked = referralCount >= milestone.referrals;
                const isClaimed = milestone.claimed;
                return (
                  <div key={index} className={`p-3 rounded-lg border ${isClaimed ? "bg-muted/50 border-muted" : isUnlocked ? "bg-primary/5 border-primary/20" : "bg-background border-border"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isClaimed ? "bg-muted" : isUnlocked ? "bg-primary/10" : "bg-muted/50"}`}>
                          <Trophy className={`h-4 w-4 ${isClaimed ? "text-muted-foreground" : isUnlocked ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{milestone.referrals} Referrals</div>
                          <div className="text-xs text-muted-foreground">+{milestone.xp.toLocaleString()} XP</div>
                        </div>
                      </div>
                      {isClaimed ? (
                        <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Claimed</Badge>
                      ) : isUnlocked ? (
                        <Button size="sm" onClick={() => claimMilestone(index)}>Claim</Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">{referralCount}/{milestone.referrals}</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {referrals.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Your Referrals ({referrals.length})</h3>
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{ref.username}</div>
                      <div className="text-xs text-muted-foreground">Joined {new Date(ref.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{ref.totalEarnings.toLocaleString()} BZ</div>
                      <div className="text-xs text-muted-foreground">+{ref.pendingShare.toLocaleString()} pending</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 mt-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Daily Tasks</h3>
              <Badge variant="secondary" className="text-xs">Resets in 24h</Badge>
            </div>
            <div className="space-y-2">{getTasksByCategory("daily").map(renderTaskCard)}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Weekly Tasks</h3>
              <Badge variant="secondary" className="text-xs">Resets Monday</Badge>
            </div>
            <div className="space-y-2">{getTasksByCategory("weekly").map(renderTaskCard)}</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Progressive Tasks</h3>
              <Badge variant="secondary" className="text-xs">One-time</Badge>
            </div>
            <div className="space-y-2">{getTasksByCategory("progressive").map(renderTaskCard)}</div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}