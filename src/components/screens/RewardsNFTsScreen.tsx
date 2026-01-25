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

const dailyRewards: DailyReward[] = [
  { day: 1, type: "BZ", amount: 1000 },
  { day: 2, type: "BZ", amount: 2000 },
  { day: 3, type: "BB", amount: 0.001 },
  { day: 4, type: "XP", amount: 500 },
  { day: 5, type: "BZ", amount: 5000 },
  { day: 6, type: "BB", amount: 0.002 },
  { day: 7, type: "XP", amount: 1000 }
];

const getIconComponent = (iconName: string) => {
  const icons: Record<string, any> = {
    Hammer, Users, ArrowLeftRight, Star, Zap, Trophy, Crown
  };
  return icons[iconName] || Star;
};

export function RewardsNFTsScreen() {
  const gameState = useGameState();
  
  // State
  const [dailyStreak, setDailyStreak] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<string[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Load saved state
  useEffect(() => {
    try {
      const savedStreak = localStorage.getItem("dailyStreak");
      const savedLastClaim = localStorage.getItem("lastClaimDate");
      const savedNFTs = localStorage.getItem("ownedNFTs");
      const savedChallenges = localStorage.getItem("weeklyChallenges");

      if (savedStreak) setDailyStreak(parseInt(savedStreak, 10) || 0);
      if (savedLastClaim) setLastClaimDate(savedLastClaim);
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
            reward: { type: "BZ", amount: 10000 },
            claimed: false
          },
          {
            key: "recruiter",
            name: "Recruiter Challenge",
            icon: "Users",
            description: "Invite 3 new friends this week",
            target: 3,
            progress: 0,
            reward: { type: "XP", amount: 2000 },
            claimed: false
          },
          {
            key: "converter",
            name: "Converter Challenge",
            icon: "ArrowLeftRight",
            description: "Convert 1,000,000 BZ to BB",
            target: 1000000,
            progress: 0,
            reward: { type: "BB", amount: 0.005 },
            claimed: false
          }
        ];
        setWeeklyChallenges(defaultChallenges);
        localStorage.setItem("weeklyChallenges", JSON.stringify(defaultChallenges));
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading rewards data:", error);
      setLoading(false);
    }
  }, []);

  // Update weekly challenges progress
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
      console.error("Error updating challenge progress:", error);
    }
  }, [gameState?.totalUpgrades, gameState?.referralCount, gameState?.totalConversions, loading]);

  // Save weekly challenges
  useEffect(() => {
    if (!loading && weeklyChallenges.length > 0) {
      try {
        localStorage.setItem("weeklyChallenges", JSON.stringify(weeklyChallenges));
      } catch (error) {
        console.error("Error saving challenges:", error);
      }
    }
  }, [weeklyChallenges, loading]);

  // Check Stage 2 completion
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

  // Check if boosters are maxed
  const areBoostersMaxed = (): boolean => {
    try {
      const boosters = localStorage.getItem("boosters");
      if (!boosters) return false;
      
      const data = JSON.parse(boosters);
      return (data.energyCapacity >= 10 && data.recoveryRate >= 10);
    } catch {
      return false;
    }
  };

  // NFT definitions
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

  const handleDailyClaim = () => {
    try {
      const today = new Date().toDateString();
      
      if (lastClaimDate === today) return;

      const nextDay = (dailyStreak % 7) + 1;
      const reward = dailyRewards[nextDay - 1];

      if (reward.type === "BZ") {
        gameState.addBZ(reward.amount);
      } else if (reward.type === "BB") {
        gameState.addBB(reward.amount);
      } else if (reward.type === "XP") {
        gameState.addXP(reward.amount);
      }

      const newStreak = nextDay;
      setDailyStreak(newStreak);
      setLastClaimDate(today);
      localStorage.setItem("dailyStreak", newStreak.toString());
      localStorage.setItem("lastClaimDate", today);
    } catch (error) {
      console.error("Error claiming daily reward:", error);
    }
  };

  const handleClaimChallenge = (challengeKey: string) => {
    try {
      setWeeklyChallenges(prevChallenges => 
        prevChallenges.map(challenge => {
          if (challenge.key === challengeKey && challenge.progress >= challenge.target && !challenge.claimed) {
            if (challenge.reward.type === "BZ") {
              gameState.addBZ(challenge.reward.amount);
            } else if (challenge.reward.type === "BB") {
              gameState.addBB(challenge.reward.amount);
            } else if (challenge.reward.type === "XP") {
              gameState.addXP(challenge.reward.amount);
            }
            
            return { ...challenge, claimed: true };
          }
          return challenge;
        })
      );
    } catch (error) {
      console.error("Error claiming challenge:", error);
    }
  };

  const handlePurchaseNFT = (nft: NFT) => {
    try {
      if (nft.owned || !nft.requirementMet) return;
      
      if (nft.price === 0) {
        const updated = [...ownedNFTs, nft.key];
        setOwnedNFTs(updated);
        localStorage.setItem("ownedNFTs", JSON.stringify(updated));
        return;
      }

      if (gameState.bb >= nft.price && gameState.subtractBB(nft.price)) {
        const updated = [...ownedNFTs, nft.key];
        setOwnedNFTs(updated);
        localStorage.setItem("ownedNFTs", JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Error purchasing NFT:", error);
    }
  };

  const canClaimDaily = lastClaimDate !== new Date().toDateString();
  const currentDayReward = dailyRewards[dailyStreak % 7];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading rewards...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Rewards & NFTs</h1>
        <p className="text-sm text-muted-foreground">
          Claim daily rewards, complete challenges, and collect exclusive NFTs
        </p>
      </div>

      {/* Daily Rewards */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Daily Rewards</h3>
            </div>
            <Badge variant="outline">
              Day {(dailyStreak % 7) + 1}/7
            </Badge>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dailyRewards.map((reward, index) => {
              const dayNum = index + 1;
              const isClaimed = dailyStreak >= dayNum && dailyStreak < dayNum + 7;
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
                  {isClaimed && !isCurrent ? (
                    <Check className="h-4 w-4 mx-auto text-green-600" />
                  ) : (
                    <p className="text-xs font-bold">
                      {reward.type === "BB" ? reward.amount.toFixed(3) : reward.amount.toLocaleString()} {reward.type}
                    </p>
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

      {/* Weekly Challenges */}
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
                    <div className={`p-2 rounded-lg ${challenge.claimed ? "bg-green-500/10" : "bg-primary/10"}`}>
                      <Icon className={`h-5 w-5 ${challenge.claimed ? "text-green-500" : "text-primary"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{challenge.name}</h4>
                        {challenge.claimed && (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {challenge.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-3 w-3 text-green-600" />
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

      {/* NFTs */}
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

          <div className="space-y-3">
            {nfts.map((nft) => {
              const Icon = getIconComponent(nft.icon);

              return (
                <Card
                  key={nft.key}
                  className={`p-4 ${
                    nft.owned
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : !nft.requirementMet
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-lg ${nft.owned ? "bg-green-500/20" : "bg-primary/10"}`}>
                      <Icon className={`h-6 w-6 ${nft.owned ? "text-green-600" : "text-primary"}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{nft.name}</h4>
                        {nft.owned && (
                          <Badge variant="default" className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Owned
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {nft.description}
                      </p>

                      {/* Progress Display */}
                      {!nft.owned && (
                        <div className="mb-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className={nft.requirementMet ? "text-green-600 font-semibold" : "font-medium"}>
                              {nft.key === "social_king" && `${gameState?.referralCount || 0} / 20 referrals`}
                              {nft.key === "builder_pro" && (isStage2Complete() ? "Stage 2 Complete ✓" : "Stage 2 Incomplete")}
                              {nft.key === "tap_legend" && `${((gameState?.totalTapIncome || 0) / 1000000).toFixed(1)}M / 10M BZ`}
                              {nft.key === "energy_master" && (areBoostersMaxed() ? "All Boosters Maxed ✓" : "Boosters Not Maxed")}
                              {nft.key === "golden_bunny" && `${((gameState?.totalTaps || 0) / 1000000).toFixed(1)}M / 5M taps`}
                              {nft.key === "diamond_crystal" && `${((gameState?.xp || 0) / 1000).toFixed(0)}k / 500k XP`}
                              {nft.key === "early_adopter" && "Always Available"}
                            </span>
                          </div>
                          {nft.key === "social_king" && (
                            <Progress value={Math.min(((gameState?.referralCount || 0) / 20) * 100, 100)} className="h-2" />
                          )}
                          {nft.key === "tap_legend" && (
                            <Progress value={Math.min(((gameState?.totalTapIncome || 0) / 10000000) * 100, 100)} className="h-2" />
                          )}
                          {nft.key === "golden_bunny" && (
                            <Progress value={Math.min(((gameState?.totalTaps || 0) / 5000000) * 100, 100)} className="h-2" />
                          )}
                          {nft.key === "diamond_crystal" && (
                            <Progress value={Math.min(((gameState?.xp || 0) / 500000) * 100, 100)} className="h-2" />
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          {nft.requirementMet ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-orange-600" />
                          )}
                          <span className={nft.requirementMet ? "text-green-600 font-medium" : "text-orange-600"}>
                            {nft.requirement}
                          </span>
                        </div>
                        <Badge variant="outline">
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
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}