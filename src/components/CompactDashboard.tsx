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
        {/* Row 1: Balances + Stats */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: BZ, BB */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <div className="text-xs">
              <span className="font-bold text-sm text-foreground font-mono">{formatBZ(bz)}</span>
              <span className="text-muted-foreground ml-1 text-[10px] font-semibold">BZ</span>
            </div>
            <div className="text-xs">
              <span className="font-bold text-sm text-foreground font-mono">{formatBB(bb)}</span>
              <span className="text-muted-foreground ml-1 text-[10px] font-semibold">BB</span>
            </div>
          </div>
          
          {/* Right: XP, Tier, Referrals, Idle Rate, Tier Bonus */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground font-semibold">XP:</span>
              <span className="font-mono font-bold text-foreground text-xs">{Math.floor(xp).toLocaleString()}</span>
            </div>
            <Badge variant="secondary" className={`text-[10px] font-bold px-1.5 py-0 ${getTierColor(tier)}`}>
              {tier}
            </Badge>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              <span className="font-mono font-semibold">{referralCount}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="font-mono font-semibold">{formatRate(bzPerHour)}</span>
              <span className="text-[9px]">BZ/h</span>
            </div>
            <div className="text-green-600 dark:text-green-400 font-bold text-[10px]">
              +{tierBonus}%
            </div>
          </div>
        </div>
        
        {/* Row 2: Energy Bar Only */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span className="font-semibold">Energy</span>
            </div>
            <span className="font-mono font-bold text-foreground text-xs">
              {Math.floor(energy)} / {actualMaxEnergy}
            </span>
          </div>
          <Progress 
            value={energyPercent} 
            className="h-2 bg-secondary"
          />
        </div>
      </div>
    </div>
  );
}