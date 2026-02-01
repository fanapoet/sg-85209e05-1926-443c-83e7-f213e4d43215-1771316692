import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompactDashboard() {
  const { 
    bz, bb, energy, maxEnergy, bzPerHour, tier, referralCount,
    isSyncing, lastSyncTime, isOnline, manualSync
  } = useGameState();

  const formatBZ = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const formatBB = (value: number) => value.toFixed(6);
  const formatRate = (value: number) => value.toFixed(1);

  const tierColors: Record<string, string> = {
    Bronze: "bg-orange-800",
    Silver: "bg-gray-400",
    Gold: "bg-yellow-500",
    Platinum: "bg-cyan-400",
    Diamond: "bg-purple-500"
  };

  const tierBonus: Record<string, number> = {
    Bronze: 0,
    Silver: 5,
    Gold: 15,
    Platinum: 25,
    Diamond: 40
  };

  const energyPercent = (energy / maxEnergy) * 100;
  const bonus = tierBonus[tier] || 0;
  
  const getTimeSinceSync = () => {
    if (lastSyncTime === 0) return "Never";
    const seconds = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 p-4 rounded-b-2xl shadow-lg border-b-2 border-purple-600">
      {/* Top Row: Profile, Currencies & Sync */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-purple-400">
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
              B
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-300 font-bold text-lg">{formatBZ(bz)} BZ</span>
              <Badge className={`${tierColors[tier]} text-white text-xs px-2 py-0.5`}>
                {tier}
              </Badge>
            </div>
            <div className="text-purple-200 text-sm">
              {formatBB(bb)} BB
            </div>
          </div>
        </div>

        {/* Sync Button & Status */}
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant={isOnline ? "default" : "destructive"}
            onClick={() => {
              console.log("🔴 [UI] SYNC BUTTON CLICKED!");
              alert("Sync button clicked! Check if manualSync runs...");
              manualSync();
            }}
            disabled={isSyncing}
            className="h-8 px-3 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          <div className="text-xs text-purple-300">
            {isOnline ? `✓ ${getTimeSinceSync()}` : "⚠ Offline"}
          </div>
        </div>
      </div>

      {/* Energy Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-white text-sm font-medium">Energy</span>
          </div>
          <span className="text-white text-sm font-bold">
            {Math.floor(energy)} / {maxEnergy}
          </span>
        </div>
        <div className="h-2 bg-purple-950 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
            style={{ width: `${Math.min(energyPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-purple-300">BZ/h: </span>
            <span className="text-white font-medium">
              {formatRate(bzPerHour)} {bonus > 0 && <span className="text-green-400">(+{bonus}%)</span>}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-purple-300" />
            <span className="text-white font-medium">{referralCount}</span>
          </div>
        </div>
      </div>

      {/* Debug Info (remove in production) */}
      <div className="mt-2 text-xs text-purple-400 opacity-75">
        🔍 Debug: Sync every 30s | Last: {getTimeSinceSync()} | Online: {isOnline ? "Yes" : "No"}
      </div>
    </div>
  );
}