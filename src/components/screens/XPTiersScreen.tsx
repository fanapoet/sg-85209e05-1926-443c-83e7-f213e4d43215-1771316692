import { useGameState } from "@/contexts/GameStateContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Users, CheckSquare, Hammer, Gift, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { verifyAndClaimDevice, getUserDevices } from "@/services/hardwareService";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TierInfo {
  name: string;
  minXP: number;
  maxXP: number;
  bonus: number;
  color: string;
  bgColor: string;
}

const tiers: TierInfo[] = [
  { name: "Bronze", minXP: 0, maxXP: 10000, bonus: 0, color: "text-orange-700", bgColor: "bg-orange-100 dark:bg-orange-950" },
  { name: "Silver", minXP: 10001, maxXP: 50000, bonus: 5, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-800" },
  { name: "Gold", minXP: 50001, maxXP: 150000, bonus: 15, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-950" },
  { name: "Platinum", minXP: 150001, maxXP: 500000, bonus: 25, color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-950" },
  { name: "Diamond", minXP: 500001, maxXP: Infinity, bonus: 40, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-950" }
];

export function XPTiersScreen() {
  const { xp, tier, addXP } = useGameState();
  const { toast } = useToast();
  const [devices, setDevices] = useState<any[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const currentTierInfo = tiers.find((t) => t.name === tier) || tiers[0];
  const currentTierIndex = tiers.findIndex((t) => t.name === tier);
  const nextTierInfo = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

  const progressInTier = nextTierInfo 
    ? ((xp - currentTierInfo.minXP) / (nextTierInfo.minXP - currentTierInfo.minXP)) * 100
    : 100;

  const xpSources = [
    {
      icon: Users,
      title: "Referrals",
      description: "Earn XP for each friend who joins",
      rewards: [
        "Initial binding: +1,000 XP",
        "Milestones: 5/10/25/50 friends → 5k/15k/50k/150k XP"
      ]
    },
    {
      icon: CheckSquare,
      title: "Tasks & Challenges",
      description: "Complete daily, weekly, and progressive tasks",
      rewards: [
        "Daily tasks: Small XP rewards",
        "Weekly challenges: Medium XP rewards",
        "Progressive tasks: Large XP bonuses"
      ]
    },
    {
      icon: Hammer,
      title: "Building Progress",
      description: "Unlock stages and complete builds",
      rewards: [
        "Stage completions grant XP",
        "Milestone builds award bonus XP"
      ]
    },
    {
      icon: Gift,
      title: "Rewards & Events",
      description: "Daily rewards and special events",
      rewards: [
        "Daily reward cycles include XP",
        "Limited-time events with XP bonuses"
      ]
    }
  ];

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const userDevices = await getUserDevices(user.id);
      setDevices(userDevices);
    }
  };

  const handleConnectDevice = async () => {
    if (!qrInput.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid QR code",
        variant: "destructive"
      });
      return;
    }
    
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to connect devices",
          variant: "destructive"
        });
        return;
      }

      const result = await verifyAndClaimDevice(qrInput.trim(), user.id);
      
      if (result.success) {
        toast({
          title: "✅ Device Connected Successfully!",
          description: `${result.message} • +${result.xp} XP added to your balance!`,
        });
        if (result.xp) addXP(result.xp);
        setQrInput("");
        loadDevices();
      } else {
        toast({
          title: "❌ Connection Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      console.error("Hardware connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const startCameraScanner = async () => {
    try {
      setCameraError("");
      setShowCamera(true);
      
      // Note: Full QR scanning requires a library like html5-qrcode
      // For now, we'll show camera access message
      toast({
        title: "Camera Scanner",
        description: "QR scanning requires camera permission. Please use manual input for now.",
      });
      
      // TODO: Implement full QR scanner with html5-qrcode library
    } catch (error) {
      setCameraError("Camera access denied or not available");
      setShowCamera(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">XP & Tiers</h1>
        <p className="text-sm text-muted-foreground">
          Advance through tiers to unlock powerful bonuses
        </p>
      </div>

      {/* Current Status */}
      <Card className={`p-6 ${currentTierInfo.bgColor} border-2`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className={`h-10 w-10 ${currentTierInfo.color}`} />
              <div>
                <h2 className={`text-2xl font-bold ${currentTierInfo.color}`}>
                  {currentTierInfo.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {xp.toLocaleString()} XP
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              +{currentTierInfo.bonus}%
            </Badge>
          </div>

          {nextTierInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to {nextTierInfo.name}</span>
                <span className="font-medium">
                  {xp.toLocaleString()} / {nextTierInfo.minXP.toLocaleString()} XP
                </span>
              </div>
              <Progress value={progressInTier} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {(nextTierInfo.minXP - xp).toLocaleString()} XP remaining
              </p>
            </div>
          )}

          {!nextTierInfo && (
            <div className="text-center py-2">
              <p className="text-lg font-semibold text-purple-600">
                🎉 Maximum Tier Reached!
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Current Bonus Explanation */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Your Current Bonus: +{currentTierInfo.bonus}%
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Applied to all tap income, idle yield, and conversion rates
            </p>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Tap rewards increased by {currentTierInfo.bonus}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Build idle yield increased by {currentTierInfo.bonus}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span>BB→BZ conversion limit: {currentTierInfo.bonus > 0 ? `${currentTierInfo.bonus}% of BB balance` : "Locked"}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Hardware Connection Section */}
      <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Hardware Connection</h3>
            <p className="text-xs text-muted-foreground">Connect real devices to boost XP</p>
          </div>
        </div>

        {devices.length > 0 ? (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-medium">Connected Devices:</p>
            {devices.map((device, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">{device.product_type}</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed rounded-lg mb-4 bg-background/30">
            <p className="text-sm text-muted-foreground">No devices connected yet</p>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <QrCode className="mr-2 h-4 w-4" />
              Connect New Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Hardware Device</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Scan the QR code on your Bunergy device (GameCore or BIP-X) or enter the code manually.
              </p>
              
              {/* Camera Scanner Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={startCameraScanner}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Scan QR Code with Camera
              </Button>

              {cameraError && (
                <p className="text-sm text-red-600">{cameraError}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or enter manually
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Input 
                  placeholder="BUNERGY_GC01_..." 
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  disabled={isConnecting}
                />
                <Button 
                  className="w-full" 
                  onClick={handleConnectDevice}
                  disabled={isConnecting || !qrInput.trim()}
                >
                  {isConnecting ? "Verifying..." : "Connect Device"}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <p className="font-semibold mb-1">Expected Format:</p>
                <p className="font-mono text-[10px] break-all">
                  BUNERGY_[PRODUCT]_[SERIAL]_[HASH]
                </p>
                <p className="mt-2 text-[10px]">
                  Example: BUNERGY_GC01_A7B3C9D2E5F1_8f3a9b2c
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      {/* All Tiers Overview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">All Tiers</h3>
        <div className="space-y-2">
          {tiers.map((tierInfo, index) => {
            const isActive = tierInfo.name === tier;
            const isPast = index < currentTierIndex;

            return (
              <div
                key={tierInfo.name}
                className={`p-3 rounded-lg border-2 ${
                  isActive 
                    ? `${tierInfo.bgColor} border-current` 
                    : isPast 
                    ? "bg-muted/50 border-muted" 
                    : "bg-background border-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className={`h-6 w-6 ${isActive || isPast ? tierInfo.color : "text-muted-foreground"}`} />
                    <div>
                      <h4 className={`font-semibold ${isActive ? tierInfo.color : isPast ? "text-muted-foreground" : ""}`}>
                        {tierInfo.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {tierInfo.minXP.toLocaleString()}
                        {tierInfo.maxXP !== Infinity && ` - ${tierInfo.maxXP.toLocaleString()}`}
                        {tierInfo.maxXP === Infinity && "+"} XP
                      </p>
                    </div>
                  </div>
                  <Badge variant={isActive ? "default" : "outline"}>
                    +{tierInfo.bonus}%
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* XP Sources */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">How to Earn XP</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Note: Tapping does not grant XP. Focus on these activities:
        </p>
        <div className="space-y-3">
          {xpSources.map((source) => {
            const Icon = source.icon;
            return (
              <div key={source.title} className="p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{source.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {source.description}
                    </p>
                    <div className="space-y-1">
                      {source.rewards.map((reward, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{reward}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}