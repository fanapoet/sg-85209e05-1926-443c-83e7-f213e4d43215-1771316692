import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

interface FloatingNumber {
  id: number;
  value: number;
  x: number;
  y: number;
  tierBonus: number;
}

export function TapScreen() {
  const { 
    energy, 
    maxEnergy, 
    bz, 
    addBZ, 
    subtractEnergy, 
    tier,
    quickChargeUsesRemaining,
    quickChargeCooldownUntil,
    useQuickCharge: triggerQuickCharge,
    checkAndResetQuickCharge,
    totalTaps,
    incrementTotalTaps
  } = useGameState();

  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [canTap, setCanTap] = useState(true);
  const TAP_COOLDOWN = 110;

  // Check and reset QuickCharge on mount (same pattern as daily rewards)
  useEffect(() => {
    checkAndResetQuickCharge();
  }, [checkAndResetQuickCharge]);

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

  const incomePerTapLevel = getBoosterLevel("incomePerTap");
  const energyPerTapLevel = getBoosterLevel("energyPerTap");
  const energyCostPerTap = energyPerTapLevel;

  const getTierMultiplier = (): number => {
    if (tier === "Bronze") return 1.0;
    if (tier === "Silver") return 1.05;
    if (tier === "Gold") return 1.15;
    if (tier === "Platinum") return 1.25;
    if (tier === "Diamond") return 1.40;
    return 1.0;
  };

  const getTierBonus = (): number => {
    const multiplier = getTierMultiplier();
    return Math.floor((multiplier - 1) * 100);
  };

  const tierMultiplier = getTierMultiplier();
  const tierBonus = getTierBonus();

  const baseTapReward = 10;
  const tapReward = Math.floor(baseTapReward * incomePerTapLevel * tierMultiplier);

  const handleTap = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    if (!canTap || now - lastTapTime < TAP_COOLDOWN) return;
    if (energy < energyCostPerTap) return;

    setCanTap(false);
    setLastTapTime(now);

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newFloating: FloatingNumber = {
      id: now,
      value: tapReward,
      x,
      y,
      tierBonus
    };

    setFloatingNumbers(prev => [...prev, newFloating]);
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(f => f.id !== newFloating.id));
    }, 1000);

    addBZ(tapReward);
    subtractEnergy(energyCostPerTap);
    incrementTotalTaps();

    setTimeout(() => setCanTap(true), TAP_COOLDOWN);
  }, [canTap, lastTapTime, energy, energyCostPerTap, tapReward, addBZ, subtractEnergy, tierBonus, incrementTotalTaps]);

  const handleQuickCharge = () => {
    if (energy >= maxEnergy * 0.5) return;
    if (quickChargeUsesRemaining <= 0) return;
    if (quickChargeCooldownUntil && Date.now() < quickChargeCooldownUntil) return;

    triggerQuickCharge();
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const quickChargeAvailable = quickChargeUsesRemaining > 0 && 
    (!quickChargeCooldownUntil || Date.now() >= quickChargeCooldownUntil);
  const quickChargeDisabled = energy >= maxEnergy * 0.5 || !quickChargeAvailable;
  const quickChargeCooldownRemaining = quickChargeCooldownUntil && Date.now() < quickChargeCooldownUntil
    ? quickChargeCooldownUntil - Date.now()
    : 0;

  useEffect(() => {
    if (quickChargeCooldownRemaining > 0) {
      const interval = setInterval(() => {}, 1000);
      return () => clearInterval(interval);
    }
  }, [quickChargeCooldownRemaining]);

  const energyPercent = Math.min(100, (energy / maxEnergy) * 100);

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col">
      {/* Top Stats */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="text-left">
            <p className="text-sm text-muted-foreground">Taps</p>
            <p className="text-2xl font-bold text-primary">{totalTaps.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Energy</p>
            <p className="text-2xl font-bold">{Math.floor(energy)}/{maxEnergy}</p>
          </div>
        </div>
        <Progress value={energyPercent} className="h-3 mb-2" />
      </div>

      {/* Center Circle - Takes remaining space */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative" style={{ width: '280px', height: '280px' }}>
          <button
            onClick={handleTap}
            disabled={energy < energyCostPerTap}
            className="w-full h-full rounded-full bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 dark:from-pink-900 dark:via-purple-900 dark:to-blue-900 border-4 border-primary shadow-2xl active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 mb-2">
                <Image
                  src="/bunergy-icon.png"
                  alt="Tap"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold drop-shadow-lg">
                  +{tapReward.toLocaleString()}
                </p>
                {tierBonus > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-semibold drop-shadow">
                    (+{tierBonus}%)
                  </p>
                )}
              </div>
            </div>

            {floatingNumbers.map(num => (
              <div
                key={num.id}
                className="absolute text-2xl font-bold text-primary animate-float pointer-events-none"
                style={{
                  left: `${num.x}px`,
                  top: `${num.y}px`,
                  animation: 'float 1s ease-out forwards'
                }}
              >
                +{num.value.toLocaleString()}
                {num.tierBonus > 0 && (
                  <span className="text-sm text-green-600 dark:text-green-400 ml-1">
                    (+{num.tierBonus}%)
                  </span>
                )}
              </div>
            ))}
          </button>
        </div>
      </div>

      {/* QuickCharge Button */}
      <div className="px-6 pb-24">
        <Button
          onClick={handleQuickCharge}
          disabled={quickChargeDisabled}
          variant={quickChargeDisabled ? "secondary" : "default"}
          className="w-full"
          size="lg"
        >
          <Zap className="mr-2 h-5 w-5" />
          {quickChargeCooldownRemaining > 0 ? (
            `QuickCharge (${formatTime(quickChargeCooldownRemaining)})`
          ) : energy >= maxEnergy * 0.5 ? (
            "Need < 50% Energy"
          ) : quickChargeUsesRemaining === 0 ? (
            "QuickCharge (0/5)"
          ) : (
            `QuickCharge (${quickChargeUsesRemaining}/5)`
          )}
        </Button>
      </div>

      <style jsx>{`
        @keyframes float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
}