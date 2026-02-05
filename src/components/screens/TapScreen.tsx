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
    incrementTotalTaps,
    boosters // Added to calculate recovery rate
  } = useGameState();

  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [canTap, setCanTap] = useState(true);
  const TAP_COOLDOWN = 110;

  // Calculate energy recovery rate locally
  const baseRecovery = 0.3;
  const recoveryMultiplier = 1 + (boosters.recoveryRate - 1) * (0.05 / 0.3);
  const energyRecoveryRate = baseRecovery * recoveryMultiplier;

  // Derived QuickCharge state
  const quickChargeUsesLeft = quickChargeUsesRemaining;
  const quickChargeCooldownRemaining = quickChargeCooldownUntil && Date.now() < quickChargeCooldownUntil
    ? quickChargeCooldownUntil - Date.now()
    : 0;

  const canUseQuickCharge = 
    energy < maxEnergy * 0.5 && 
    quickChargeUsesLeft > 0 && 
    quickChargeCooldownRemaining <= 0;

  const isOnCooldown = !canTap; // Simple alias for UI state

  const formatCooldown = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

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

  useEffect(() => {
    if (quickChargeCooldownRemaining > 0) {
      const interval = setInterval(() => {}, 1000);
      return () => clearInterval(interval);
    }
  }, [quickChargeCooldownRemaining]);

  const energyPercent = Math.min(100, (energy / maxEnergy) * 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-4 px-4 overflow-hidden">
      {/* Energy Display - Reduced Size */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-base font-bold text-white">
              {Math.floor(energy)}/{maxEnergy}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            +{energyRecoveryRate.toFixed(1)}/sec
          </span>
        </div>
        
        {/* Energy Progress Bar - Reduced Height */}
        <div className="relative w-full h-3 bg-slate-800/60 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${energyPercent}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-full" />
        </div>
      </div>

      {/* Tap Circle - Centered with Proper Spacing */}
      <div className="flex-1 flex items-center justify-center my-8">
        <div className="relative">
          {/* Tap Button */}
          <button
            onClick={handleTap}
            disabled={energy < energyCostPerTap || isOnCooldown}
            className={`
              relative w-48 h-48 rounded-full
              bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600
              shadow-2xl shadow-amber-500/50
              transform transition-all duration-150
              ${energy < energyCostPerTap || isOnCooldown
                ? "opacity-50 cursor-not-allowed scale-95"
                : "hover:scale-105 active:scale-95 cursor-pointer"
              }
            `}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-16 h-16 mx-auto mb-2 text-white drop-shadow-lg" />
                <div className="text-2xl font-bold text-white drop-shadow-lg">
                  TAP
                </div>
                <div className="text-sm text-white/90 drop-shadow mt-1">
                  +{tapReward} {tierBonus > 0 && `(+${tierBonus}%)`}
                </div>
              </div>
            </div>
          </button>

          {/* Floating Numbers */}
          {floatingNumbers.map((num) => (
            <div
              key={num.id}
              className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none animate-float-up"
              style={{
                left: `${50 + (Math.random() - 0.5) * 40}%`,
              }}
            >
              <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">
                +{num.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QuickCharge Button - Proper Distance from Tap Circle */}
      <div className="w-full max-w-sm mb-4">
        <Button
          onClick={handleQuickCharge}
          disabled={!canUseQuickCharge}
          className={`
            w-full h-12 text-base font-semibold
            ${canUseQuickCharge
              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              : "bg-slate-700"
            }
          `}
        >
          <Zap className="w-5 h-5 mr-2" />
          QuickCharge
          {!canUseQuickCharge && (
            <span className="ml-2 text-xs">
              ({quickChargeUsesLeft === 0 
                ? formatCooldown(quickChargeCooldownRemaining)
                : "≥50% Energy Required"
              })
            </span>
          )}
        </Button>
        
        {quickChargeUsesLeft > 0 && (
          <div className="text-center mt-2 text-xs text-slate-400">
            {quickChargeUsesLeft} use{quickChargeUsesLeft !== 1 ? "s" : ""} remaining
          </div>
        )}
      </div>
    </div>
  );
}