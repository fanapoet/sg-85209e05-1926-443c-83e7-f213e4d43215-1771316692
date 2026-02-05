import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/router";
import { useState } from "react";
import { Zap, TrendingUp } from "lucide-react";

export function CompactDashboard() {
  const {
    bz,
    bb,
    xp,
    energy,
    maxEnergy,
    bzPerHour,
    tier,
    manualSync,
    setProfileOpen,
  } = useGameState();

  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncToast, setShowSyncToast] = useState(false);

  const getTierBonus = (tierName: string): number => {
    const bonuses: Record<string, number> = {
      Bronze: 0,
      Silver: 5,
      Gold: 15,
      Platinum: 25,
      Diamond: 40,
    };
    return bonuses[tierName] || 0;
  };

  const tierBonus = getTierBonus(tier);

  const formatNumber = (num: number): string => {
    return Math.floor(num).toLocaleString("en-US");
  };

  const formatBB = (num: number): string => {
    return num.toFixed(6);
  };

  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    await manualSync();
    setIsSyncing(false);
    setShowSyncToast(true);
    setTimeout(() => setShowSyncToast(false), 2000);
  };

  const handleProfileClick = () => {
    setProfileOpen(true);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-b border-amber-200 dark:border-gray-700 px-3 py-1.5 shadow-sm">
      {/* Line 1: BZ | Logo | Tier Badge - COMPACT HEADER */}
      <div className="flex items-center justify-between mb-0.5">
        {/* BZ Balance - Smaller Text */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-amber-900 dark:text-amber-100 leading-none">
            {formatNumber(bz)}
          </span>
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">BZ</span>
        </div>

        {/* Center Logo - Much Smaller */}
        <div className="flex-shrink-0 -my-1">
          <img 
            src="/bunergy-icon.png" 
            alt="Bunergy" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </div>

        {/* Tier Badge with Sync Dot - Smaller */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="relative w-2.5 h-2.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
            aria-label="Manual sync"
          >
            <div className={`absolute inset-0 rounded-full ${
              isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
            }`} />
          </button>
          <div className="px-2 py-0.5 bg-slate-400/30 dark:bg-slate-600/30 rounded text-[10px]">
            <span className="font-semibold text-slate-800 dark:text-slate-200 leading-none block">
              {tier}
            </span>
          </div>
        </div>
      </div>

      {/* Line 2: BB | Avatar - COMPACT MIDDLE */}
      <div className="flex items-center justify-between mb-1">
        {/* BB Balance - Smaller Text */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-amber-900 dark:text-amber-100 leading-none">
            {formatBB(bb)}
          </span>
          <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">BB</span>
        </div>

        {/* Profile Avatar - Smaller */}
        <button
          onClick={handleProfileClick}
          className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95"
          aria-label="Profile"
        >
          <Avatar className="w-7 h-7 border border-orange-300 dark:border-orange-600">
            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-400 text-white text-[10px] font-bold">
              {tier.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </button>
      </div>

      {/* Line 3: XP | Energy | BZ/h | Tier Bonus - COMPACT FOOTER */}
      <div className="flex items-center justify-between text-[10px] leading-none">
        <div className="flex items-center gap-0.5 text-amber-800 dark:text-amber-200">
          <span className="font-medium">XP:</span>
          <span className="font-bold">{formatNumber(xp)}</span>
        </div>

        <div className="flex items-center gap-0.5 text-yellow-700 dark:text-yellow-300">
          <Zap className="w-2.5 h-2.5" />
          <span className="font-semibold">
            {Math.floor(energy)}/{maxEnergy}
          </span>
        </div>

        <div className="flex items-center gap-0.5 text-green-700 dark:text-green-300">
          <TrendingUp className="w-2.5 h-2.5" />
          <span className="font-semibold">{bzPerHour.toFixed(1)}</span>
          <span className="opacity-80">BZ/h</span>
        </div>

        <div className="px-1.5 py-0.5 bg-green-500/20 dark:bg-green-500/30 rounded-[3px]">
          <span className="font-bold text-green-700 dark:text-green-300">
            +{tierBonus}%
          </span>
        </div>
      </div>

      {/* Sync Toast */}
      {showSyncToast && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-green-500 text-white text-xs rounded shadow-lg animate-fade-in z-50">
          Synced!
        </div>
      )}
    </div>
  );
}