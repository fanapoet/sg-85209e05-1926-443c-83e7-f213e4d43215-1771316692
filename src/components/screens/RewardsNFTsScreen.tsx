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
import { claimDailyReward, purchaseNFT, updateWeeklyChallengeProgress } from "@/services/rewardsService";
import { getRewardState, upsertRewardState, updateLastDailyClaimDate, incrementDailyStreak } from "@/services/rewardStateService";

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
  const gameState = useGameState();
  
  const [dailyStreak, setDailyStreak] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<string[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSyncError, setDbSyncError] = useState(false);

  const dailyRewards = getWeeklyRewards(currentWeek);

  // Load reward state: LOCAL-FIRST, then sync with DB
  useEffect(() => {
    const loadRewardState = async () => {
      try {
        // 1. LOAD FROM LOCALSTORAGE FIRST (instant UX)
        console.log("📥 [Rewards] Loading from localStorage...");
        const savedStreak = localStorage.getItem("dailyStreak");
        const savedWeek = localStorage.getItem("currentRewardWeek");
        const savedLastClaim = localStorage.getItem("lastClaimDate");

        const localStreak = savedStreak ? parseInt(savedStreak, 10) || 0 : 0;
        const localWeek = savedWeek ? parseInt(savedWeek, 10) || 1 : 1;
        
        setDailyStreak(localStreak);
        setCurrentWeek(localWeek);
        if (savedLastClaim) setLastClaimDate(savedLastClaim);

        // 2. BACKGROUND SYNC WITH DATABASE (non-blocking)
        if (gameState?.telegramId) {
          console.log("📥 [Rewards] Fetching from database in background...");
          
          const dbState = await getRewardState(gameState.telegramId);
          
          if (dbState) {
            console.log("✅ [Rewards] Database state loaded:", dbState);
            
            // Use DB values (they're authoritative when available)
            setDailyStreak(dbState.dailyStreak);
            setCurrentWeek(dbState.currentRewardWeek);
            setLastClaimDate(dbState.lastDailyClaimDate);
            
            // Update localStorage cache
            localStorage.setItem("dailyStreak", dbState.dailyStreak.toString());
            localStorage.setItem("currentRewardWeek", dbState.currentRewardWeek.toString());
            if (dbState.lastDailyClaimDate) {
              localStorage.setItem("lastClaimDate", dbState.lastDailyClaimDate);
            }
            
            setDbSyncError(false);
          } else if (gameState.userId) {
            // No DB record exists - create one with localStorage values
            console.log("📤 [Rewards] Creating initial database record...");
            await upsertRewardState({
              telegramId: gameState.telegramId,
              userId: gameState.userId,
              dailyStreak: localStreak,
              currentRewardWeek: localWeek,
              lastDailyClaimDate: savedLastClaim,
              currentWeeklyPeriodStart: new Date().toISOString()
            });
            setDbSyncError(false);
          }
        }
      } catch (error) {
        console.error("❌ [Rewards] Failed to sync with database:", error);
        setDbSyncError(true);
        // Continue with localStorage values (local-first)
      }

      // Load NFTs and challenges (local for now)
      try {
        const savedNFTs = localStorage.getItem("ownedNFTs");
        const savedChallenges = localStorage.getItem("weeklyChallenges");

        if (savedNFTs) setOwnedNFTs(JSON.parse(savedNFTs));
        
        if (savedChallenges) {
          setWeeklyChallenges(JSON.parse(savedChallenges));
        } else {
          const defaultChallenges: WeeklyChallenge[] = [
            {
              key: "builder",
              name: "Builder Challenge",
              icon: "Hammer",
              description: "Upgrade 10 build parts this week",
              target: 10,
              progress: 0,
              reward: { type: "XP", amount: 5000 },
              claimed: false
            },
            {
              key: "recruiter",
              name: "Recruiter Challenge",
              icon: "Users",
              description: "Invite 3 new friends this week",
              target: 3,
              progress: 0,
              reward: { type: "BB", amount: 0.003 },
              claimed: false
            },
            {
              key: "converter",
              name: "Converter Challenge",
              icon: "ArrowLeftRight",
              description: "Convert 1,000,000 BZ to BB",
              target: 1000000,
              progress: 0,
              reward: { type: "BZ", amount: 2000 },
              claimed: false
            }
          ];
          setWeeklyChallenges(defaultChallenges);
          localStorage.setItem("weeklyChallenges", JSON.stringify(defaultChallenges));
        }
      } catch (error) {
        console.error("❌ [Rewards] Error loading local data:", error);
      }
      
      setLoading(false);
    };

    loadRewardState();
  }, [gameState?.telegramId, gameState?.userId]);

  useEffect(() => {
    if (loading || !gameState) return;
    
    try {
      setWeeklyChallenges(prevChallenges => 
        prevChallenges.map(challenge => {
          if (challenge.claimed) return challenge;
          
          if (challenge.key === "builder") {
            return { ...challenge, progress: Math.min(gameState.totalUpgrades || 0, challenge.target) };
          }
          if (challenge.key === "recruiter") {
            return { ...challenge, progress: Math.min(gameState.referralCount || 0, challenge.target) };
          }
          if (challenge.key === "converter") {
            return { ...challenge, progress: Math.min(gameState.totalConversions || 0, challenge.target) };
          }
          return challenge;
        })
      );
    } catch (error) {
      console.error("❌ [Rewards] Error updating challenge progress:", error);
    }
  }, [gameState?.totalUpgrades, gameState?.referralCount, gameState?.totalConversions, loading]);

  useEffect(() => {
    if (!loading && weeklyChallenges.length > 0) {
      try {
        localStorage.setItem("weeklyChallenges", JSON.stringify(weeklyChallenges));
      } catch (error) {
        console.error("❌ [Rewards] Error saving challenges:", error);
      }
    }
  }, [weeklyChallenges, loading]);

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
      key: "early_adopter",
      name: "Early Adopter",
      icon: "Star",
      description: "Welcome to Bunergy! Free for all players.",
      price: 0,
      requirement: "Free",
      requirementMet: true,
      owned: ownedNFTs.includes("early_adopter")
    },
    {
      key: "social_king",
      name: "Social King",
      icon: "Users",
      description: "Master of connections and community.",
      price: 2,
      requirement: "20 referrals",
      requirementMet: (gameState?.referralCount || 0) >= 20,
      owned: ownedNFTs.includes("social_king")
    },
    {
      key: "builder_pro",
      name: "Builder Pro",
      icon: "Hammer",
      description: "Expert in construction and upgrades.",
      price: 2,
      requirement: "Complete Stage 2",
      requirementMet: isStage2Complete(),
      owned: ownedNFTs.includes("builder_pro")
    },
    {
      key: "tap_legend",
      name: "Tap Legend",
      icon: "Zap",
      description: "Legendary tapping power unleashed.",
      price: 4,
      requirement: "Earn 10M BZ from tapping",
      requirementMet: (gameState?.totalTapIncome || 0) >= 10000000,
      owned: ownedNFTs.includes("tap_legend")
    },
    {
      key: "energy_master",
      name: "Energy Master",
      icon: "Trophy",
      description: "Perfect energy management achieved.",
      price: 3,
      requirement: "Max all energy boosters",
      requirementMet: areBoostersMaxed(),
      owned: ownedNFTs.includes("energy_master")
    },
    {
      key: "golden_bunny",
      name: "Golden Bunny",
      icon: "Crown",
      description: "The ultimate tapping achievement.",
      price: 5,
      requirement: "5M taps total",
      requirementMet: (gameState?.totalTaps || 0) >= 5000000,
      owned: ownedNFTs.includes("golden_bunny")
    },
    {
      key: "diamond_crystal",
      name: "Diamond Crystal",
      icon: "Trophy",
      description: "Reached the pinnacle of experience.",
      price: 7,
      requirement: "500k+ XP",
      requirementMet: (gameState?.xp || 0) >= 500000,
      owned: ownedNFTs.includes("diamond_crystal")
    }
  ];

  const handleDailyClaim = async () => {
    try {
      const today = new Date().toDateString();
      
      if (lastClaimDate === today) return;

      const nextDay = (dailyStreak % 7) + 1;
      const reward = dailyRewards[nextDay - 1];

      // 1. UPDATE LOCALSTORAGE FIRST (instant UX)
      const newStreak = nextDay;
      
      let newWeek = currentWeek;
      if (nextDay === 7) {
        newWeek = currentWeek + 1;
      }
      
      setDailyStreak(newStreak);
      setCurrentWeek(newWeek);
      setLastClaimDate(today);
      localStorage.setItem("dailyStreak", newStreak.toString());
      localStorage.setItem("currentRewardWeek", newWeek.toString());
      localStorage.setItem("lastClaimDate", today);

      // 2. UPDATE BALANCES
      if (reward.type === "BZ") {
        gameState.addBZ(reward.amount);
      } else if (reward.type === "BB") {
        gameState.addBB(reward.amount);
      } else if (reward.type === "XP") {
        gameState.addXP(reward.amount);
      }

      // 3. BACKGROUND SYNC TO DATABASE (non-blocking)
      if (gameState.telegramId) {
        try {
          console.log("📤 [Rewards] Syncing daily claim to database...");
          
          // Update streak
          await incrementDailyStreak(gameState.telegramId, newStreak);
          
          // Update last claim date
          await updateLastDailyClaimDate(gameState.telegramId, today);
          
          // Record the claim
          if (gameState.userId) {
            await claimDailyReward({
              telegramId: gameState.telegramId,
              userId: gameState.userId,
              day: nextDay,
              bzClaimed: reward.type === "BZ" ? reward.amount : 0,
              bbClaimed: reward.type === "BB" ? reward.amount : 0,
              xpClaimed: reward.type === "XP" ? reward.amount : 0
            });
          }
          
          console.log("✅ [Rewards] Daily claim synced to database");
          setDbSyncError(false);
        } catch (error) {
          console.error("❌ [Rewards] Failed to sync daily claim:", error);
          setDbSyncError(true);
        }
      }
    } catch (error) {
      console.error("❌ [Rewards] Error claiming daily reward:", error);
    }
  };

  const handleClaimChallenge = (challengeKey: string) => {
    try {
      setWeeklyChallenges(prevChallenges => 
        prevChallenges.map(challenge => {
          if (challenge.key === challengeKey && challenge.progress >= challenge.target && !challenge.claimed) {
            // 1. UPDATE BALANCES
            if (challenge.reward.type === "BZ") {
              gameState.addBZ(challenge.reward.amount);
            } else if (challenge.reward.type === "BB") {
              gameState.addBB(challenge.reward.amount);
            } else if (challenge.reward.type === "XP") {
              gameState.addXP(challenge.reward.amount);
            }
            
            // 2. BACKGROUND SYNC TO DATABASE (non-blocking)
            if (gameState.telegramId) {
              updateWeeklyChallengeProgress({
                telegramId: gameState.telegramId,
                userId: gameState.userId,
                challengeKey: challenge.key,
                progress: challenge.progress,
                isCompleted: true,
                claimed: true
              }).catch(err => {
                console.error("❌ [Rewards] Failed to sync challenge claim:", err);
                setDbSyncError(true);
              });
            }
            
            return { ...challenge, claimed: true };
          }
          return challenge;
        })
      );
    } catch (error) {
      console.error("❌ [Rewards] Error claiming challenge:", error);
    }
  };

  const handlePurchaseNFT = async (nft: NFT) => {
    try {
      if (nft.owned || !nft.requirementMet) return;
      
      // 1. UPDATE LOCALSTORAGE FIRST (instant UX)
      if (nft.price === 0) {
        const updated = [...ownedNFTs, nft.key];
        setOwnedNFTs(updated);
        localStorage.setItem("ownedNFTs", JSON.stringify(updated));
        
        // 2. BACKGROUND SYNC TO DATABASE (non-blocking)
        if (gameState.telegramId) {
          purchaseNFT({
            telegramId: gameState.telegramId,
            userId: gameState.userId,
            nftId: nft.key,
            pricePaid: 0
          }).catch(err => {
            console.error("❌ [Rewards] Failed to sync NFT claim:", err);
            setDbSyncError(true);
          });
        }
        return;
      }

      if (gameState.bb >= nft.price && gameState.subtractBB(nft.price)) {
        const updated = [...ownedNFTs, nft.key];
        setOwnedNFTs(updated);
        localStorage.setItem("ownedNFTs", JSON.stringify(updated));
        
        // 2. BACKGROUND SYNC TO DATABASE (non-blocking)
        if (gameState.telegramId) {
          purchaseNFT({
            telegramId: gameState.telegramId,
            userId: gameState.userId,
            nftId: nft.key,
            pricePaid: nft.price
          }).catch(err => {
            console.error("❌ [Rewards] Failed to sync NFT purchase:", err);
            setDbSyncError(true);
          });
        }
      }
    } catch (error) {
      console.error("❌ [Rewards] Error purchasing NFT:", error);
    }
  };

  const canClaimDaily = lastClaimDate !== new Date().toDateString();
  const currentDayReward = dailyRewards[(dailyStreak % 7)];

  const getProgressText = (nft: NFT): string => {
    if (nft.owned) return "";
    
    switch (nft.key) {
      case "early_adopter":
        return "Always Available";
      case "social_king":
        return `${gameState?.referralCount || 0} / 20 referrals`;
      case "builder_pro":
        return isStage2Complete() ? "Stage 2 Complete ✓" : "Stage 2 Incomplete";
      case "tap_legend":
        return `${((gameState?.totalTapIncome || 0) / 1000000).toFixed(1)}M / 10M BZ`;
      case "energy_master":
        return areBoostersMaxed() ? "All Boosters Maxed ✓" : "Boosters Not Maxed";
      case "golden_bunny":
        return `${((gameState?.totalTaps || 0) / 1000000).toFixed(1)}M / 5M taps`;
      case "diamond_crystal":
        return `${((gameState?.xp || 0) / 1000).toFixed(0)}k / 500k XP`;
      default:
        return "";
    }
  };

  const getProgressPercent = (nft: NFT): number => {
    if (nft.owned || nft.requirementMet) return 100;
    
    switch (nft.key) {
      case "early_adopter":
        return 100;
      case "social_king":
        return Math.min(((gameState?.referralCount || 0) / 20) * 100, 100);
      case "builder_pro":
        return isStage2Complete() ? 100 : 0;
      case "tap_legend":
        return Math.min(((gameState?.totalTapIncome || 0) / 10000000) * 100, 100);
      case "energy_master":
        return areBoostersMaxed() ? 100 : 0;
      case "golden_bunny":
        return Math.min(((gameState?.totalTaps || 0) / 5000000) * 100, 100);
      case "diamond_crystal":
        return Math.min(((gameState?.xp || 0) / 500000) * 100, 100);
      default:
        return 0;
    }
  };

  const shouldShowProgressBar = (nft: NFT): boolean => {
    if (nft.owned) return false;
    return ["social_king", "tap_legend", "golden_bunny", "diamond_crystal"].includes(nft.key);
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
      {dbSyncError && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-sm">
          <p className="text-yellow-800 dark:text-yellow-200">
            ⚠️ Offline – changes will sync when connection is restored
          </p>
        </div>
      )}

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
                Day {(dailyStreak % 7) + 1}/7
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dailyRewards.map((reward, index) => {
              const dayNum = index + 1;
              const isClaimed = dailyStreak >= dayNum;
              const isCurrent = (dailyStreak % 7) + 1 === dayNum;

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Exclusive NFTs</h3>
            </div>
            <Badge variant="outline">
              {ownedNFTs.length}/{nfts.length} Owned
            </Badge>
          </div>

          <div className="space-y-8">
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
        </div>
      </Card>
    </div>
  );
}