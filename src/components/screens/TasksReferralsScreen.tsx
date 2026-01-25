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
  Award
} from "lucide-react";

// Task types
interface Task {
  id: string;
  title: string;
  description: string;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  progress: number;
  target: number;
  icon: any;
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

export function TasksReferralsScreen() {
  const { 
    bz, 
    bb, 
    xp,
    referralCount,
    addBZ, 
    addBB, 
    addXP,
    addReferral 
  } = useGameState();

  // Referral state
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
    const stored = localStorage.getItem("bunergy_referrals");
    return stored ? JSON.parse(stored) : [];
  });

  const [pendingShareTotal, setPendingShareTotal] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Milestone state
  const [milestones, setMilestones] = useState<Milestone[]>(() => {
    if (typeof window === "undefined") {
      return [
        { referrals: 5, xp: 5000, claimed: false },
        { referrals: 10, xp: 15000, claimed: false },
        { referrals: 25, xp: 50000, claimed: false },
        { referrals: 50, xp: 150000, claimed: false }
      ];
    }
    const stored = localStorage.getItem("bunergy_milestones");
    if (stored) return JSON.parse(stored);
    return [
      { referrals: 5, xp: 5000, claimed: false },
      { referrals: 10, xp: 15000, claimed: false },
      { referrals: 25, xp: 50000, claimed: false },
      { referrals: 50, xp: 150000, claimed: false }
    ];
  });

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") {
      return [
        {
          id: "daily_visit",
          title: "Daily Check-in",
          description: "Open the app today",
          reward: { type: "BZ", amount: 1000 },
          progress: 1,
          target: 1,
          icon: Calendar,
          category: "daily"
        },
        {
          id: "daily_tap",
          title: "Tap 100 Times",
          description: "Tap the bunny 100 times",
          reward: { type: "BZ", amount: 2000 },
          progress: 0,
          target: 100,
          icon: Zap,
          category: "daily"
        },
        {
          id: "daily_idle",
          title: "Claim Idle Income",
          description: "Claim your build rewards",
          reward: { type: "XP", amount: 500 },
          progress: 0,
          target: 1,
          icon: Clock,
          category: "daily"
        },
        {
          id: "weekly_upgrade",
          title: "Upgrade 10 Parts",
          description: "Upgrade any build parts 10 times",
          reward: { type: "BZ", amount: 15000 },
          progress: 0,
          target: 10,
          icon: TrendingUp,
          category: "weekly"
        },
        {
          id: "weekly_refer",
          title: "Invite 3 Friends",
          description: "Bring 3 new players this week",
          reward: { type: "XP", amount: 3000 },
          progress: 0,
          target: 3,
          icon: Users,
          category: "weekly"
        },
        {
          id: "weekly_convert",
          title: "Convert 500K BZ",
          description: "Convert BZ to BB",
          reward: { type: "BB", amount: 0.1 },
          progress: 0,
          target: 500000,
          icon: Target,
          category: "weekly"
        },
        {
          id: "prog_taps",
          title: "Master Tapper",
          description: "Reach 10,000 total taps",
          reward: { type: "XP", amount: 10000 },
          progress: 0,
          target: 10000,
          icon: Star,
          category: "progressive"
        },
        {
          id: "prog_builds",
          title: "Expert Builder",
          description: "Complete Stage 3",
          reward: { type: "BB", amount: 1.0 },
          progress: 0,
          target: 1,
          icon: Trophy,
          category: "progressive"
        },
        {
          id: "prog_network",
          title: "Network Master",
          description: "Refer 25 friends",
          reward: { type: "XP", amount: 50000 },
          progress: 0,
          target: 25,
          icon: Award,
          category: "progressive"
        }
      ];
    }
    
    const stored = localStorage.getItem("bunergy_tasks");
    if (stored) return JSON.parse(stored);
    
    return [
      {
        id: "daily_visit",
        title: "Daily Check-in",
        description: "Open the app today",
        reward: { type: "BZ", amount: 1000 },
        progress: 1,
        target: 1,
        icon: Calendar,
        category: "daily"
      },
      {
        id: "daily_tap",
        title: "Tap 100 Times",
        description: "Tap the bunny 100 times",
        reward: { type: "BZ", amount: 2000 },
        progress: 0,
        target: 100,
        icon: Zap,
        category: "daily"
      },
      {
        id: "daily_idle",
        title: "Claim Idle Income",
        description: "Claim your build rewards",
        reward: { type: "XP", amount: 500 },
        progress: 0,
        target: 1,
        icon: Clock,
        category: "daily"
      },
      {
        id: "weekly_upgrade",
        title: "Upgrade 10 Parts",
        description: "Upgrade any build parts 10 times",
        reward: { type: "BZ", amount: 15000 },
        progress: 0,
        target: 10,
        icon: TrendingUp,
        category: "weekly"
      },
      {
        id: "weekly_refer",
        title: "Invite 3 Friends",
        description: "Bring 3 new players this week",
        reward: { type: "XP", amount: 3000 },
        progress: 0,
        target: 3,
        icon: Users,
        category: "weekly"
      },
      {
        id: "weekly_convert",
        title: "Convert 500K BZ",
        description: "Convert BZ to BB",
        reward: { type: "BB", amount: 0.1 },
        progress: 0,
        target: 500000,
        icon: Target,
        category: "weekly"
      },
      {
        id: "prog_taps",
        title: "Master Tapper",
        description: "Reach 10,000 total taps",
        reward: { type: "XP", amount: 10000 },
        progress: 0,
        target: 10000,
        icon: Star,
        category: "progressive"
      },
      {
        id: "prog_builds",
        title: "Expert Builder",
        description: "Complete Stage 3",
        reward: { type: "BB", amount: 1.0 },
        progress: 0,
        target: 1,
        icon: Trophy,
        category: "progressive"
      },
      {
        id: "prog_network",
        title: "Network Master",
        description: "Refer 25 friends",
        reward: { type: "XP", amount: 50000 },
        progress: 0,
        target: 25,
        icon: Award,
        category: "progressive"
      }
    ];
  });

  // Calculate pending share total
  useEffect(() => {
    const total = referrals.reduce((sum, ref) => sum + ref.pendingShare, 0);
    setPendingShareTotal(Math.floor(total));
  }, [referrals]);

  // Save tasks to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bunergy_tasks", JSON.stringify(tasks));
    }
  }, [tasks]);

  // Save milestones to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bunergy_milestones", JSON.stringify(milestones));
    }
  }, [milestones]);

  // Save referrals to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("bunergy_referrals", JSON.stringify(referrals));
    }
  }, [referrals]);

  // Check URL for referral code on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    
    if (refCode && refCode !== referralCode) {
      const alreadyUsed = localStorage.getItem("bunergy_used_referral");
      
      if (!alreadyUsed) {
        addBZ(500);
        localStorage.setItem("bunergy_used_referral", refCode);
        alert("Welcome! You received 500 BZ as a referral bonus!");
      }
    }
  }, [referralCode, addBZ]);

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
      
      setReferrals(refs => refs.map(ref => ({
        ...ref,
        pendingShare: 0
      })));
      
      alert(`Claimed ${pendingShareTotal.toLocaleString()} BZ from referral share!`);
    }
  };

  const claimMilestone = (index: number) => {
    const milestone = milestones[index];
    if (referralCount >= milestone.referrals && !milestone.claimed) {
      addXP(milestone.xp);
      setMilestones(prev => prev.map((m, i) => 
        i === index ? { ...m, claimed: true } : m
      ));
      alert(`Milestone claimed! +${milestone.xp.toLocaleString()} XP`);
    }
  };

  const claimTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.progress < task.target) return;
    
    if (task.reward.type === "BZ") {
      addBZ(task.reward.amount);
    } else if (task.reward.type === "BB") {
      addBB(task.reward.amount);
    } else if (task.reward.type === "XP") {
      addXP(task.reward.amount);
    }
    
    if (task.category === "progressive") {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, progress: 0 } : t
      ));
    }
    
    const rewardText = task.reward.type === "BB" 
      ? `${task.reward.amount.toFixed(6)} BB`
      : `${task.reward.amount.toLocaleString()} ${task.reward.type}`;
    alert(`Task completed! +${rewardText}`);
  };

  const getTasksByCategory = (category: Task["category"]) => {
    return tasks.filter(t => t.category === category);
  };

  const renderTaskCard = (task: Task) => {
    const isComplete = task.progress >= task.target;
    const progressPercent = (task.progress / task.target) * 100;
    const Icon = task.icon;
    
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
              
              {isComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {task.progress.toLocaleString()} / {task.target.toLocaleString()}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {task.reward.type === "BB" 
                    ? `+${task.reward.amount.toFixed(6)} BB`
                    : `+${task.reward.amount.toLocaleString()} ${task.reward.type}`
                  }
                </Badge>
              </div>
              
              <Progress value={progressPercent} className="h-1.5" />
              
              {isComplete && (
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => claimTask(task.id)}
                >
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

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-4 mt-4">
          {/* Referral Link Card */}
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
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={copyReferralLink}
                >
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

          {/* Referral Bonuses Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Referral Bonuses</h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Gift className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">One-Time Binding Bonus</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Your friend gets <span className="font-semibold text-foreground">+500 BZ</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      You get <span className="font-semibold text-foreground">+1,000 BZ + 1,000 XP</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">20% Lifetime Share</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Earn 20% of all BZ your referrals make from Tap + Idle income
                    </div>
                    <div className="text-xs text-primary mt-1">
                      Current pending: {pendingShareTotal.toLocaleString()} BZ
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full"
                onClick={claimPendingShare}
                disabled={pendingShareTotal === 0}
              >
                Claim Pending Share ({pendingShareTotal.toLocaleString()} BZ)
              </Button>
            </div>
          </Card>

          {/* Milestone Rewards */}
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
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      isClaimed 
                        ? "bg-muted/50 border-muted" 
                        : isUnlocked 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-background border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isClaimed 
                            ? "bg-muted" 
                            : isUnlocked 
                            ? "bg-primary/10" 
                            : "bg-muted/50"
                        }`}>
                          <Trophy className={`h-4 w-4 ${
                            isClaimed 
                              ? "text-muted-foreground" 
                              : isUnlocked 
                              ? "text-primary" 
                              : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {milestone.referrals} Referrals
                          </div>
                          <div className="text-xs text-muted-foreground">
                            +{milestone.xp.toLocaleString()} XP
                          </div>
                        </div>
                      </div>
                      
                      {isClaimed ? (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Claimed
                        </Badge>
                      ) : isUnlocked ? (
                        <Button 
                          size="sm"
                          onClick={() => claimMilestone(index)}
                        >
                          Claim
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {referralCount}/{milestone.referrals}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Referral List (if any) */}
          {referrals.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Your Referrals ({referrals.length})</h3>
              <div className="space-y-2">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{ref.username}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(ref.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {ref.totalEarnings.toLocaleString()} BZ
                      </div>
                      <div className="text-xs text-muted-foreground">
                        +{ref.pendingShare.toLocaleString()} pending
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* How It Works */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2 text-sm">How Referrals Work</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Share your unique referral link with friends</li>
              <li>• They get instant 500 BZ bonus when they join</li>
              <li>• You get 1,000 BZ + 1,000 XP for each friend who joins</li>
              <li>• Earn 20% of their lifetime Tap + Idle earnings</li>
              <li>• Unlock milestone XP rewards at 5, 10, 25, and 50 referrals</li>
              <li>• Self-referrals are automatically prevented</li>
            </ul>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          {/* Daily Tasks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Daily Tasks</h3>
              <Badge variant="secondary" className="text-xs">Resets in 24h</Badge>
            </div>
            <div className="space-y-2">
              {getTasksByCategory("daily").map(renderTaskCard)}
            </div>
          </div>

          {/* Weekly Tasks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Weekly Tasks</h3>
              <Badge variant="secondary" className="text-xs">Resets Monday</Badge>
            </div>
            <div className="space-y-2">
              {getTasksByCategory("weekly").map(renderTaskCard)}
            </div>
          </div>

          {/* Progressive Tasks */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Progressive Tasks</h3>
              <Badge variant="secondary" className="text-xs">One-time</Badge>
            </div>
            <div className="space-y-2">
              {getTasksByCategory("progressive").map(renderTaskCard)}
            </div>
          </div>

          {/* Task Info */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2 text-sm">About Tasks</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Daily tasks reset every 24 hours</li>
              <li>• Weekly tasks reset every Monday at 00:00 UTC</li>
              <li>• Progressive tasks are one-time achievements</li>
              <li>• Complete tasks to earn BZ, BB, and XP rewards</li>
              <li>• Task progress is tracked automatically</li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}