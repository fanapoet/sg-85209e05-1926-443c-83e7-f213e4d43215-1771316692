import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Clock } from "lucide-react";

export function TapScreen() {
  const { 
    bz, 
    energy, 
    maxEnergy, 
    addBZ, 
    setEnergy, 
    tier, 
    incrementTaps 
  } = useGameState();

  const [lastTapTime, setLastTapTime] = useState(0);
  const [quickChargeUses, setQuickChargeUses] = useState(5);
  const [quickChargeCooldown, setQuickChargeCooldown] = useState(0);
  const [quickChargeResetTime, setQuickChargeResetTime] = useState(Date.now() + 86400000);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{ id: number; value: string; x: number; y: number }>>([]);
  const [displayMaxEnergy, setDisplayMaxEnergy] = useState(maxEnergy);
  const [recoveryRate, setRecoveryRate] = useState(0.3);

  // Load persisted QuickCharge state
  useEffect(() => {
    const saved = localStorage.getItem("quickCharge");
    if (saved) {
      const data = JSON.parse(saved);
      setQuickChargeUses(data.uses);
      setQuickChargeCooldown(Math.max(0, data.cooldownEnd - Date.now()));
      setQuickChargeResetTime(data.resetTime);
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (quickChargeCooldown <= 0) return;
    const interval = setInterval(() => {
      setQuickChargeCooldown((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [quickChargeCooldown]);

  // Rolling 24h reset
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= quickChargeResetTime) {
        setQuickChargeUses(5);
        setQuickChargeResetTime(Date.now() + 86400000);
        localStorage.setItem("quickCharge", JSON.stringify({
          uses: 5,
          cooldownEnd: 0,
          resetTime: Date.now() + 86400000
        }));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [quickChargeResetTime]);

  // Get booster levels from localStorage
  const getBoosterLevel = (key: string): number => {
    const saved = localStorage.getItem("boosters");
    if (!saved) return 1;
    const data = JSON.parse(saved);
    return data[key] || 1;
  };

  // Sync with global state and boosters
  useEffect(() => {
    const checkBoosters = () => {
      const energyCapacityLevel = getBoosterLevel("energyCapacity");
      const recoveryRateLevel = getBoosterLevel("recoveryRate");
      
      const newMaxEnergy = 1500 + (energyCapacityLevel - 1) * 100;
      setDisplayMaxEnergy(newMaxEnergy);
      
      const newRecoveryRate = 0.3 + (recoveryRateLevel - 1) * 0.05;
      setRecoveryRate(newRecoveryRate);
    };

    checkBoosters();
    const interval = setInterval(checkBoosters, 1000);
    return () => clearInterval(interval);
  }, []);

  const incomePerTapLevel = getBoosterLevel("incomePerTap");
  const energyPerTapLevel = getBoosterLevel("energyPerTap");

  const getTierMultiplier = (): number => {
    if (tier === "Bronze") return 1.0;
    if (tier === "Silver") return 1.05;
    if (tier === "Gold") return 1.15;
    if (tier === "Platinum") return 1.25;
    if (tier === "Diamond") return 1.40;
    return 1.0;
  };

  const tierMultiplier = getTierMultiplier();
  const baseTapReward = 10;
  const tapReward = Math.floor(baseTapReward * incomePerTapLevel * tierMultiplier);
  const energyCost = energyPerTapLevel;

  const handleTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (now - lastTapTime < 110) return; // Anti-autoclicker

    if (energy < energyCost) return;

    // Update global state
    setEnergy(energy - energyCost);
    addBZ(tapReward);
    incrementTaps(1, tapReward); // Track taps AND income for tasks/NFTs
    setLastTapTime(now);

    // Visual feedback
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    
    const tierBonus = Math.floor((tierMultiplier - 1) * 100);
    const displayText = tierBonus > 0 ? `+${tapReward.toLocaleString()} (+${tierBonus}%)` : `+${tapReward.toLocaleString()}`;
    
    setFloatingNumbers((prev) => [...prev, { id, value: displayText, x, y }]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== id));
    }, 1000);
  };

  const handleQuickCharge = () => {
    if (quickChargeUses <= 0 || quickChargeCooldown > 0 || energy >= displayMaxEnergy * 0.5) return;

    setEnergy(displayMaxEnergy);
    setQuickChargeUses((prev) => prev - 1);
    const cooldownEnd = Date.now() + 3600000;
    setQuickChargeCooldown(3600000);

    localStorage.setItem("quickCharge", JSON.stringify({
      uses: quickChargeUses - 1,
      cooldownEnd,
      resetTime: quickChargeResetTime
    }));
  };

  const formatCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const canQuickCharge = quickChargeUses > 0 && quickChargeCooldown === 0 && energy < displayMaxEnergy * 0.5;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Energy Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">Energy</span>
          </div>
          <span className="text-lg font-bold">
            {Math.floor(energy)} / {displayMaxEnergy}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(energy / displayMaxEnergy) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Recovery: +{recoveryRate.toFixed(2)}/sec
        </p>
      </Card>

      {/* Main Tap Button */}
      <div className="relative flex items-center justify-center py-8">
        <button
          onClick={handleTap}
          disabled={energy < energyCost}
          className="relative w-48 h-48 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <div className="relative z-10 text-white font-bold text-2xl">TAP</div>
          <div className="relative z-10 text-white text-sm mt-1">
            {tapReward > 0 && `+${tapReward.toLocaleString()}`}
            {tierMultiplier > 1 && ` (+${Math.floor((tierMultiplier - 1) * 100)}%)`}
          </div>
        </button>

        {/* Floating Numbers */}
        {floatingNumbers.map((num) => (
          <div
            key={num.id}
            className="absolute pointer-events-none text-2xl font-bold text-yellow-500 animate-float"
            style={{
              left: num.x,
              top: num.y,
              animation: "float 1s ease-out forwards"
            }}
          >
            {num.value}
          </div>
        ))}
      </div>

      {/* QuickCharge Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">QuickCharge</h3>
            <p className="text-xs text-muted-foreground">Instantly restore energy to full</p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">{quickChargeUses}/5 uses</div>
        </div>

        <Button
          onClick={handleQuickCharge}
          disabled={!canQuickCharge}
          className="w-full"
          variant={canQuickCharge ? "default" : "secondary"}
        >
          {quickChargeCooldown > 0 ? (
            <><Clock className="mr-2 h-4 w-4" />Cooldown: {formatCooldown(quickChargeCooldown)}</>
          ) : energy >= displayMaxEnergy * 0.5 ? (
            "Available when energy < 50%"
          ) : quickChargeUses <= 0 ? (
            "No uses remaining"
          ) : (
            <><Zap className="mr-2 h-4 w-4" />Use QuickCharge</>
          )}
        </Button>
      </Card>

      <style jsx>{`
        @keyframes float {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-80px); }
        }
      `}</style>
    </div>
  );
}