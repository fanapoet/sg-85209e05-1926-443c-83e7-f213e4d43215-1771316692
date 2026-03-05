import React, { useState, useEffect, useMemo } from "react";
import { useGameState } from "@/contexts/GameStateContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Trophy, Zap, Target, Users, ArrowLeftRight, Hammer, Coins, Gift, Sparkles, TrendingUp, Award, CheckCircle2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { 
  loadWeeklyChallenges, 
  initializeWeeklyChallenges, 
  updateChallengeProgress,
  claimChallengeReward,
  resetWeeklyChallenges,
  type ChallengeKey,
  type WeeklyChallengeData
} from "@/services/weeklyChallengeSyncService";

type NFT = Database["public"]["Tables"]["nfts"]["Row"];

interface WeeklyChallenge {
  key: ChallengeKey;
  name: string;
  icon: string;
  description: string;
  target: number;
  progress: number;
  reward: { type: "XP" | "BB"; amount: number };
  claimed: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Zap, Target, Users, ArrowLeftRight, Hammer, Coins, Gift, Sparkles, TrendingUp, Award
};

export function RewardsNFTsScreen() {
  const {
    bz,
    bb,
    totalUpgrades, 
    referralCount, 
    totalConversions, 
    totalConversionEvents,
    totalTapIncome, 
    totalTaps, 
    xp, 
    bb: playerBB,
    addXP, 
    addBB,
    currentWeeklyPeriodStart,
    resetWeeklyPeriod,
    telegramId,
    userId
  } = useGameState();

  const [nfts, setNfts] = useState<NFT[]>([]);
  const [ownedNFTs, setOwnedNFTs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"challenges" | "nfts">("challenges");

  // Weekly Challenges State (now synced with database)
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallengeData[]>([]);
  const [challengesLoaded, setChallengesLoaded] = useState(false);

  // Initialize Weekly Challenges from Database
  useEffect(() => {
    async function initChallenges() {
      if (!userId || !telegramId || challengesLoaded) return;

      try {
        console.log("🔄 [RewardsNFTs] Loading weekly challenges from database...");
        
        // Load existing challenges
        let challenges = await loadWeeklyChallenges(userId, telegramId);

        // If no challenges exist for current week, initialize them
        if (challenges.length === 0) {
          console.log("📝 [RewardsNFTs] No challenges found, initializing...");
          
          // Migrate from localStorage if exists
          const localBaselines = localStorage.getItem("weeklyBaselines");
          let baselines = {
            taps: totalTaps || 0,
            upgrades: totalUpgrades || 0,
            conversionEvents: totalConversionEvents || 0,
            referrals: referralCount || 0
          };

          // Use localStorage baselines if available (migration)
          if (localBaselines) {
            const parsed = JSON.parse(localBaselines);
            baselines = {
              taps: parsed.taps || totalTaps || 0,
              upgrades: parsed.upgrades || totalUpgrades || 0,
              conversionEvents: parsed.conversionEvents || totalConversionEvents || 0,
              referrals: parsed.referrals || referralCount || 0
            };
            console.log("📦 [RewardsNFTs] Migrated baselines from localStorage:", baselines);
          }

          challenges = await initializeWeeklyChallenges(userId, telegramId, baselines);
        }

        setWeeklyChallenges(challenges);
        setChallengesLoaded(true);
        console.log("✅ [RewardsNFTs] Challenges loaded:", challenges);

      } catch (error) {
        console.error("❌ [RewardsNFTs] Failed to load challenges:", error);
      }
    }

    initChallenges();
  }, [userId, telegramId, challengesLoaded]);

  // Update Challenge Progress (syncs with database)
  useEffect(() => {
    if (!userId || !challengesLoaded || weeklyChallenges.length === 0) return;

    async function syncProgress() {
      const updates: Array<{ key: ChallengeKey; progress: number; completed: boolean }> = [];

      weeklyChallenges.forEach((challenge) => {
        let newProgress = 0;

        // Calculate progress based on challenge type
        switch (challenge.challengeKey) {
          case "tapper":
            newProgress = Math.max(0, (totalTaps || 0) - challenge.baselineValue);
            break;
          case "builder":
            newProgress = Math.max(0, (totalUpgrades || 0) - challenge.baselineValue);
            break;
          case "converter":
            // FIX: Use delta from baseline, not absolute totalConversionEvents
            newProgress = Math.max(0, (totalConversionEvents || 0) - challenge.baselineValue);
            
            // DEBUG: Log the calculation
            console.log("🐛 [Exchange Guru Debug]", {
              totalConversionEvents,
              baseline: challenge.baselineValue,
              newProgress,
              target: challenge.targetValue,
              isCompleted: newProgress >= challenge.targetValue
            });
            break;
          case "recruiter":
            newProgress = Math.max(0, (referralCount || 0) - challenge.baselineValue);
            break;
        }

        // Check if progress changed or completion status changed
        const wasCompleted = challenge.completed;
        const isCompleted = newProgress >= challenge.targetValue;

        if (newProgress !== challenge.currentProgress || wasCompleted !== isCompleted) {
          updates.push({
            key: challenge.challengeKey,
            progress: newProgress,
            completed: isCompleted
          });
        }
      });

      // Batch update all changed challenges
      if (updates.length > 0) {
        console.log("🔄 [RewardsNFTs] Syncing challenge progress:", updates);

        for (const update of updates) {
          await updateChallengeProgress(userId, update.key, update.progress, update.completed);
        }

        // Reload challenges to get updated state
        const freshChallenges = await loadWeeklyChallenges(userId, telegramId!);
        setWeeklyChallenges(freshChallenges);
      }
    }

    syncProgress();
  }, [userId, telegramId, totalTaps, totalUpgrades, totalConversionEvents, referralCount, challengesLoaded, weeklyChallenges]);

  // Check for Weekly Reset
  useEffect(() => {
    async function checkWeeklyReset() {
      if (!userId || !telegramId || !challengesLoaded) return;

      const currentWeekStartDate = new Date();
      const day = currentWeekStartDate.getDay();
      const diff = currentWeekStartDate.getDate() - day + (day === 0 ? -6 : 1);
      currentWeekStartDate.setDate(diff);
      currentWeekStartDate.setHours(0, 0, 0, 0);
      const weekStartISO = currentWeekStartDate.toISOString().split("T")[0];

      // Check if we need to reset (week has changed)
      if (weeklyChallenges.length > 0 && weeklyChallenges[0].weekStartDate !== weekStartISO) {
        console.log("🔄 [RewardsNFTs] Week changed, resetting challenges...");
        
        // Reset with current values as new baselines
        await resetWeeklyChallenges(userId, telegramId, {
          taps: totalTaps || 0,
          upgrades: totalUpgrades || 0,
          conversionEvents: totalConversionEvents || 0,
          referrals: referralCount || 0
        });

        // Reload challenges
        const freshChallenges = await loadWeeklyChallenges(userId, telegramId);
        setWeeklyChallenges(freshChallenges);
        
        // Update context
        resetWeeklyPeriod();
      }
    }

    checkWeeklyReset();
  }, [userId, telegramId, challengesLoaded, weeklyChallenges]);

  // Convert database format to UI format
  const uiChallenges: WeeklyChallenge[] = useMemo(() => {
    const challengeDefinitions: Record<ChallengeKey, { name: string; icon: string; description: string; reward: { type: "XP" | "BB"; amount: number } }> = {
      tapper: { name: "Tap Master", icon: "Zap", description: "Tap 100,000 times", reward: { type: "XP", amount: 5000 } },
      builder: { name: "Builder", icon: "Hammer", description: "Buy 10 upgrades", reward: { type: "XP", amount: 5000 } },
      converter: { name: "Exchange Guru", icon: "ArrowLeftRight", description: "Convert 10 times", reward: { type: "XP", amount: 5000 } },
      recruiter: { name: "Networker", icon: "Users", description: "Invite 5 friends", reward: { type: "BB", amount: 1000 } }
    };

    return weeklyChallenges.map((challenge) => {
      const def = challengeDefinitions[challenge.challengeKey];
      return {
        key: challenge.challengeKey,
        name: def.name,
        icon: def.icon,
        description: def.description,
        target: challenge.targetValue,
        progress: challenge.currentProgress,
        reward: def.reward,
        claimed: challenge.claimed
      };
    });
  }, [weeklyChallenges]);

  // Handle Challenge Claim
  const handleClaimChallenge = async (challengeKey: ChallengeKey, reward: { type: "XP" | "BB"; amount: number }) => {
    if (!userId) return;

    try {
      console.log("🎁 [RewardsNFTs] Claiming challenge:", challengeKey);

      // Claim in database
      const success = await claimChallengeReward(userId, challengeKey);
      
      if (success) {
        // Add reward
        if (reward.type === "XP") {
          addXP(reward.amount);
        } else {
          addBB(reward.amount);
        }

        // Reload challenges
        const freshChallenges = await loadWeeklyChallenges(userId, telegramId!);
        setWeeklyChallenges(freshChallenges);
        
        console.log("✅ [RewardsNFTs] Challenge claimed successfully");
      }
    } catch (error) {
      console.error("❌ [RewardsNFTs] Claim failed:", error);
    }
  };

  // Fetch NFTs from Database
  useEffect(() => {
    async function fetchNFTs() {
      if (!userId) return;

      try {
        setLoading(true);

        const { data: nftsData, error: nftsError } = await supabase
          .from("nfts")
          .select("*")
          .order("price_bb", { ascending: true });

        if (nftsError) throw nftsError;

        const { data: userNFTsData, error: userNFTsError } = await supabase
          .from("user_nfts")
          .select("nft_id")
          .eq("user_id", userId);

        if (userNFTsError) throw userNFTsError;

        setNfts(nftsData || []);
        setOwnedNFTs(new Set((userNFTsData || []).map((un) => un.nft_id)));
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchNFTs();
  }, [userId]);

  const handlePurchaseNFT = async (nft: NFT) => {
    if (!userId || playerBB < nft.price_bb) return;

    try {
      const { error } = await supabase.from("user_nfts").insert({
        user_id: userId,
        nft_id: nft.id,
        telegram_id: telegramId || 0
      });

      if (error) throw error;

      addBB(-nft.price_bb);
      setOwnedNFTs((prev) => new Set([...prev, nft.id]));
    } catch (error) {
      console.error("Error purchasing NFT:", error);
    }
  };

  const canPurchaseNFT = (nft: NFT): boolean => {
    if (ownedNFTs.has(nft.id)) return false;
    if (playerBB < nft.price_bb) return false;

    switch (nft.requirement_type) {
      case "xp":
        return xp >= nft.requirement_value;
      case "referrals":
        return referralCount >= nft.requirement_value;
      case "upgrades":
        return totalUpgrades >= nft.requirement_value;
      case "taps":
        return totalTaps >= nft.requirement_value;
      default:
        return true;
    }
  };

  const getRequirementText = (nft: NFT): string => {
    switch (nft.requirement_type) {
      case "xp":
        return `${nft.requirement_value.toLocaleString()} XP`;
      case "referrals":
        return `${nft.requirement_value} referrals`;
      case "upgrades":
        return `${nft.requirement_value} upgrades`;
      case "taps":
        return `${nft.requirement_value.toLocaleString()} taps`;
      default:
        return "None";
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      <div className="flex gap-2 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800">
        <Button
          variant={selectedTab === "challenges" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setSelectedTab("challenges")}
        >
          <Trophy className="w-4 h-4 mr-2" />
          Weekly Challenges
        </Button>
        <Button
          variant={selectedTab === "nfts" ? "default" : "outline"}
          className="flex-1"
          onClick={() => setSelectedTab("nfts")}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          NFT Collection
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {selectedTab === "challenges" && (
            <>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Weekly Challenges
                </h2>
                <p className="text-purple-100">Complete challenges to earn XP and BB rewards!</p>
              </div>

              {uiChallenges.length === 0 ? (
                <Card className="p-6">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-8 h-8" />
                    <p>Loading challenges...</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {uiChallenges.map((challenge) => {
                    const Icon = iconMap[challenge.icon] || Trophy;
                    const progress = Math.min(challenge.progress, challenge.target);
                    const percentage = (progress / challenge.target) * 100;
                    const isCompleted = progress >= challenge.target;

                    return (
                      <Card key={challenge.key} className="p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            <Icon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-lg">{challenge.name}</h3>
                              {isCompleted && !challenge.claimed && (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                              )}
                              {challenge.claimed && (
                                <Award className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                            
                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{progress.toLocaleString()} / {challenge.target.toLocaleString()}</span>
                                <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm">
                                <Gift className="w-4 h-4 text-purple-500" />
                                <span className="font-medium">
                                  {challenge.reward.amount.toLocaleString()} {challenge.reward.type}
                                </span>
                              </div>

                              {challenge.claimed ? (
                                <Button size="sm" variant="outline" disabled>
                                  <Award className="w-4 h-4 mr-2" />
                                  Claimed
                                </Button>
                              ) : isCompleted ? (
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                  onClick={() => handleClaimChallenge(challenge.key, challenge.reward)}
                                >
                                  <Gift className="w-4 h-4 mr-2" />
                                  Claim
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Locked
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {selectedTab === "nfts" && (
            <>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg p-6 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  NFT Collection
                </h2>
                <p className="text-blue-100">Collect exclusive NFTs to boost your stats!</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    <span className="font-bold">{playerBB.toLocaleString()} BB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-bold">{ownedNFTs.size} / {nfts.length} Owned</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <Card className="p-6">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 animate-spin" />
                    <p>Loading NFTs...</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {nfts.map((nft) => {
                    const owned = ownedNFTs.has(nft.id);
                    const canBuy = canPurchaseNFT(nft);

                    return (
                      <Card key={nft.id} className={`p-4 ${owned ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-500" : "bg-white/90 dark:bg-gray-800/90"} backdrop-blur-sm border-2 transition-all`}>
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${owned ? "bg-green-500" : "bg-gradient-to-br from-blue-500 to-purple-500"} text-white`}>
                            <Sparkles className="w-8 h-8" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">{nft.name}</h3>
                              {owned && <Award className="w-5 h-5 text-green-500" />}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">{nft.description}</p>

                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-bold flex items-center gap-1">
                                  <Coins className="w-4 h-4" />
                                  {nft.price_bb.toLocaleString()} BB
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Requirement:</span>
                                <span className="font-medium">{getRequirementText(nft)}</span>
                              </div>
                            </div>

                            {owned ? (
                              <Button className="w-full bg-green-500 hover:bg-green-600" disabled>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Owned
                              </Button>
                            ) : (
                              <Button
                                className="w-full"
                                onClick={() => handlePurchaseNFT(nft)}
                                disabled={!canBuy}
                              >
                                {canBuy ? (
                                  <>
                                    <Coins className="w-4 h-4 mr-2" />
                                    Purchase
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Locked
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}