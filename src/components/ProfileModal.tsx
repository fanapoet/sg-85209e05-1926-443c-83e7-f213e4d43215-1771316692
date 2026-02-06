import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
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

  if (!isProfileOpen) return null;

  const handleClose = () => {
    setProfileOpen(false);
  };

  const handleCopyId = () => {
    if (telegramUser?.id) {
      navigator.clipboard.writeText(telegramUser.id.toString());
      toast({
        title: "Copied!",
        description: "Telegram ID copied to clipboard",
      });
    }
  };

  const firstName = telegramUser?.first_name || "User";
  const username = telegramUser?.username ? `@${telegramUser.username}` : "";
  const language = telegramUser?.language_code?.toUpperCase() || "EN";
  const isPremium = telegramUser?.is_premium;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-3xl shadow-2xl w-[90%] max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Avatar & User Info */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-primary">
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-amber-400 to-orange-600 text-white">
                  {firstName[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                {tier}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold">{firstName}</h2>
              {username && (
                <p className="text-amber-600 font-medium">{username}</p>
              )}
            </div>

            <button
              onClick={handleCopyId}
              className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <span className="text-sm">ID: {telegramUser?.id || "N/A"}</span>
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {/* Language & Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Language</p>
              <p className="text-xl font-bold">{language}</p>
            </div>
            <div className="bg-secondary rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-lg font-bold">
                {isPremium ? "Premium ⭐" : "Free"}
              </p>
            </div>
          </div>

          {/* Game Progress Stats */}
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-bold text-amber-600">GAME PROGRESS</h3>
            
            {/* Balances */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">BunZap</p>
                <p className="text-xl font-bold text-amber-600">{bz.toLocaleString()}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">BunBun</p>
                <p className="text-xl font-bold text-amber-600">{bb.toFixed(6)}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">XP</p>
                <p className="text-sm font-bold">{xp.toLocaleString()}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Tier</p>
                <p className="text-sm font-bold text-green-500">{tier}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">Referrals</p>
                <p className="text-sm font-bold">0</p>
              </div>
            </div>

            {/* Hourly Income */}
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Hourly Income</p>
              <p className="text-xl font-bold text-green-500">{bzPerHour.toFixed(1)} BZ/h</p>
            </div>
          </div>

          {/* Close Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold"
            size="lg"
          >
            Close
          </Button>

        </div>
      </div>
    </div>
  );
}