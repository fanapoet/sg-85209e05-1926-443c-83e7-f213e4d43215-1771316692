import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Gift, 
  Trophy, 
  Users, 
  Hammer, 
  ArrowLeftRight, 
  Zap, 
  Star, 
  Crown,
  Check,
  Lock,
  Calendar,
  Target,
  TrendingUp
} from "lucide-react";

interface DailyReward {
  day: number;
  type: "BZ" | "BB" | "XP";
  amount: number;
}

interface WeeklyChallenge {
  key: string;
  name: string;
  icon: string;
  description: string;
  target: number;
  progress: number;
  reward: { type: "BZ" | "BB" | "XP"; amount: number };
  claimed: boolean;
}

interface NFT {
  key: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  requirement: string;
  requirementMet: boolean;
  owned: boolean;
}

const getWeeklyRewards = (weekNumber: number): DailyReward[] => {
  const baseRewards = [
    { day: 1, type: "XP" as const, amount: 2000 },
    { day: 2, type: "BZ" as const, amount: 5000 },
    { day: 3, type: "XP" as const, amount: 3000 },
    { day: 4, type: "BZ" as const, amount: 8000 },
    { day: 5, type: "XP" as const, amount: 5000 },
    { day: 6, type: "BB" as const, amount: 0.001 },
    { day: 7, type: "BZ" as const, amount: 15000 }
  ];

  return baseRewards.map(reward => ({
    ...reward,
    amount: reward.type === "BB" 
      ? reward.amount * weekNumber 
      : reward.amount * weekNumber
  }));
};

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Hammer, Users, ArrowLeftRight, Star, Zap, Trophy, Crown
  };
  return icons[iconName] || Star;
};

