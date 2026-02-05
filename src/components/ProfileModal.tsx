import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfileModal() {
  const { 
    isProfileOpen, 
    setProfileOpen, 
    telegramUser, 
    tier,
    bz,
    bb,
    xp,
    bzPerHour
  } = useGameState();
  const { toast } = useToast();

  // Derived state
  const referralCount = 0; // Placeholder until connected to context
  const idleIncomePerHour = bzPerHour;

  if (!isProfileOpen) return null;

  const handleClose = () => {
    setProfileOpen(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Fallback if no Telegram user data (e.g. testing in browser)
  const user = telegramUser || {
    id: 0,
    first_name: "Bunny",
    last_name: "Player",
    username: "bunergy_player",
    language_code: "en",
    is_premium: false
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 transform transition-all animate-in slide-in-from-bottom duration-300 border-t border-amber-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-amber-100 dark:ring-gray-800 shadow-xl mb-3">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-3xl font-bold text-white">
                {user.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-gray-900">
              {tier}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user.first_name} {user.last_name}
          </h2>
          
          {/* Username & ID Grouped at Top */}
          <div className="flex flex-col items-center gap-1 mt-1">
            {user.username && (
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                @{user.username}
              </p>
            )}
            <div 
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => copyToClipboard(user.id.toString(), "ID")}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                ID: {user.id}
              </span>
              <Copy className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Language & Status */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Language</div>
            <div className="text-sm font-medium text-white">
              {telegramUser.language_code?.toUpperCase() || "EN"}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Status</div>
            <div className="text-sm font-medium text-white flex items-center justify-center gap-1">
              {telegramUser.is_premium ? (
                <>Premium <span className="text-yellow-400">⭐</span></>
              ) : (
                "Free"
              )}
            </div>
          </div>
        </div>

        {/* User Balances & Stats */}
        <div className="bg-gradient-to-br from-amber-900/30 to-slate-800/30 rounded-xl p-4 mb-6 border border-amber-700/20">
          <div className="text-xs text-amber-400/80 font-semibold mb-3 uppercase tracking-wide">
            Game Progress
          </div>
          
          {/* Balances */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-700/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">BunZap</div>
              <div className="text-base font-bold text-amber-400">
                {bz.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">BunBun</div>
              <div className="text-base font-bold text-amber-400">
                {bb.toFixed(6)}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">XP</div>
              <div className="text-sm font-semibold text-white">
                {xp.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Tier</div>
              <div className="text-sm font-semibold text-white">
                {tier}
              </div>
            </div>
            <div className="bg-slate-700/40 rounded-lg p-2 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Referrals</div>
              <div className="text-sm font-semibold text-white">
                {referralCount}
              </div>
            </div>
          </div>

          {/* Income Rate */}
          <div className="mt-3 bg-slate-700/40 rounded-lg p-2.5 flex items-center justify-between">
            <div className="text-xs text-slate-400">Hourly Income</div>
            <div className="text-sm font-bold text-green-400">
              {idleIncomePerHour.toFixed(1)} BZ/h
            </div>
          </div>
        </div>

        {/* Close Button at Bottom */}
        <Button 
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-12 rounded-xl text-lg shadow-lg shadow-amber-600/20"
          onClick={handleClose}
        >
          Close
        </Button>

      </div>
    </div>
  );
}