import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";

export function CompactDashboard() {
  const {
    bz,
    bb,
    xp,
    energy,
    maxEnergy,
    tier,
    bzPerHour,
    manualSync,
  } = useGameState();

  // Calculate tier bonus based on tier
  const getTierBonus = (tier: string): number => {
    const bonuses: Record<string, number> = {
      Bronze: 0,
      Silver: 5,
      Gold: 10,
      Platinum: 15,
      Diamond: 20,
    };
    return bonuses[tier] || 0;
  };

  const tierBonus = getTierBonus(tier);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const router = useRouter();

  const handleSyncDot = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await manualSync();
      setShowSyncToast(true);
      setTimeout(() => setShowSyncToast(false), 1500);
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-US").format(Math.floor(num));
  };

  const formatBB = (num: number): string => {
    return num.toFixed(6);
  };

  const formatRate = (num: number): string => {
    return num.toFixed(1);
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      Bronze: "bg-orange-700/20 text-orange-300 border-orange-500/30",
      Silver: "bg-slate-400/20 text-slate-200 border-slate-400/30",
      Gold: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      Platinum: "bg-cyan-400/20 text-cyan-200 border-cyan-400/30",
      Diamond: "bg-blue-400/20 text-blue-200 border-blue-400/30",
    };
    return colors[tier] || colors.Bronze;
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-b from-amber-600 via-orange-500 to-amber-600 dark:from-amber-800 dark:via-orange-700 dark:to-amber-800 shadow-lg">
      {/* Sync Toast */}
      {showSyncToast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
          Synced!
        </div>
      )}

      <div className="px-4 py-3 space-y-2">
        {/* First Line: All Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-amber-950 dark:text-amber-50">
              {formatNumber(bz)} <span className="text-xs opacity-70">BZ</span>
            </span>
            <span className="font-bold text-amber-950 dark:text-amber-50">
              {formatBB(bb)} <span className="text-xs opacity-70">BB</span>
            </span>
            <span className="text-amber-900 dark:text-amber-100">
              XP: {formatNumber(xp)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-amber-900 dark:text-amber-100">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium">
                {Math.floor(energy)}/{maxEnergy}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">{formatRate(bzPerHour)} BZ/h</span>
            </div>
            <div className="font-bold text-green-600 dark:text-green-400">
              +{tierBonus}%
            </div>
          </div>
        </div>

        {/* Second Line: Logo | Tier + Profile */}
        <div className="flex items-center justify-between">
          {/* Bunergy Logo */}
          <div className="w-16 h-16">
            <img
              src="/bunergy-icon.png"
              alt="Bunergy"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Tier Badge + Profile */}
          <div className="flex items-center gap-3">
            {/* Green Sync Dot + Tier Badge */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncDot}
                disabled={isSyncing}
                className="focus:outline-none active:scale-95 transition-transform"
                aria-label="Manual sync"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    isSyncing
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-green-500"
                  }`}
                />
              </button>
              <div
                className={`px-3 py-1.5 rounded-lg border font-semibold text-sm ${getTierColor(
                  tier
                )}`}
              >
                {tier}
              </div>
            </div>

            {/* Profile Avatar (clickable) */}
            <button
              onClick={handleProfileClick}
              className="focus:outline-none active:scale-95 transition-transform"
              aria-label="View profile"
            >
              <Avatar className="w-12 h-12 border-2 border-amber-950/20 dark:border-amber-50/20">
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-600 text-white font-bold text-lg">
                  {tier.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}