import { useGameState } from "@/contexts/GameStateContext";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, TrendingUp, User } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function CompactDashboard() {
  const { bz, bb, energy, tier, referralCount, xp, bzPerHour } = useGameState();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile(user);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

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

  const getUserInitials = () => {
    if (userProfile?.user_metadata?.full_name) {
      return userProfile.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (userProfile?.email) {
      return userProfile.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <div className="bg-card border-b border-border shadow-sm">
        <div className="p-3 space-y-2">
          {/* Row 1: BZ, BB (left) | Tier Badge, Avatar (right) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="font-bold text-sm text-foreground font-mono">{formatBZ(bz)}</span>
                <span className="text-muted-foreground ml-1 text-[10px] font-semibold">BZ</span>
              </div>
              <div className="text-xs">
                <span className="font-bold text-sm text-foreground font-mono">{formatBB(bb)}</span>
                <span className="text-muted-foreground ml-1 text-[10px] font-semibold">BB</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-[10px] font-bold px-1.5 py-0 ${getTierColor(tier)}`}>
                {tier}
              </Badge>
              <button 
                onClick={() => setProfileOpen(true)}
                className="h-8 w-8 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={userProfile?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>
          
          {/* Row 2: XP, Energy, BZ/h, Tier Bonus */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-muted-foreground font-semibold">XP:</span>
                <span className="font-mono font-bold text-foreground text-xs">{Math.floor(xp).toLocaleString()}</span>
              </div>
              
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="font-mono font-semibold">{Math.floor(energy)}/{actualMaxEnergy}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={userProfile?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  {userProfile?.user_metadata?.full_name || "Anonymous User"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {userProfile?.email || "No email"}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-xs font-mono">{userProfile?.id?.slice(0, 8)}...</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Current Tier</span>
                <Badge className={getTierColor(tier)}>{tier}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Total XP</span>
                <span className="font-bold">{Math.floor(xp).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Total BZ</span>
                <span className="font-bold">{formatBZ(bz)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Total BB</span>
                <span className="font-bold">{formatBB(bb)}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Referrals</span>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="font-bold">{referralCount}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Idle Production</span>
                <span className="font-bold">{formatRate(bzPerHour)} BZ/h</span>
              </div>
            </div>

            <Button onClick={() => setProfileOpen(false)} className="w-full" size="lg">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}