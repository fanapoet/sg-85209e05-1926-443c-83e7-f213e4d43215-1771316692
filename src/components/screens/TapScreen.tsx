import { useGameState } from "@/contexts/GameStateContext";
import { Zap, Battery } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TapScreen() {
  const { 
    energy, 
    maxEnergy, 
    bz, 
    addBZ, 
    tier, 
    boosters, 
    quickChargeUsesRemaining,
    quickChargeCooldownUntil,
    useQuickCharge: triggerQuickCharge 
  } = useGameState();

  const [canTap, setCanTap] = useState(true);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{ id: number; value: number; bonus: number; x: number; y: number }>>([]);
  const [quickChargeUsesLeft, setQuickChargeUsesLeft] = useState(quickChargeUsesRemaining);
  const [quickChargeCooldownRemaining, setQuickChargeCooldownRemaining] = useState(0);

  const energyPerTap = boosters.energyPerTap;
  const incomePerTap = boosters.incomePerTap;

  // Calculate energy recovery rate (base 0.3 + booster)
  const baseRecoveryRate = 0.3;
  const recoveryRateBonus = boosters.recoveryRate * 0.1;
  const totalRecoveryRate = baseRecoveryRate + recoveryRateBonus;

  const tierBonuses = {
    Bronze: 0,
    Silver: 5,
    Gold: 15,
    Platinum: 25,
    Diamond: 40
  };
  const tierBonus = tierBonuses[tier];

  const formatCooldown = (seconds: number): string => {
    if (seconds <= 0) return "Ready";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check and reset QuickCharge on mount
  useEffect(() => {
    const checkQuickCharge = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil(((quickChargeCooldownUntil || 0) - now) / 1000));
      setQuickChargeCooldownRemaining(remaining);
      setQuickChargeUsesLeft(quickChargeUsesRemaining);
    };
    
    checkQuickCharge();
    const interval = setInterval(checkQuickCharge, 1000);
    return () => clearInterval(interval);
  }, [quickChargeCooldownUntil, quickChargeUsesRemaining]);

  const canUseQuickCharge = energy < maxEnergy * 0.5 && 
    quickChargeUsesLeft > 0 && 
    quickChargeCooldownRemaining <= 0;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTap || energy < energyPerTap) return;

    const baseTapReward = 10 * incomePerTap;
    const bonusAmount = Math.floor(baseTapReward * (tierBonus / 100));
    const totalReward = baseTapReward + bonusAmount;

    addBZ(totalReward, energyPerTap);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Date.now() + Math.random();
    setFloatingNumbers(prev => [...prev, { id, value: baseTapReward, bonus: bonusAmount, x, y }]);
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(num => num.id !== id));
    }, 1000);

    setCanTap(false);
    setTimeout(() => setCanTap(true), 110);
  };

  const handleQuickCharge = () => {
    if (canUseQuickCharge) {
      triggerQuickCharge();
      setQuickChargeUsesLeft(prev => prev - 1);
      setQuickChargeCooldownRemaining(3600);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full py-6 px-4">
      {/* Energy Bar - Smaller size as requested */}
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">{Math.floor(energy)}/{maxEnergy}</span>
          </div>
          <span className="text-xs text-muted-foreground">+{totalRecoveryRate.toFixed(1)}/s</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
            style={{ width: `${(energy / maxEnergy) * 100}%` }}
          />
        </div>
      </div>

      {/* Tap Circle */}
      <div className="relative flex-1 flex items-center justify-center">
        <div 
          onClick={handleTap}
          className={`
            relative w-64 h-64 rounded-full 
            bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600
            shadow-2xl shadow-orange-500/50
            flex items-center justify-center
            ${canTap && energy >= energyPerTap ? 'cursor-pointer active:scale-95' : 'opacity-50 cursor-not-allowed'}
            transition-all duration-200
            border-4 border-amber-300/30
          `}
        >
          <div className="text-center">
            <Battery className="w-20 h-20 text-white mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">TAP</div>
            <div className="text-sm text-white/90">+{10 * incomePerTap} (+{tierBonus}%)</div>
          </div>

          {floatingNumbers.map(num => (
            <div
              key={num.id}
              className="absolute pointer-events-none animate-float-up font-bold"
              style={{ 
                left: `${num.x}px`, 
                top: `${num.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="text-2xl text-white drop-shadow-lg">
                +{num.value.toLocaleString()}
                {num.bonus > 0 && (
                  <span className="text-base text-green-300"> (+{num.bonus})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QuickCharge Button - Added proper spacing from tap circle */}
      <div className="w-full max-w-md mt-12">
        <Button
          onClick={handleQuickCharge}
          disabled={!canUseQuickCharge}
          className="w-full"
          size="lg"
        >
          <Zap className="w-5 h-5 mr-2" />
          QuickCharge {quickChargeCooldownRemaining > 0 && `(${formatCooldown(quickChargeCooldownRemaining)})`}
        </Button>
        {quickChargeUsesLeft > 0 && quickChargeCooldownRemaining <= 0 && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            {quickChargeUsesLeft} use{quickChargeUsesLeft !== 1 ? "s" : ""} remaining
          </div>
        )}
      </div>
    </div>
  );
}