import { useGameState } from "@/contexts/GameStateContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, Zap } from "lucide-react";

export function CompactDashboard() {
  const { bz, bb, energy, maxEnergy, bzPerHour, tier, referralCount } = useGameState();

  const formatBZ = (value: number) => {
    return Math.floor(value).toLocaleString("en-US");
  };

  const formatBB = (value: number) => {
    return value.toFixed(6);
  };

  const formatRate = (value: number) => {
    return value.toFixed(1);
  };

  const tierBonus = tier === "Bronze" ? 0 : tier === "Silver" ? 5 : tier === "Gold" ? 15 : tier === "Platinum" ? 25 : 40;

  return (
    <div className="bg-card border-b border-border p-3 space-y-2">
      {/* Top Row: Currencies and Tier */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold text-foreground">{formatBZ(bz)}</span>
            <span className="text-muted-foreground ml-1">BZ</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-foreground">{formatBB(bb)}</span>
            <span className="text-muted-foreground ml-1">BB</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {formatRate(bzPerHour)} BZ/h <span className="text-green-600 dark:text-green-400">(+{tierBonus}%)</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tier}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {referralCount}
          </div>
        </div>
      </div>
      
      {/* Bottom Row: Energy Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-3 w-3" />
            Energy
          </div>
          <span className="font-medium text-foreground">
            {Math.floor(energy)} / {maxEnergy}
          </span>
        </div>
        <Progress value={(energy / maxEnergy) * 100} className="h-1.5" />
      </div>
    </div>
  );
}