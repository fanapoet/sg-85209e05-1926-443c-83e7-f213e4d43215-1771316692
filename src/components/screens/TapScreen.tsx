import { useGameState } from "@/contexts/GameStateContext";
import { updateTaskProgress } from "@/services/tasksService";
import { Zap } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function TapScreen() {
  const { 
    energy, 
    maxEnergy, 
    addBZ, 
    boosters,
    quickChargeCooldownUntil,
    useQuickCharge: triggerQuickCharge,
    subtractEnergy,
    totalTaps,
    incrementTotalTaps,
    tier,
    quickChargeUsesRemaining
  } = useGameState();

  const [canTap, setCanTap] = useState(true);
  const [floatingNumbers, setFloatingNumbers] = useState<Array<{ id: number; value: number; x: number; y: number }>>([]);
  const [quickChargeCooldownRemaining, setQuickChargeCooldownRemaining] = useState(0);

  const energyCostPerTap = boosters.energyPerTap;
  const incomePerTap = boosters.incomePerTap;

  const formatNumber = (num: number) => num.toLocaleString();

  // Calculate energy recovery rate for display
  // Base 0.3, roughly +0.1 per level for display approximation
  const displayRecoveryRate = 0.3 + ((boosters.recoveryRate - 1) * 0.1);

  // Tier Bonus Calculation
  const tierBonuses = {
    Bronze: 0,
    Silver: 5,
    Gold: 15,
    Platinum: 25,
    Diamond: 40
  };
  const tierBonus = tierBonuses[tier];

  // Tap Reward Calculation Function
  const calculateTapReward = () => {
    const baseTapReward = 10 * incomePerTap;
    const bonusAmount = Math.floor(baseTapReward * (tierBonus / 100));
    return baseTapReward + bonusAmount;
  };

  const tapReward = calculateTapReward();

  const formatCooldown = (seconds: number): string => {
    if (seconds <= 0) return "Ready";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check QuickCharge cooldown
  useEffect(() => {
    const checkQuickCharge = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil(((quickChargeCooldownUntil || 0) - now) / 1000));
      setQuickChargeCooldownRemaining(remaining);
    };
    
    checkQuickCharge();
    const interval = setInterval(checkQuickCharge, 1000);
    return () => clearInterval(interval);
  }, [quickChargeCooldownUntil]);

  const canUseQuickCharge = energy < maxEnergy * 0.5 && 
    quickChargeUsesRemaining > 0 && 
    quickChargeCooldownRemaining <= 0;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTap || energy < energyCostPerTap) return;

    const reward = calculateTapReward();
    addBZ(reward);
    subtractEnergy(energyCostPerTap);
    incrementTotalTaps();

    // Update task progress for "Tap 100 Times"
    const tapTask = "daily_tap_100";
    updateTaskProgress(tapTask, {
      currentProgress: totalTaps + 1,
      isCompleted: (totalTaps + 1) >= 100
    });

    // Visual Effects
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const floatingId = Date.now();
    setFloatingNumbers(prev => [...prev, { id: floatingId, value: reward, x, y }]);
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(num => num.id !== floatingId));
    }, 1000);

    setCanTap(false);
    setTimeout(() => setCanTap(true), 110);
  };

  const handleQuickCharge = () => {
    if (canUseQuickCharge) {
      triggerQuickCharge();
      setQuickChargeCooldownRemaining(3600);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-md">
        
        {/* Top Stats Row */}
        <div className="flex items-center justify-between gap-4 mb-8">
          
          {/* LEFT: Lifetime Taps */}
          <div className="flex flex-col items-start bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-200/50 dark:border-amber-700/50 min-w-[100px]">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Taps</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(totalTaps)}
            </div>
          </div>

          {/* RIGHT: Energy Bar */}
          <div className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-2 border border-amber-200/50 dark:border-amber-700/50">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">
                  {Math.floor(energy)}/{maxEnergy}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                +{displayRecoveryRate.toFixed(1)}/s
              </span>
            </div>
            {/* Small Energy Bar Height (h-2) */}
            <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${(energy / maxEnergy) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center: Tap Circle */}
        {/* Added my-8 for vertical spacing from top elements */}
        <div className="relative flex flex-col items-center justify-center my-8">
          <div
            onClick={handleTap}
            className={`relative w-64 h-64 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl flex flex-col items-center justify-center cursor-pointer transform transition-all duration-150 active:scale-95 ${
              canTap && energy >= energyCostPerTap ? "hover:scale-105" : "opacity-50 cursor-not-allowed"
            }`}
          >
            {/* Bunergy Logo Icon */}
            <div className="relative w-32 h-32 mb-2">
              <Image
                src="/bunergy-icon.png"
                alt="Bunergy"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* TAP Text */}
            <div className="text-white text-2xl font-bold mb-1">TAP</div>
            
            {/* Reward Display */}
            <div className="text-white/90 text-sm">
              +{formatNumber(tapReward)} {tierBonus > 0 && `(+${tierBonus}%)`}
            </div>
          </div>

          {/* Floating Numbers */}
          {floatingNumbers.map((num) => (
            <div
              key={num.id}
              className="absolute text-2xl font-bold text-amber-600 dark:text-amber-400 pointer-events-none animate-float-up"
              style={{
                left: `${num.x}px`,
                top: `${num.y}px`,
              }}
            >
              +{formatNumber(num.value)} {tierBonus > 0 && `(+${tierBonus}%)`}
            </div>
          ))}
        </div>

        {/* Bottom: QuickCharge Button */}
        {/* Added mt-8 for distance from tap circle */}
        <div className="w-full max-w-xs mx-auto mt-8">
          <button
            onClick={handleQuickCharge}
            disabled={!canUseQuickCharge}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              canUseQuickCharge
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            {quickChargeCooldownRemaining > 0
              ? `QuickCharge (${formatCooldown(quickChargeCooldownRemaining)})`
              : "QuickCharge ⚡"}
          </button>
          {/* Uses Remaining Text */}
          <div className="text-center mt-2 text-sm text-muted-foreground h-5">
            {canUseQuickCharge ? (
              `${quickChargeUsesRemaining} use${quickChargeUsesRemaining !== 1 ? "s" : ""} remaining`
            ) : (
              quickChargeCooldownRemaining > 0 ? "Cooldown active" : 
              quickChargeUsesRemaining === 0 ? "No uses left today" : 
              "Energy too high"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}