export function RewardsNFTsScreen() {
  const { 
    // State
    dailyStreak, 
    currentRewardWeek, 
    lastDailyClaimDate,
    currentWeeklyPeriodStart,
    
    // Stats for Challenges
    totalUpgrades, 
    referralCount, 
    totalConversions, 
    totalTapIncome, 
    totalTaps, 
    xp, 
    bb, 
    
    // Methods
    performDailyClaim,
    addBZ, 
    addBB, 
    addXP,
    purchaseNFT,
    resetWeeklyPeriod
  } = useGameState();
  
  console.log("[Weekly Reset] 🎬 RewardsNFTsScreen mounted/rendered");
  console.log("[Weekly Reset] 📊 currentWeeklyPeriodStart from context:", currentWeeklyPeriodStart);
  
  const [ownedNFTs, setOwnedNFTs] = useState<string[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Use context values for rewards
  const currentWeek = currentRewardWeek || 1;
  const streak = dailyStreak || 0;
  const dailyRewards = getWeeklyRewards(currentWeek);

  // Initialize Challenges & NFTs from LocalStorage (UI state only)
  useEffect(() => {
    // Load Owned NFTs
    try {
      const savedNFTs = localStorage.getItem("ownedNFTs");
      if (savedNFTs) {
        const parsed = JSON.parse(savedNFTs);
        // Handle both old format (strings) and new format (objects)
        if (Array.isArray(parsed)) {
          const nftIds = parsed.map((item: any) => 
            typeof item === "string" ? item : item.nftId
          );
          
          // ✅ DEDUPLICATE: Use Set to ensure uniqueness
          const uniqueNFTs = Array.from(new Set(nftIds));
          setOwnedNFTs(uniqueNFTs);
          
          // ✅ CLEANUP: Save deduplicated version back to localStorage
          if (uniqueNFTs.length !== nftIds.length) {
            console.log(`🧹 [NFT-CLEANUP] Removed ${nftIds.length - uniqueNFTs.length} duplicate NFTs from localStorage`);
            localStorage.setItem("ownedNFTs", JSON.stringify(uniqueNFTs));
          }
        }
      }
    } catch (e) {
      console.error("Failed to load NFTs", e);
    }

    // Load/Init Challenges with validation
    try {
      // ✅ CRITICAL FIX: Validate localStorage against current weekly period
      const savedChallenges = localStorage.getItem("weeklyChallenges");
      const savedBaselines = localStorage.getItem("weeklyBaselines");
      
      // Check if we need to initialize fresh challenges
      let shouldInitializeFresh = false;
      
      if (currentWeeklyPeriodStart && savedBaselines) {
        try {
          const baselines = JSON.parse(savedBaselines);
          const baselineTimestamp = baselines.timestamp || 0;
          const periodStart = new Date(currentWeeklyPeriodStart).getTime();
          
          // If baselines are from before the current period start, they're stale
          if (baselineTimestamp < periodStart) {
            console.log("🧹 [Challenges] Baselines are stale, initializing fresh");
            shouldInitializeFresh = true;
            localStorage.removeItem("weeklyChallenges");
            localStorage.removeItem("weeklyBaselines");
          }
        } catch (e) {
          console.error("Error validating baselines:", e);
          shouldInitializeFresh = true;
        }
      }
      
      if (savedChallenges && !shouldInitializeFresh) {
        setWeeklyChallenges(JSON.parse(savedChallenges));
      } else {
        // Initialize fresh challenges with current baselines
        const initialBaselines = {
          upgrades: totalUpgrades || 0,
          referrals: referralCount || 0,
          conversions: totalConversions || 0,
          timestamp: Date.now()
        };
        localStorage.setItem("weeklyBaselines", JSON.stringify(initialBaselines));
        
        // Default Challenges - Initialize with 0 progress
        setWeeklyChallenges([
          {
            key: "builder",
            name: "Master Builder",
            icon: "Hammer",
            description: "Perform 50 upgrades",
            target: 50,
            progress: 0,
            reward: { type: "BZ", amount: 10000 },
            claimed: false
          },
          {
            key: "recruiter",
            name: "Top Recruiter",
            icon: "Users",
            description: "Invite 5 friends",
            target: 5,
            progress: 0,
            reward: { type: "BB", amount: 0.005 },
            claimed: false
          },
          {
            key: "converter",
            name: "Exchange Guru",
            icon: "ArrowLeftRight",
            description: "Convert 10 times",
            target: 10,
            progress: 0,
            reward: { type: "XP", amount: 5000 },
            claimed: false
          }
        ]);
      }
    } catch (e) {
      console.error("Failed to load challenges", e);
    }
    
    setLoading(false);
  }, [currentWeeklyPeriodStart]);

  // Update Challenge Progress based on Context Stats
  useEffect(() => {
    if (loading) return;
    
    // Get weekly baselines (values at start of current week)
    const weeklyBaselines = JSON.parse(localStorage.getItem("weeklyBaselines") || "{}");
    const baseUpgrades = weeklyBaselines.upgrades || 0;
    const baseReferrals = weeklyBaselines.referrals || 0;
    const baseConversions = weeklyBaselines.conversions || 0;
    
    console.log("🎯 [Weekly-Challenge] Updating progress with game state:", {
      totalUpgrades,
      referralCount,
      totalConversions,
      baseUpgrades,
      baseReferrals,
      baseConversions
    });
    
    setWeeklyChallenges(prev => {
      const updated = prev.map(c => {
        let newProgress = c.progress;
        
        // Calculate progress as DELTA from weekly baseline
        if (c.key === "builder") newProgress = Math.max(0, (totalUpgrades || 0) - baseUpgrades);
        if (c.key === "recruiter") newProgress = Math.max(0, (referralCount || 0) - baseReferrals);
        if (c.key === "converter") newProgress = Math.max(0, (totalConversions || 0) - baseConversions);
        
        console.log(`🎯 [Weekly-Challenge] ${c.key}: ${c.progress} → ${newProgress}`);
        
        return { ...c, progress: Math.min(newProgress, c.target) };
      });
      
      return updated;
    });
  }, [totalUpgrades, referralCount, totalConversions, loading]);

  // Persist Challenges to LocalStorage
  useEffect(() => {
    if (!loading && weeklyChallenges.length > 0) {
      localStorage.setItem("weeklyChallenges", JSON.stringify(weeklyChallenges));
    }
  }, [weeklyChallenges, loading]);

  // Check for weekly reset after challenges are loaded and context is available
  useEffect(() => {
    console.log("🔍 [Weekly Reset Check] Effect triggered");
    console.log("🔍 [Weekly Reset Check] loading:", loading);
    console.log("🔍 [Weekly Reset Check] currentWeeklyPeriodStart:", currentWeeklyPeriodStart);
    
    if (!loading && currentWeeklyPeriodStart) {
      const now = new Date();
      const periodStart = new Date(currentWeeklyPeriodStart);
      
      // Calculate difference in days
      const diffTime = Math.abs(now.getTime() - periodStart.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      console.log("📅 [Weekly Reset Check] Current time:", now.toISOString());
      console.log("📅 [Weekly Reset Check] Period start:", periodStart.toISOString());
      console.log("📅 [Weekly Reset Check] Days passed:", diffDays);

      if (diffDays >= 7) {
        console.log("🔄 [Weekly Reset] 7+ days detected! Resetting challenges...");
        
        // 0. Store current values as weekly baselines for delta calculation
        const weeklyBaselines = {
          upgrades: totalUpgrades || 0,
          referrals: referralCount || 0,
          conversions: totalConversions || 0,
          timestamp: Date.now()
        };
        localStorage.setItem("weeklyBaselines", JSON.stringify(weeklyBaselines));
        console.log("📊 [Weekly Reset] Stored baselines:", weeklyBaselines);
        
        // 1. Clear old localStorage to prevent stale data
        localStorage.removeItem("weeklyChallenges");
        
        // 2. Reset Local Challenges to 0 progress
        setWeeklyChallenges([
          {
            key: "builder",
            name: "Master Builder",
            icon: "Hammer",
            description: "Perform 50 upgrades",
            target: 50,
            progress: 0,
            reward: { type: "BZ", amount: 10000 },
            claimed: false
          },
          {
            key: "recruiter",
            name: "Top Recruiter",
            icon: "Users",
            description: "Invite 5 friends",
            target: 5,
            progress: 0,
            reward: { type: "BB", amount: 0.005 },
            claimed: false
          },
          {
            key: "converter",
            name: "Exchange Guru",
            icon: "ArrowLeftRight",
            description: "Convert 10 times",
            target: 10,
            progress: 0,
            reward: { type: "XP", amount: 5000 },
            claimed: false
          }
        ]);
        
        // 3. Update Database & Context with NEW period start date
        console.log("🔄 [Weekly Reset] Calling resetWeeklyPeriod...");
        resetWeeklyPeriod();
      } else {
        console.log("✅ [Weekly Reset Check] Still within 7-day period, no reset needed");
      }
    } else if (!loading && !currentWeeklyPeriodStart) {
      console.log("⚠️ [Weekly Reset Check] Missing currentWeeklyPeriodStart - initializing");
      resetWeeklyPeriod();
    } else {
      console.log("⏳ [Weekly Reset Check] Still loading or waiting for data");
    }
  }, [currentWeeklyPeriodStart, loading, resetWeeklyPeriod]);

  const isStage2Complete = (): boolean => {
    try {
      const buildParts = localStorage.getItem("buildParts");
      if (!buildParts) return false;
      
      const parts = JSON.parse(buildParts);
      const stage2Parts = Object.keys(parts).filter(k => k.startsWith("s2p"));
      const stage2L5Count = stage2Parts.filter(k => parts[k].level >= 5).length;
      return stage2L5Count >= 10;
    } catch {
      return false;
    }
  };

  const areBoostersMaxed = (): boolean => {
    try {
      const boosters = localStorage.getItem("boosters");
      if (!boosters) return false;
      
      const data = JSON.parse(boosters);
      return (
        data.energyPerTap >= 10 && 
        data.energyCapacity >= 10 && 
        data.recoveryRate >= 10
      );
    } catch {
      return false;
    }
  };

  const nfts: NFT[] = [
    {
      key: "NFT_EARLY",
      name: "Early Adopter",
      icon: "Star",
      description: "Welcome to Bunergy! Free for all players.",
      price: 0,
      requirement: "Free",
      requirementMet: true,
      owned: ownedNFTs.includes("NFT_EARLY")
    },
    {
      key: "NFT_SOCIAL",
      name: "Social King",
      icon: "Users",
      description: "Master of connections and community.",
      price: 2,
      requirement: "20 referrals",
      requirementMet: (referralCount || 0) >= 20,
      owned: ownedNFTs.includes("NFT_SOCIAL")
    },
    {
      key: "NFT_BUILDER",
      name: "Builder Pro",
      icon: "Hammer",
      description: "Expert in construction and upgrades.",
      price: 2,
      requirement: "Complete Stage 2",
      requirementMet: isStage2Complete(),
      owned: ownedNFTs.includes("NFT_BUILDER")
    },
    {
      key: "NFT_TAPPER",
      name: "Tap Legend",
      icon: "Zap",
      description: "Legendary tapping power unleashed.",
      price: 4,
      requirement: "Earn 10M BZ from tapping",
      requirementMet: (totalTapIncome || 0) >= 10000000,
      owned: ownedNFTs.includes("NFT_TAPPER")
    },
    {
      key: "NFT_ENERGY",
      name: "Energy Master",
      icon: "Trophy",
      description: "Perfect energy management achieved.",
      price: 3,
      requirement: "Max all energy boosters",
      requirementMet: areBoostersMaxed(),
      owned: ownedNFTs.includes("NFT_ENERGY")
    },
    {
      key: "NFT_GOLDEN",
      name: "Golden Bunny",
      icon: "Crown",
      description: "The ultimate tapping achievement.",
      price: 5,
      requirement: "5M taps total",
      requirementMet: (totalTaps || 0) >= 5000000,
      owned: ownedNFTs.includes("NFT_GOLDEN")
    },
    {
      key: "NFT_DIAMOND",
      name: "Diamond Crystal",
      icon: "Trophy",
      description: "Reached the pinnacle of experience.",
      price: 7,
      requirement: "500k+ XP",
      requirementMet: (xp || 0) >= 500000,
      owned: ownedNFTs.includes("NFT_DIAMOND")
    }
  ];

  const handleDailyClaim = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if already claimed today
      if (lastDailyClaimDate) {
        const lastClaim = new Date(lastDailyClaimDate);
        lastClaim.setHours(0, 0, 0, 0);
        if (lastClaim.getTime() === today.getTime()) return;
      }

      const nextDay = (streak % 7) + 1;
      const reward = dailyRewards[nextDay - 1];
      
      let nextWeek = currentWeek;
      if (nextDay === 7) {
        nextWeek = currentWeek + 1;
      }

      console.log(`🎁 [Rewards] Claiming Day ${nextDay}, Week ${nextWeek}`);
      
      // Use Context Method to update state & sync to DB
      await performDailyClaim(nextDay, nextWeek, reward.type, reward.amount);
      
    } catch (error) {
      console.error("❌ [Rewards] Error claiming daily reward:", error);
    }
  };

  const handleClaimChallenge = (challengeKey: string) => {
    try {
      setWeeklyChallenges(prev => 
        prev.map(c => {
          if (c.key === challengeKey && c.progress >= c.target && !c.claimed) {
            console.log(`🎯 [Rewards] Claiming challenge: ${c.name}`);
            
            // Update Balances via Context
            if (c.reward.type === "BZ") addBZ(c.reward.amount);
            if (c.reward.type === "BB") addBB(c.reward.amount);
            if (c.reward.type === "XP") addXP(c.reward.amount);
            
            return { ...c, claimed: true };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("❌ [Rewards] Error claiming challenge:", error);
    }
  };

  // Helper to check if claimed today
  const isClaimedToday = () => {
    if (!lastDailyClaimDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastClaim = new Date(lastDailyClaimDate);
    lastClaim.setHours(0, 0, 0, 0);
    return lastClaim.getTime() === today.getTime();
  };

  const handlePurchaseNFT = async (nft: NFT) => {
    try {
      if (nft.owned || !nft.requirementMet) return;
      
      // Use context method which handles both balance deduction and DB sync
      purchaseNFT(nft.key, nft.price);
      
      // Update local UI state
      const updated = [...ownedNFTs, nft.key];
      setOwnedNFTs(updated);
      localStorage.setItem("ownedNFTs", JSON.stringify(updated));
    } catch (error) {
      console.error("❌ [Rewards] Error purchasing NFT:", error);
    }
  };

  const canClaimDaily = !isClaimedToday();
  const currentDayReward = dailyRewards[(streak % 7)];

  const getProgressText = (nft: NFT): string => {
    if (nft.owned) return "";
    switch (nft.key) {
      case "NFT_EARLY": return "Always Available";
      case "NFT_SOCIAL": return `${referralCount || 0} / 20 referrals`;
      case "NFT_BUILDER": return isStage2Complete() ? "Stage 2 Complete ✓" : "Stage 2 Incomplete";
      case "NFT_TAPPER": return `${((totalTapIncome || 0) / 1000000).toFixed(1)}M / 10M BZ`;
      case "NFT_ENERGY": return areBoostersMaxed() ? "All Boosters Maxed ✓" : "Boosters Not Maxed";
      case "NFT_GOLDEN": return `${((totalTaps || 0) / 1000000).toFixed(1)}M / 5M taps`;
      case "NFT_DIAMOND": return `${((xp || 0) / 1000).toFixed(0)}k / 500k XP`;
      default: return "";
    }
  };

  const getProgressPercent = (nft: NFT): number => {
    if (nft.owned || nft.requirementMet) return 100;
    switch (nft.key) {
      case "NFT_EARLY": return 100;
      case "NFT_SOCIAL": return Math.min(((referralCount || 0) / 20) * 100, 100);
      case "NFT_BUILDER": return isStage2Complete() ? 100 : 0;
      case "NFT_TAPPER": return Math.min(((totalTapIncome || 0) / 10000000) * 100, 100);
      case "NFT_ENERGY": return areBoostersMaxed() ? 100 : 0;
      case "NFT_GOLDEN": return Math.min(((totalTaps || 0) / 5000000) * 100, 100);
      case "NFT_DIAMOND": return Math.min(((xp || 0) / 500000) * 100, 100);
      default: return 0;
    }
  };

  const shouldShowProgressBar = (nft: NFT): boolean => {
    if (nft.owned) return false;
    return ["NFT_SOCIAL", "NFT_TAPPER", "NFT_GOLDEN", "NFT_DIAMOND"].includes(nft.key);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading rewards...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Rewards & NFTs</h1>
        <p className="text-sm text-muted-foreground">
          Claim daily rewards, complete challenges, and collect exclusive NFTs
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Daily Rewards</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Week {currentWeek}
              </Badge>
              <Badge variant="outline">
                Day {(streak % 7) + 1}/7
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dailyRewards.map((reward, index) => {
              const dayNum = index + 1;
              const isClaimed = streak >= dayNum;
              const isCurrent = (streak % 7) + 1 === dayNum;

              return (
                <div
                  key={dayNum}
                  className={`p-2 rounded-lg border-2 text-center ${
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : isClaimed
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-muted bg-muted/50"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">D{dayNum}</p>
                  <p className="text-[10px] font-bold leading-tight">
                    {reward.type === "BB" 
                      ? `${reward.amount.toFixed(3)} BB` 
                      : `${reward.amount.toLocaleString()} ${reward.type}`
                    }
                  </p>
                  {isClaimed && !isCurrent && (
                    <Check className="h-3 w-3 mx-auto mt-1 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleDailyClaim}
            disabled={!canClaimDaily}
            className="w-full"
            size="lg"
          >
            {canClaimDaily ? (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Claim {currentDayReward.type === "BB" ? currentDayReward.amount.toFixed(3) : currentDayReward.amount.toLocaleString()} {currentDayReward.type}
              </>
            ) : (
              "Come back tomorrow!"
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Weekly Challenges</h3>
          </div>

          <div className="space-y-3">
            {weeklyChallenges.map((challenge) => {
              const Icon = getIconComponent(challenge.icon);
              const progressPercent = (challenge.progress / challenge.target) * 100;
              const isComplete = challenge.progress >= challenge.target;

              return (
                <div key={challenge.key} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${challenge.claimed ? "bg-green-500/10" : "bg-primary/10"}`}>
                      <Icon className={`h-5 w-5 ${challenge.claimed ? "text-green-500" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{challenge.name}</h4>
                        {challenge.claimed && (
                          <Badge variant="default" className="bg-green-600 flex-shrink-0">
                            <Check className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {challenge.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-medium">
                          +{challenge.reward.type === "BB" ? challenge.reward.amount.toFixed(3) : challenge.reward.amount.toLocaleString()} {challenge.reward.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <Button
                    onClick={() => handleClaimChallenge(challenge.key)}
                    disabled={!isComplete || challenge.claimed}
                    className="w-full mt-3"
                    size="sm"
                    variant={isComplete && !challenge.claimed ? "default" : "secondary"}
                  >
                    {challenge.claimed ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Claimed
                      </>
                    ) : isComplete ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Claim Reward
                      </>
                    ) : (
                      "In Progress"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Exclusive NFTs</h3>
            </div>
            <Badge variant="outline">
              {ownedNFTs.length}/{nfts.length} Owned
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {nfts.map((nft) => {
            const Icon = getIconComponent(nft.icon);
            const progressText = getProgressText(nft);
            const progressPercent = getProgressPercent(nft);
            const showProgressBar = shouldShowProgressBar(nft);

            return (
              <Card
                key={nft.key}
                className={`p-6 ${
                  nft.owned
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : !nft.requirementMet
                    ? "opacity-60"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${nft.owned ? "bg-green-500/20" : "bg-primary/10"}`}>
                    <Icon className={`h-6 w-6 ${nft.owned ? "text-green-600" : "text-primary"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-lg">{nft.name}</h4>
                      {nft.owned && (
                        <Badge variant="default" className="bg-green-600 flex-shrink-0">
                          <Check className="h-3 w-3 mr-1" />
                          Owned
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {nft.description}
                    </p>
                  </div>
                </div>

                {!nft.owned && progressText && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={nft.requirementMet ? "text-green-600 font-semibold" : "font-medium"}>
                        {progressText}
                      </span>
                    </div>
                    {showProgressBar && (
                      <Progress value={progressPercent} className="h-2" />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    {nft.requirementMet ? (
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    )}
                    <span className={nft.requirementMet ? "text-green-600 font-medium" : "text-orange-600"}>
                      {nft.requirement}
                    </span>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {nft.price === 0 ? "Free" : `${nft.price.toFixed(3)} BB`}
                  </Badge>
                </div>

                <Button
                  onClick={() => handlePurchaseNFT(nft)}
                  disabled={nft.owned || !nft.requirementMet}
                  className="w-full"
                  size="sm"
                  variant={nft.requirementMet && !nft.owned ? "default" : "secondary"}
                >
                  {nft.owned ? (
                    "Already Owned"
                  ) : !nft.requirementMet ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Locked
                    </>
                  ) : nft.price === 0 ? (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Claim Free NFT
                    </>
                  ) : (
                    <>
                      Purchase for {nft.price.toFixed(3)} BB
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}