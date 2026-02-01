import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { recordReferralEarnings } from "@/services/referralService";
import type React from "react";

interface FloatingNumber {
  id: number;
  value: string;
  x: number;
  y: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

export function TapScreen() {
  const { 
    bz, 
    energy, 
    maxEnergy, 
    addBZ, 
    setEnergy, 
    tier, 
    incrementTaps,
    totalTaps
  } = useGameState();

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [quickChargeUses, setQuickChargeUses] = useState(5);
  const [quickChargeCooldown, setQuickChargeCooldown] = useState(0);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [displayMaxEnergy, setDisplayMaxEnergy] = useState(maxEnergy);
  const [recoveryRate, setRecoveryRate] = useState(0.3);
  const [bunnyScale, setBunnyScale] = useState(1);
  const [bunnyGlow, setBunnyGlow] = useState(false);

  // Ensure theme is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkTheme = mounted ? resolvedTheme === "dark" : true;

  // Load persisted QuickCharge state and check for 24h reset
  useEffect(() => {
    const saved = localStorage.getItem("quickCharge");
    const now = Date.now();
    
    if (saved) {
      const data = JSON.parse(saved);
      
      const timeSinceReset = now - (data.lastResetTime || 0);
      const TWENTY_FOUR_HOURS = 86400000;
      
      if (timeSinceReset >= TWENTY_FOUR_HOURS) {
        setQuickChargeUses(5);
        setQuickChargeCooldown(0);
        localStorage.setItem("quickCharge", JSON.stringify({
          uses: 5,
          cooldownEnd: 0,
          lastResetTime: now
        }));
      } else {
        setQuickChargeUses(data.uses || 5);
        setQuickChargeCooldown(Math.max(0, (data.cooldownEnd || 0) - now));
      }
    } else {
      localStorage.setItem("quickCharge", JSON.stringify({
        uses: 5,
        cooldownEnd: 0,
        lastResetTime: now
      }));
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

  // Check for 24h reset every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem("quickCharge");
      if (!saved) return;
      
      const data = JSON.parse(saved);
      const now = Date.now();
      const timeSinceReset = now - (data.lastResetTime || 0);
      const TWENTY_FOUR_HOURS = 86400000;
      
      if (timeSinceReset >= TWENTY_FOUR_HOURS) {
        setQuickChargeUses(5);
        setQuickChargeCooldown(0);
        localStorage.setItem("quickCharge", JSON.stringify({
          uses: 5,
          cooldownEnd: 0,
          lastResetTime: now
        }));
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

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
  const tapReward = Math.ceil(baseTapReward * incomePerTapLevel * tierMultiplier);
  const energyCost = energyPerTapLevel;

  const createParticles = (x: number, y: number) => {
    const newParticles: Particle[] = [];
    const colors = ["#fbbf24", "#f59e0b", "#f97316", "#ef4444", "#ec4899"];
    
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 2;
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles((prev) => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1000);
  };

  const handleTap = async (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (energy < energyCost || isOnCooldown) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setIsOnCooldown(true);
    setTimeout(() => setIsOnCooldown(false), 110);

    setEnergy(energy - energyCost);
    addBZ(tapReward);
    
    incrementTaps(1, tapReward);

    // Bunny animation
    setBunnyScale(1.15);
    setBunnyGlow(true);
    setTimeout(() => {
      setBunnyScale(1);
      setBunnyGlow(false);
    }, 150);

    // Ripple effect
    setRipples((prev) => [...prev, { id: Date.now(), x, y }]);

    // Milestone particles (every 100th tap)
    if ((totalTaps + 1) % 100 === 0) {
      createParticles(x, y);
    }

    // Floating numbers
    setFloatingNumbers((prev) => [...prev, { 
      id: Date.now(), 
      value: (totalTaps + 1) % 100 === 0 ? `🎉 +${tapReward} MILESTONE!` : `+${tapReward}`, 
      x, 
      y 
    }]);
  };

  const handleQuickCharge = () => {
    if (quickChargeUses <= 0 || quickChargeCooldown > 0 || energy >= displayMaxEnergy * 0.5) return;

    setEnergy(displayMaxEnergy);
    setQuickChargeUses((prev) => prev - 1);
    const cooldownEnd = Date.now() + 3600000;
    setQuickChargeCooldown(3600000);

    const saved = localStorage.getItem("quickCharge");
    const lastResetTime = saved ? JSON.parse(saved).lastResetTime : Date.now();
    
    localStorage.setItem("quickCharge", JSON.stringify({
      uses: quickChargeUses - 1,
      cooldownEnd,
      lastResetTime
    }));
  };

  const formatCooldown = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const canQuickCharge = quickChargeUses > 0 && quickChargeCooldown === 0 && energy < displayMaxEnergy * 0.5;
  const isEnergyFull = energy >= displayMaxEnergy * 0.95;

  return (
    <div className="p-3 space-y-2 max-w-2xl mx-auto pb-24">
      {/* Ultra-Compact Stats - Single Row */}
      <Card className="p-1.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Left: Lifetime Taps */}
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-orange-500" />
            <div>
              <span className="text-[10px] text-muted-foreground">Taps</span>
              <div className="text-sm font-bold text-orange-500">
                {totalTaps.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Right: Energy */}
          <div className="flex items-center gap-1.5">
            <Zap className={`h-3 w-3 text-yellow-500 ${isEnergyFull ? 'animate-pulse' : ''}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">Energy</span>
                {isEnergyFull && (
                  <span className="text-[8px] text-green-500 font-semibold">⚡FULL</span>
                )}
              </div>
              <div className="text-xs font-bold mb-0.5">
                {Math.floor(energy)}/{displayMaxEnergy}
              </div>
              <div className="w-full bg-muted rounded-full h-1 relative overflow-hidden">
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    isEnergyFull 
                      ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 animate-pulse shadow-lg shadow-yellow-500/50' 
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${(energy / displayMaxEnergy) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Ultra-Compact QuickCharge */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-blue-500" />
          <span className="text-xs font-semibold">QuickCharge</span>
          <span className="text-[10px] text-muted-foreground">{quickChargeUses}/5</span>
        </div>
        <Button
          onClick={handleQuickCharge}
          disabled={!canQuickCharge}
          size="sm"
          className="h-6 text-[10px] px-2"
          variant={canQuickCharge ? "default" : "secondary"}
        >
          {quickChargeCooldown > 0 ? (
            <><Clock className="mr-1 h-2.5 w-2.5" />{formatCooldown(quickChargeCooldown)}</>
          ) : energy >= displayMaxEnergy * 0.5 ? (
            "Need < 50%"
          ) : quickChargeUses <= 0 ? (
            "No uses"
          ) : (
            "Use"
          )}
        </Button>
      </div>

      {/* Bunny Character Tap Area - Theme-Aware Background */}
      <div className="relative flex flex-col items-center justify-center py-4">
        {/* Tap Info */}
        <div className="text-center mb-3">
          <div className="text-sm text-muted-foreground">Tap to earn</div>
          <div className="text-2xl font-bold text-yellow-500">
            +{tapReward.toLocaleString()} BZ
            {tierMultiplier > 1 && (
              <span className="text-sm text-orange-500 ml-1">
                (+{Math.floor((tierMultiplier - 1) * 100)}%)
              </span>
            )}
          </div>
        </div>

        {/* Bunny Character Button - Theme-Aware */}
        <button
          onClick={handleTap}
          onTouchStart={handleTap}
          disabled={energy < energyCost}
          className="relative select-none touch-manipulation transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ 
            WebkitTapHighlightColor: "transparent",
            transform: `scale(${bunnyScale})`,
            filter: bunnyGlow ? 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))' : 'none'
          }}
        >
          {/* Theme-Aware Background Circle - LARGE SIZE (400px) */}
          <div 
            className="absolute inset-0 rounded-full backdrop-blur-lg border-2 transition-all duration-300"
            style={{
              width: '400px',
              height: '400px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: isDarkTheme 
                ? 'rgba(88, 28, 135, 0.25)' 
                : 'rgba(249, 168, 212, 0.35)',
              borderColor: isDarkTheme 
                ? 'rgba(168, 85, 247, 0.4)' 
                : 'rgba(236, 72, 153, 0.5)',
              boxShadow: isDarkTheme 
                ? '0 8px 32px rgba(168, 85, 247, 0.3), inset 0 0 60px rgba(139, 92, 246, 0.1)' 
                : '0 8px 32px rgba(236, 72, 153, 0.2), inset 0 0 60px rgba(249, 168, 212, 0.15)'
            }}
          />

          {/* Bunny Character Image - New Transparent One */}
          <img
            src="/bunny-character-new.png?v=2"
            alt="Bunny Character"
            className="w-80 h-80 object-contain pointer-events-none select-none relative z-10"
            draggable={false}
          />
            
          {/* Glow effect on tap */}
          {bunnyGlow && (
            <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping z-10" />
          )}

          {/* Character Level Badge */}
          <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-20">
            Lv {Math.floor(totalTaps / 1000) + 1}
          </div>
        </button>

        {/* Ripple Effects */}
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
            onAnimationEnd={() => {
              setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
            }}
          >
            <div className="absolute w-0 h-0 rounded-full border-4 border-yellow-400/60 animate-ripple" />
          </div>
        ))}

        {/* Particle Effects */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute pointer-events-none w-2 h-2 rounded-full animate-particle"
            style={{
              left: particle.x,
              top: particle.y,
              backgroundColor: particle.color,
              '--particle-vx': `${particle.vx * 30}px`,
              '--particle-vy': `${particle.vy * 30}px`,
            } as React.CSSProperties}
          />
        ))}

        {/* Floating Numbers */}
        {floatingNumbers.map((num) => (
          <div
            key={num.id}
            className={`absolute pointer-events-none font-bold animate-float ${
              num.value.includes('MILESTONE') ? 'text-3xl text-orange-500' : 'text-2xl text-yellow-500'
            }`}
            style={{
              left: num.x,
              top: num.y,
            }}
            onAnimationEnd={() => {
              setFloatingNumbers((prev) => prev.filter((n) => n.id !== num.id));
            }}
          >
            {num.value}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-80px); }
        }
        
        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 200px; height: 200px; opacity: 0; margin-left: -100px; margin-top: -100px; }
        }
        
        @keyframes particle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--particle-vx), var(--particle-vy)) scale(0); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-float {
          animation: float 1.5s ease-out;
        }
        
        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
        
        .animate-particle {
          animation: particle 1s ease-out forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}