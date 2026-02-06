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
    bzPerHour,
    referralCount
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

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal Content - High Contrast & Readability */}
      <div className="relative w-full max-w-md bg-background rounded-3xl shadow-2xl overflow-hidden animate-fade-in border border-border">
        
        <div className="p-6 flex flex-col items-center">
          
          {/* Avatar & Name */}
          <div className="relative mb-3">
            <Avatar className="w-24 h-24 border-4 border-amber-500 shadow-xl">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-600 text-white text-4xl font-bold">
                {telegramUser?.first_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-background">
              {tier}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground text-center leading-tight">
            {telegramUser?.first_name || "User"} {telegramUser?.last_name || ""}
          </h2>
          
          {telegramUser?.username && (
            <p className="text-amber-500 font-medium text-sm mb-3">@{telegramUser.username}</p>
          )}
          
          {/* ID Copy Pill */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary border border-border px-3 py-1.5 rounded-full transition-colors mb-6"
          >
            <span className="text-xs text-muted-foreground font-mono">ID: {telegramUser?.id || "N/A"}</span>
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* Status Cards Row */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            <div className="bg-secondary/50 rounded-xl p-3 text-center border border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Language</div>
              <div className="text-base font-bold text-foreground">
                {telegramUser?.language_code?.toUpperCase() || "EN"}
              </div>
            </div>
            
            <div className="bg-secondary/50 rounded-xl p-3 text-center border border-border/50">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
              <div className="text-base font-bold text-foreground flex items-center justify-center gap-1">
                {telegramUser?.is_premium ? (
                  <>Premium <span className="text-amber-500">⭐</span></>
                ) : (
                  "Free"
                )}
              </div>
            </div>
          </div>

          {/* Game Progress Section - Clean & Readable */}
          <div className="w-full bg-secondary/30 rounded-2xl p-4 border border-border/50 mb-6">
            <h3 className="text-amber-600 font-bold text-xs uppercase tracking-widest mb-4">Game Progress</h3>
            
            {/* Balances */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-background rounded-xl p-3 shadow-sm border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">BunZap</div>
                <div className="text-lg font-bold text-foreground truncate">{formatNumber(bz)}</div>
              </div>
              <div className="bg-background rounded-xl p-3 shadow-sm border border-border/50">
                <div className="text-[10px] text-muted-foreground uppercase mb-1">BunBun</div>
                <div className="text-lg font-bold text-foreground truncate">{bb.toFixed(6)}</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-background rounded-lg p-2 text-center shadow-sm border border-border/50">
                <div className="text-[10px] text-muted-foreground mb-0.5">XP</div>
                <div className="text-sm font-bold text-foreground">{formatNumber(xp)}</div>
              </div>
              <div className="bg-background rounded-lg p-2 text-center shadow-sm border border-border/50">
                <div className="text-[10px] text-muted-foreground mb-0.5">Tier</div>
                <div className="text-sm font-bold text-amber-600">{tier}</div>
              </div>
              <div className="bg-background rounded-lg p-2 text-center shadow-sm border border-border/50">
                <div className="text-[10px] text-muted-foreground mb-0.5">Refs</div>
                <div className="text-sm font-bold text-foreground">{referralCount}</div>
              </div>
            </div>

            {/* Hourly Income */}
            <div className="bg-background rounded-xl p-3 flex justify-between items-center shadow-sm border border-border/50">
              <span className="text-xs text-muted-foreground uppercase">Hourly Income</span>
              <span className="text-base font-bold text-green-600">+{bzPerHour.toFixed(1)} BZ/h</span>
            </div>
          </div>

          {/* Close Button */}
          <Button 
            onClick={handleClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl text-base shadow-lg"
          >
            Close Profile
          </Button>

        </div>
      </div>
    </div>
  );
}