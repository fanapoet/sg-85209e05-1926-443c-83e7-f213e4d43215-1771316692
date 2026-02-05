import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CompactDashboard() {
  const { 
    bz, bb, energy, maxEnergy, bzPerHour, tier, xp,
    isSyncing, manualSync
  } = useGameState();
  const { toast } = useToast();

  const formatBZ = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const formatBB = (value: number) => value.toFixed(6);
  const formatRate = (value: number) => value.toFixed(1);
  const formatXP = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 0 });

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

  const handleSyncDotClick = () => {
    manualSync();
    toast({
      title: "Synced!",
      duration: 1500,
    });
  };

  // Get total taps from localStorage (for display)
  const getTotalTaps = () => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem("bunergy_player_state");
    if (!stored) return 0;
    try {
      const state = JSON.parse(stored);
      return state.totalTaps || 0;
    } catch {
      return 0;
    }
  };

  const totalTaps = getTotalTaps();

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-6 py-4 rounded-b-3xl shadow-lg border-b-2 border-orange-200 dark:border-gray-700 sticky top-0 z-50">
      {/* Top Row: BZ | Bunny Icon | Tier + Dot + Avatar */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: BZ */}
        <div className="flex flex-col">
          <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {formatBZ(bz)} <span className="text-xl font-medium text-amber-700 dark:text-amber-400">BZ</span>
          </div>
        </div>

        {/* Center: Bunny Icon */}
        <div className="flex-shrink-0">
          <img 
            src="/bunny-character-new.png" 
            alt="Bunny" 
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
        </div>

        {/* Right: Tier Badge + Green Dot + Avatar */}
        <div className="flex items-center gap-2">
          {/* Green Sync Dot (Touchable) */}
          <button
            onClick={handleSyncDotClick}
            disabled={isSyncing}
            className="relative group"
            aria-label="Manual sync"
          >
            <div className={`w-4 h-4 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'} shadow-lg cursor-pointer transition-transform group-active:scale-90`} />
          </button>

          {/* Tier Badge */}
          <Badge className={`${tierColors[tier]} text-white text-sm px-3 py-1 font-bold shadow-md`}>
            {tier}
          </Badge>

          {/* Avatar */}
          <Avatar className="h-12 w-12 border-3 border-white dark:border-gray-700 shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-lg">
              B
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Second Row: BB */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatBB(bb)} <span className="text-lg font-medium text-amber-700 dark:text-amber-400">BB</span>
        </div>
      </div>

      {/* Third Row: XP | Energy | BZ/h | Bonus */}
      <div className="flex items-center justify-between text-sm mb-4 text-gray-700 dark:text-gray-300">
        {/* XP */}
        <div className="flex items-center gap-1">
          <span className="font-medium text-amber-800 dark:text-amber-400">XP:</span>
          <span className="font-bold text-gray-900 dark:text-white">{formatXP(xp)}</span>
        </div>

        {/* Energy */}
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-bold text-gray-900 dark:text-white">
            {Math.floor(energy)}/{maxEnergy}
          </span>
        </div>

        {/* BZ/h */}
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <span className="font-bold text-gray-900 dark:text-white">
            {formatRate(bzPerHour)} <span className="text-xs text-amber-700 dark:text-amber-400">BZ/h</span>
          </span>
        </div>

        {/* Tier Bonus */}
        <div className="font-bold text-green-600 dark:text-green-400">
          +{bonus}%
        </div>
      </div>

      {/* Energy Bar Section: Taps + Energy Bar */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-orange-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          {/* Taps */}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Taps</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatBZ(totalTaps)}
              </div>
            </div>
          </div>

          {/* Energy Label */}
          <div className="text-right">
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Energy</div>
            <div className="flex items-center gap-1 justify-end">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {Math.floor(energy)}/{maxEnergy}
              </span>
            </div>
          </div>
        </div>

        {/* Energy Progress Bar */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500 transition-all duration-300 shadow-md"
            style={{ width: `${Math.min(energyPercent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}