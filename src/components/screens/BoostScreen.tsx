import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Zap, Battery, RefreshCw, Lock, Info } from "lucide-react";

interface Booster {
  key: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  effect: string;
  baseCost: number;
}

const boosters: Booster[] = [
  {
    key: "incomePerTap",
    name: "Income per Tap",
    icon: TrendingUp,
    description: "Increases BZ earned per tap",
    effect: "+1 BZ per level",
    baseCost: 500
  },
  {
    key: "energyPerTap",
    name: "Energy per Tap",
    icon: Zap,
    description: "Increases energy cost per tap (scales income)",
    effect: "+1 energy cost per level",
    baseCost: 800
  },
  {
    key: "energyCapacity",
    name: "Energy Capacity",
    icon: Battery,
    description: "Increases maximum energy",
    effect: "+100 max energy per level",
    baseCost: 1000
  },
  {
    key: "recoveryRate",
    name: "Recovery Rate",
    icon: RefreshCw,
    description: "Increases energy regeneration speed",
    effect: "+0.05/sec per level",
    baseCost: 1200
  }
];

export function BoostScreen() {
  const { bz, bzPerHour, referralCount, subtractBZ, tier, setMaxEnergy, energy, maxEnergy } = useGameState();
  const [boosterLevels, setBoosterLevels] = useState<Record<string, number>>({
    incomePerTap: 1,
    energyPerTap: 1,
    energyCapacity: 1,
    recoveryRate: 1
  });

  useEffect(() => {
    const saved = localStorage.getItem("boosters");
    if (saved) {
      setBoosterLevels(JSON.parse(saved));
    }
  }, []);

  const saveBoosterLevels = (levels: Record<string, number>) => {
    setBoosterLevels(levels);
    localStorage.setItem("boosters", JSON.stringify(levels));
  };

  const calculateCost = (booster: Booster, currentLevel: number): number => {
    return Math.floor(booster.baseCost * Math.pow(1 + currentLevel, 2) + 1.2 * bzPerHour);
  };

  const getReferralGate = (booster: Booster, currentLevel: number): number | null => {
    if (booster.key === "incomePerTap") return null;
    if (currentLevel < 2) return null;
    if (currentLevel === 2) return 3;
    if (currentLevel === 3 || currentLevel === 4) return 5;
    return 7;
  };

  const canUpgrade = (booster: Booster, currentLevel: number): boolean => {
    const cost = calculateCost(booster, currentLevel);
    if (bz < cost) return false;

    const gate = getReferralGate(booster, currentLevel);
    if (gate !== null && referralCount < gate) return false;

    return true;
  };

  const handleUpgrade = (booster: Booster) => {
    const currentLevel = boosterLevels[booster.key];
    const cost = calculateCost(booster, currentLevel);

    if (!canUpgrade(booster, currentLevel)) return;

    if (subtractBZ(cost)) {
      const newLevels = { ...boosterLevels, [booster.key]: currentLevel + 1 };
      saveBoosterLevels(newLevels);

      // CRITICAL FIX: Apply Energy Capacity upgrade immediately to global state
      if (booster.key === "energyCapacity") {
        const newMaxEnergy = 1500 + (currentLevel + 1 - 1) * 100;
        setMaxEnergy(newMaxEnergy);
      }
    }
  };

  const getMilestoneProgress = (): { current: number; next: number; bonus: number } => {
    if (bzPerHour < 10000) {
      return { current: bzPerHour, next: 10000, bonus: 100 };
    } else if (bzPerHour < 100000) {
      return { current: bzPerHour, next: 100000, bonus: 1000 };
    } else {
      return { current: bzPerHour, next: 100000, bonus: 1000 };
    }
  };

  const milestone = getMilestoneProgress();
  const milestonePercent = Math.min((milestone.current / milestone.next) * 100, 100);

  const getTierBonus = (): number => {
    if (tier === "Bronze") return 0;
    if (tier === "Silver") return 5;
    if (tier === "Gold") return 15;
    if (tier === "Platinum") return 25;
    if (tier === "Diamond") return 40;
    return 0;
  };

  const tierBonus = getTierBonus();

  const getReferralLadder = (): string => {
    if (referralCount < 3) return "0/3";
    if (referralCount < 5) return "3/5";
    if (referralCount < 7) return "5/7";
    return "7/7";
  };

  const getBoosterLevel = (key: string): number => {
    try {
      if (typeof window === "undefined") return 1;
      const saved = localStorage.getItem("boosters");
      if (!saved) return 1;
      const data = JSON.parse(saved);
      return data[key] || 1;
    } catch {
      return 1;
    }
  };

  const capacityLevel = getBoosterLevel("energyCapacity");
  const actualMaxEnergy = 1500 + (capacityLevel - 1) * 100;

  // Referral requirements for Energy boosters
  const getReferralRequirement = (boosterKey: string, level: number): number | null => {
    if (!boosterKey.startsWith("energy")) return null;
    
    // Energy boosters: L1-L2 free, L3+ require referrals
    if (level < 2) return null;
    if (level === 2) return 3;
    if (level === 3 || level === 4) return 5;
    return 7;
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      {/* Info Block (Non-closable) - FIXED: Now shows correct bzPerHour from Build */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 flex-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Balance:</span>
              <span className="font-bold">{bz.toLocaleString()} BZ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">BZ per Hour:</span>
              <span className="font-bold">
                {bzPerHour.toFixed(1)} BZ/h
                {tierBonus > 0 && <span className="text-green-600 dark:text-green-400 ml-1">(+{tierBonus}%)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Referrals Progress:</span>
              <Badge variant="secondary">{getReferralLadder()}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Energy:</span>
              <span className="font-bold">{Math.floor(energy)} / {actualMaxEnergy}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Income per Tap Milestone */}
      {boosterLevels.incomePerTap > 0 && bzPerHour < 100000 && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Milestone Progress</span>
              <span className="text-muted-foreground">
                {milestone.current.toLocaleString()} / {milestone.next.toLocaleString()} BZ/h
              </span>
            </div>
            <Progress value={milestonePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Next upgrade grants +{milestone.bonus} BZ per tap when reached
            </p>
          </div>
        </Card>
      )}

      {/* Boosters */}
      <div className="space-y-3">
        {boosters.map((booster) => {
          const Icon = booster.icon;
          const currentLevel = boosterLevels[booster.key];
          const cost = calculateCost(booster, currentLevel);
          const gate = getReferralGate(booster, currentLevel);
          const upgradeable = canUpgrade(booster, currentLevel);

          return (
            <Card key={booster.key} className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{booster.name}</h3>
                      <p className="text-xs text-muted-foreground">{booster.description}</p>
                    </div>
                    <Badge variant="outline">L{currentLevel}</Badge>
                  </div>

                  <div className="text-sm">
                    <span className="text-muted-foreground">{booster.effect}</span>
                  </div>

                  {gate !== null && referralCount < gate && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <Lock className="h-4 w-4" />
                      <span>Requires {gate} referrals (current: {referralCount})</span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleUpgrade(booster)}
                    disabled={!upgradeable}
                    className="w-full"
                    variant={upgradeable ? "default" : "secondary"}
                  >
                    {gate !== null && referralCount < gate ? (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Locked
                      </>
                    ) : bz < cost ? (
                      `Need ${cost.toLocaleString()} BZ`
                    ) : (
                      `Upgrade for ${cost.toLocaleString()} BZ`
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}