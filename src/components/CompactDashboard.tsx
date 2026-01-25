import { useGameState } from "@/contexts/GameStateContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, TrendingUp } from "lucide-react";

export function CompactDashboard() {
  const { bz, bb, energy, tier, referralCount, xp, bzPerHour } = useGameState();

  // Get booster levels to calculate actual max energy
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

  const formatBZ = (value: number) => {
    return Math.floor(value).toLocaleString("en-US");
  };

  const formatBB = (value: number) => {
    return value.toFixed(6);
  };

  const formatRate = (value: number) => {
    return value.toFixed(1);
  };

  const getTierBonus = (tierName: string): number => {
    const bonuses: Record<string, number> = {
      "Bronze": 0,
      "Silver": 5,
      "Gold": 15,
      "Platinum": 25,
      "Diamond": 40
    };
    return bonuses[tierName] || 0;
  };

  const getTierColor = (tierName: string): string => {
    const colors: Record<string, string> = {
      "Bronze": "bg-amber-700 text-white",
      "Silver": "bg-slate-400 text-slate-900",
      "Gold": "bg-yellow-500 text-yellow-900",
      "Platinum": "bg-cyan-400 text-cyan-900",
      "Diamond": "bg-blue-500 text-white"
    };
    return colors[tierName] || "bg-secondary text-secondary-foreground";
  };

  const tierBonus = getTierBonus(tier);
  const energyPercent = (energy / actualMaxEnergy) * 100;

  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="p-3 space-y-2">
        {/* First Row: BZ, BB, XP Tier, Referrals */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="font-bold text-base text-foreground font-mono">{formatBZ(bz)}</span>
              <span className="text-muted-foreground ml-1 text-xs font-semibold">BZ</span>
            </div>
            <div className="text-sm">
              <span className="font-bold text-base text-foreground font-mono">{formatBB(bb)}</span>
              <span className="text-muted-foreground ml-1 text-xs font-semibold">BB</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground font-semibold">XP:</span>
              <span className="font-mono font-bold text-foreground">{Math.floor(xp).toLocaleString()}</span>
            </div>
            <Badge variant="secondary" className={`text-xs font-bold px-2 py-0.5 ${getTierColor(tier)}`}>
              {tier}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="font-mono font-semibold">{referralCount}</span>
            </div>
          </div>
        </div>
        
        {/* Second Row: Energy Bar, Idle Power, Tier Bonus */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="font-semibold">Energy</span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {Math.floor(energy)} / {actualMaxEnergy}
              </span>
            </div>
            <Progress 
              value={energyPercent} 
              className="h-2 bg-secondary"
            />
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="font-mono font-semibold">{formatRate(bzPerHour)}</span>
              <span className="text-xs">BZ/h</span>
            </div>
            <div className="text-green-600 dark:text-green-400 font-bold">
              +{tierBonus}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}