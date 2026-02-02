import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Hammer, 
  Wrench, 
  Settings, 
  Cpu, 
  Zap, 
  Battery, 
  Cog, 
  Radio, 
  Gauge, 
  Shield,
  CircuitBoard,
  Cable,
  Plug,
  Database,
  HardDrive,
  Monitor,
  Keyboard,
  Mouse,
  Speaker,
  Wifi,
  Bluetooth,
  Usb,
  Box,
  Package,
  Layers,
  Grid,
  Boxes,
  Container,
  Lock,
  Clock,
  TrendingUp,
  Flame,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { recordReferralEarnings } from "@/services/referralService";
import { getCurrentTelegramUser } from "@/services/authService";
import { syncBuildParts, syncBuildPart, syncPlayerState, loadBuildParts } from "@/services/syncService";

// Speed-Up Configuration
const SPEEDUP_CONFIG = {
  minLevel: 4,
  bbCostPerHour: 0.01,
  starCostPerHour: 1,
  minBBCost: 0.005,
  minStarCost: 1,
};

type PartKey = string;

interface Part {
  key: PartKey;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  stage: number;
  index: number;
  baseCost: number;
  baseYield: number;
}

interface PartState {
  level: number;
  isBuilding: boolean;
  buildEndsAt: number;
}

interface IdleState {
  lastClaimTime: number;
  activeBuildKey: string | null;
}

interface CompletionCelebration {
  partKey: string;
  show: boolean;
}

const stages = [
  { id: 1, name: "Foundation", referralRequirement: 0 },
  { id: 2, name: "Core System", referralRequirement: 10 },
  { id: 3, name: "Circuitry", referralRequirement: 20 },
  { id: 4, name: "Interface", referralRequirement: 30 },
  { id: 5, name: "Final Assembly", referralRequirement: 40 }
];

const allParts: Part[] = [
  // Stage 1: Foundation (10 parts)
  { key: "s1p1", name: "Base Frame", icon: Box, stage: 1, index: 1, baseCost: 500, baseYield: 10 },
  { key: "s1p2", name: "Support Beams", icon: Layers, stage: 1, index: 2, baseCost: 600, baseYield: 12 },
  { key: "s1p3", name: "Foundation Plate", icon: Grid, stage: 1, index: 3, baseCost: 700, baseYield: 14 },
  { key: "s1p4", name: "Anchor Bolts", icon: Hammer, stage: 1, index: 4, baseCost: 800, baseYield: 16 },
  { key: "s1p5", name: "Structural Core", icon: Container, stage: 1, index: 5, baseCost: 900, baseYield: 18 },
  { key: "s1p6", name: "Mounting Brackets", icon: Wrench, stage: 1, index: 6, baseCost: 1000, baseYield: 20 },
  { key: "s1p7", name: "Reinforcement Rods", icon: Shield, stage: 1, index: 7, baseCost: 1100, baseYield: 22 },
  { key: "s1p8", name: "Base Insulation", icon: Package, stage: 1, index: 8, baseCost: 1200, baseYield: 24 },
  { key: "s1p9", name: "Leveling System", icon: Gauge, stage: 1, index: 9, baseCost: 1300, baseYield: 26 },
  { key: "s1p10", name: "Foundation Seal", icon: Package, stage: 1, index: 10, baseCost: 1400, baseYield: 28 },

  // Stage 2: Core System (10 parts)
  { key: "s2p1", name: "Main Processor", icon: Cpu, stage: 2, index: 1, baseCost: 2000, baseYield: 35 },
  { key: "s2p2", name: "Power Supply", icon: Battery, stage: 2, index: 2, baseCost: 2200, baseYield: 38 },
  { key: "s2p3", name: "Cooling System", icon: Settings, stage: 2, index: 3, baseCost: 2400, baseYield: 41 },
  { key: "s2p4", name: "Memory Banks", icon: Database, stage: 2, index: 4, baseCost: 2600, baseYield: 44 },
  { key: "s2p5", name: "Storage Drive", icon: HardDrive, stage: 2, index: 5, baseCost: 2800, baseYield: 47 },
  { key: "s2p6", name: "Logic Unit", icon: CircuitBoard, stage: 2, index: 6, baseCost: 3000, baseYield: 50 },
  { key: "s2p7", name: "Control Hub", icon: Cog, stage: 2, index: 7, baseCost: 3200, baseYield: 53 },
  { key: "s2p8", name: "Energy Core", icon: Zap, stage: 2, index: 8, baseCost: 3400, baseYield: 56 },
  { key: "s2p9", name: "Regulation Module", icon: Gauge, stage: 2, index: 9, baseCost: 3600, baseYield: 59 },
  { key: "s2p10", name: "Core Shield", icon: Shield, stage: 2, index: 10, baseCost: 3800, baseYield: 62 },

  // Stage 3: Circuitry (10 parts)
  { key: "s3p1", name: "Main Board", icon: CircuitBoard, stage: 3, index: 1, baseCost: 5000, baseYield: 75 },
  { key: "s3p2", name: "Power Cables", icon: Cable, stage: 3, index: 2, baseCost: 5300, baseYield: 79 },
  { key: "s3p3", name: "Data Lines", icon: Plug, stage: 3, index: 3, baseCost: 5600, baseYield: 83 },
  { key: "s3p4", name: "Signal Router", icon: Radio, stage: 3, index: 4, baseCost: 5900, baseYield: 87 },
  { key: "s3p5", name: "Connector Array", icon: Usb, stage: 3, index: 5, baseCost: 6200, baseYield: 91 },
  { key: "s3p6", name: "Relay System", icon: Boxes, stage: 3, index: 6, baseCost: 6500, baseYield: 95 },
  { key: "s3p7", name: "Circuit Breaker", icon: Zap, stage: 3, index: 7, baseCost: 6800, baseYield: 99 },
  { key: "s3p8", name: "Voltage Regulator", icon: Battery, stage: 3, index: 8, baseCost: 7100, baseYield: 103 },
  { key: "s3p9", name: "Thermal Sensors", icon: Gauge, stage: 3, index: 9, baseCost: 7400, baseYield: 107 },
  { key: "s3p10", name: "Circuit Shield", icon: Shield, stage: 3, index: 10, baseCost: 7700, baseYield: 111 },

  // Stage 4: Interface (10 parts)
  { key: "s4p1", name: "Display Panel", icon: Monitor, stage: 4, index: 1, baseCost: 10000, baseYield: 140 },
  { key: "s4p2", name: "Input Module", icon: Keyboard, stage: 4, index: 2, baseCost: 10500, baseYield: 147 },
  { key: "s4p3", name: "Control Interface", icon: Mouse, stage: 4, index: 3, baseCost: 11000, baseYield: 154 },
  { key: "s4p4", name: "Audio System", icon: Speaker, stage: 4, index: 4, baseCost: 11500, baseYield: 161 },
  { key: "s4p5", name: "Network Adapter", icon: Wifi, stage: 4, index: 5, baseCost: 12000, baseYield: 168 },
  { key: "s4p6", name: "Wireless Module", icon: Bluetooth, stage: 4, index: 6, baseCost: 12500, baseYield: 175 },
  { key: "s4p7", name: "Port Assembly", icon: Usb, stage: 4, index: 7, baseCost: 13000, baseYield: 182 },
  { key: "s4p8", name: "Indicator Lights", icon: Radio, stage: 4, index: 8, baseCost: 13500, baseYield: 189 },
  { key: "s4p9", name: "Status Display", icon: Gauge, stage: 4, index: 9, baseCost: 14000, baseYield: 196 },
  { key: "s4p10", name: "Interface Shield", icon: Shield, stage: 4, index: 10, baseCost: 14500, baseYield: 203 },

  // Stage 5: Final Assembly (10 parts)
  { key: "s5p1", name: "Outer Casing", icon: Box, stage: 5, index: 1, baseCost: 18000, baseYield: 250 },
  { key: "s5p2", name: "Panel Mounts", icon: Layers, stage: 5, index: 2, baseCost: 19000, baseYield: 263 },
  { key: "s5p3", name: "Fastener Kit", icon: Hammer, stage: 5, index: 3, baseCost: 20000, baseYield: 276 },
  { key: "s5p4", name: "Sealing Gaskets", icon: Package, stage: 5, index: 4, baseCost: 21000, baseYield: 289 },
  { key: "s5p5", name: "Ventilation Grills", icon: Settings, stage: 5, index: 5, baseCost: 22000, baseYield: 302 },
  { key: "s5p6", name: "Cable Management", icon: Cable, stage: 5, index: 6, baseCost: 23000, baseYield: 315 },
  { key: "s5p7", name: "Final Connectors", icon: Plug, stage: 5, index: 7, baseCost: 24000, baseYield: 328 },
  { key: "s5p8", name: "Quality Seals", icon: Shield, stage: 5, index: 8, baseCost: 25000, baseYield: 341 },
  { key: "s5p9", name: "Inspection Tags", icon: Container, stage: 5, index: 9, baseCost: 26000, baseYield: 354 },
  { key: "s5p10", name: "Completion Badge", icon: Boxes, stage: 5, index: 10, baseCost: 27000, baseYield: 367 }
];

const BUILD_DURATION = 10 * 1000; // 10 seconds for testing

export function BuildScreen() {
  const { 
    bz, 
    subtractBZ, 
    addBZ, 
    referralCount, 
    tier, 
    setBzPerHour, 
    incrementUpgrades, 
    addXP, 
    markIdleClaimed, 
    hasClaimedIdleToday, 
    bb, 
    subtractBB,
    xp,
    energy,
    maxEnergy,
    totalTaps,
    lastClaimTimestamp
  } = useGameState();
  const { toast } = useToast();
  const [partStates, setPartStates] = useState<Record<PartKey, PartState>>({});
  const [idleState, setIdleState] = useState<IdleState>({
    lastClaimTime: Date.now(),
    activeBuildKey: null
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isLoaded, setIsLoaded] = useState(false);
  const [upgradeButtonMessage, setUpgradeButtonMessage] = useState<Record<PartKey, string>>({});
  const [completionCelebrations, setCompletionCelebrations] = useState<Record<PartKey, boolean>>({});
  const [claimAnimating, setClaimAnimating] = useState(false);
  const [speedUpDialog, setSpeedUpDialog] = useState<{
    open: boolean;
    partKey: string | null;
    step: "choose" | "confirmBB";
  }>({ open: false, partKey: null, step: "choose" });

  // Initialize from localStorage FIRST (instant load)
  useEffect(() => {
    console.log("🏗️ [BuildScreen] Initializing from localStorage...");
    
    try {
      // Load part states
      const savedParts = localStorage.getItem("buildParts");
      if (savedParts) {
        const parsed = JSON.parse(savedParts);
        console.log("✅ [BuildScreen] Loaded", Object.keys(parsed).length, "parts from localStorage");
        setPartStates(parsed);
      } else {
        // Initialize fresh state
        console.log("📝 [BuildScreen] No saved parts, initializing fresh state");
        const initial: Record<string, PartState> = {};
        allParts.forEach(p => {
          initial[p.key] = { level: 0, isBuilding: false, buildEndsAt: 0 };
        });
        setPartStates(initial);
        localStorage.setItem("buildParts", JSON.stringify(initial));
      }

      // Load idle state
      const savedIdle = localStorage.getItem("idleState");
      if (savedIdle) {
        const parsed = JSON.parse(savedIdle);
        console.log("✅ [BuildScreen] Loaded idleState:", parsed);
        setIdleState(parsed);
      } else {
        const initial = { lastClaimTime: Date.now(), activeBuildKey: null };
        setIdleState(initial);
        localStorage.setItem("idleState", JSON.stringify(initial));
      }

      setIsLoaded(true);
      console.log("✅ [BuildScreen] Local state loaded successfully");
    } catch (e) {
      console.error("❌ [BuildScreen] Failed to load from localStorage:", e);
      // Fallback to fresh state
      const initial: Record<string, PartState> = {};
      allParts.forEach(p => {
        initial[p.key] = { level: 0, isBuilding: false, buildEndsAt: 0 };
      });
      setPartStates(initial);
      setIsLoaded(true);
    }
  }, []);

  // AFTER local load, merge with server data (if available)
  useEffect(() => {
    if (!isLoaded) return;

    const mergeServerData = async () => {
      console.log("🔄 [BuildScreen] Merging with server data...");
      
      try {
        const serverParts = await loadBuildParts();
        
        if (serverParts && serverParts.length > 0) {
          console.log("📥 [BuildScreen] Server has", serverParts.length, "parts");
          
          setPartStates(current => {
            const merged = { ...current };
            
            serverParts.forEach(sp => {
              const local = merged[sp.partId] || { level: 0, isBuilding: false, buildEndsAt: 0 };
              
              // Use Math.max for level (never downgrade)
              const mergedLevel = Math.max(local.level, sp.level);
              
              // For building status, prefer active builds
              const isServerBuilding = sp.isBuilding && sp.buildEndsAt && sp.buildEndsAt > Date.now();
              
              merged[sp.partId] = {
                level: mergedLevel,
                isBuilding: isServerBuilding || local.isBuilding,
                buildEndsAt: isServerBuilding ? (sp.buildEndsAt || 0) : local.buildEndsAt
              };
              
              console.log(`🔄 [BuildScreen] ${sp.partId}: Local=${local.level}, Server=${sp.level}, Merged=${mergedLevel}`);
            });
            
            // Save merged result
            localStorage.setItem("buildParts", JSON.stringify(merged));
            console.log("✅ [BuildScreen] Server data merged successfully");
            
            return merged;
          });
        } else {
          console.log("📭 [BuildScreen] No server data to merge");
        }
      } catch (err) {
        console.error("❌ [BuildScreen] Error merging server data:", err);
      }
    };

    mergeServerData();
  }, [isLoaded]);

  // SAVE to localStorage whenever partStates changes
  useEffect(() => {
    if (!isLoaded) return;
    
    console.log("💾 [BuildScreen] Saving partStates to localStorage...");
    localStorage.setItem("buildParts", JSON.stringify(partStates));
    console.log("✅ [BuildScreen] partStates saved");
  }, [partStates, isLoaded]);

  // SAVE to localStorage whenever idleState changes
  useEffect(() => {
    if (!isLoaded) return;
    
    console.log("💾 [BuildScreen] Saving idleState to localStorage...");
    localStorage.setItem("idleState", JSON.stringify(idleState));
    console.log("✅ [BuildScreen] idleState saved");
  }, [idleState, isLoaded]);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete builds with celebration
  useEffect(() => {
    if (!isLoaded) return;

    const now = Date.now();
    let updated = false;
    const newStates = { ...partStates };
    const newCelebrations = { ...completionCelebrations };

    Object.keys(newStates).forEach(key => {
      const state = newStates[key];
      if (state.isBuilding && now >= state.buildEndsAt) {
        console.log("🎉 [BuildScreen] Build completed:", key);
        
        state.level += 1;
        state.isBuilding = false;
        state.buildEndsAt = 0;
        updated = true;

        newCelebrations[key] = true;
        setTimeout(() => {
          setCompletionCelebrations(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }, 3000);

        // Clear active build if this was it
        if (idleState.activeBuildKey === key) {
          setIdleState(prev => ({ ...prev, activeBuildKey: null }));
        }

        // Sync completed build to DB
        const syncCompleted = async () => {
          try {
            const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            if (!tgUser) return;
            
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("telegram_id", tgUser.id)
              .maybeSingle();
            
            if (profile) {
              await syncBuildPart(profile.id, {
                partId: key,
                level: state.level,
                isBuilding: false,
                buildEndsAt: 0,
              });
              console.log("✅ [BuildScreen] Completed build synced to DB");
            }
          } catch (err) {
            console.error("❌ [BuildScreen] Error syncing completed build:", err);
          }
        };
        
        syncCompleted();
      }
    });

    if (updated) {
      setPartStates(newStates);
      setCompletionCelebrations(newCelebrations);
    }
  }, [currentTime, isLoaded, partStates, idleState]);

  // Update global bzPerHour
  useEffect(() => {
    if (!isLoaded) return;
    const totalYield = getTotalHourlyYield();
    setBzPerHour(totalYield);
  }, [partStates, isLoaded, setBzPerHour]);

  const getUpgradeTime = (level: number): number => {
    if (level < 3) return 0;
    if (level === 3) return 15 * 60 * 1000;
    if (level === 4) return 30 * 60 * 1000;
    if (level === 5) return 60 * 60 * 1000;
    if (level === 6) return 4 * 60 * 60 * 1000;
    if (level === 7) return 8 * 60 * 60 * 1000;
    if (level === 8) return 16 * 60 * 60 * 1000;
    if (level === 9) return 24 * 60 * 60 * 1000;
    if (level === 10) return 36 * 60 * 60 * 1000;
    return 48 * 60 * 60 * 1000;
  };

  const getUpgradeCost = (part: Part, currentLevel: number): number => {
    const baseCost = part.baseCost;
    const exponential = Math.pow(1.2, currentLevel);
    const stageFactor = 1 + (0.10 * part.stage);
    const rawCost = baseCost * exponential * stageFactor;
    const finalCost = Math.floor(rawCost);
    
    return finalCost;
  };

  const getPartYield = (part: Part, level: number): number => {
    if (level === 0) return 0;
    return part.baseYield * Math.pow(1.15, level) * (1 + 0.15 * part.stage);
  };

  const getTotalHourlyYield = (): number => {
    let total = 0;
    allParts.forEach(part => {
      const state = partStates[part.key];
      if (state) {
        total += getPartYield(part, state.level);
      }
    });
    return total;
  };

  const getTierMultiplier = (): number => {
    if (tier === "Bronze") return 1.0;
    if (tier === "Silver") return 1.05;
    if (tier === "Gold") return 1.15;
    if (tier === "Platinum") return 1.25;
    if (tier === "Diamond") return 1.40;
    return 1.0;
  };

  const getAccruedIncome = (): { base: number; surge: number; total: number; hours: number } => {
    const now = Date.now();
    const elapsed = now - idleState.lastClaimTime;
    const hours = Math.min(elapsed / (60 * 60 * 1000), 4);

    const hourlyYield = getTotalHourlyYield();
    const tierMultiplier = getTierMultiplier();
    const baseIncome = hourlyYield * hours * tierMultiplier;

    let surgeBonus = 0;
    if (hours >= 1 && hours < 2) {
      surgeBonus = baseIncome * 0.25;
    } else if (hours >= 2 && hours < 3) {
      surgeBonus = baseIncome * 0.10;
    } else if (hours >= 3 && hours <= 4) {
      surgeBonus = baseIncome * 0.05;
    }

    return {
      base: Math.floor(baseIncome),
      surge: Math.floor(surgeBonus),
      total: Math.floor(baseIncome + surgeBonus),
      hours
    };
  };

  const getSpeedUpCost = (timeRemaining: number): { bb: number; stars: number } => {
    const hoursRemaining = timeRemaining / (60 * 60 * 1000);
    const bbCost = Math.max(
      SPEEDUP_CONFIG.minBBCost,
      hoursRemaining * SPEEDUP_CONFIG.bbCostPerHour
    );
    const starCost = Math.max(
      SPEEDUP_CONFIG.minStarCost,
      Math.ceil(hoursRemaining * SPEEDUP_CONFIG.starCostPerHour)
    );
    return { bb: Number(bbCost.toFixed(6)), stars: starCost };
  };

  const canSpeedUp = (part: Part, state: PartState): boolean => {
    if (!state.isBuilding) return false;
    if (part.stage < 1 || state.level < SPEEDUP_CONFIG.minLevel - 1) return false;
    const timeRemaining = Math.max(0, state.buildEndsAt - currentTime);
    return timeRemaining > 0;
  };

  const handleClaim = () => {
    const accrued = getAccruedIncome();
    if (accrued.total > 0) {
      setClaimAnimating(true);
      
      addBZ(accrued.total);
      
      setIdleState(prev => ({ ...prev, lastClaimTime: Date.now() }));
      
      markIdleClaimed();
      
      const trackEarnings = async () => {
        try {
          const user = getCurrentTelegramUser();
          if (user) {
            await recordReferralEarnings(user.id, accrued.total, 'idle');
          }
        } catch (err) {
          console.error("Error tracking referral earnings:", err);
        }
      };
      trackEarnings();

      toast({
        title: "Income Claimed!",
        description: `You received ${accrued.total.toLocaleString()} BZ${accrued.surge > 0 ? ` (including ${accrued.surge.toLocaleString()} BZ PowerSurge bonus)` : ""}`,
      });

      setTimeout(() => setClaimAnimating(false), 1000);
    }
  };

  const handleOpenSpeedUp = (partKey: string) => {
    setSpeedUpDialog({ open: true, partKey, step: "choose" });
  };

  const handleCloseSpeedUp = () => {
    setSpeedUpDialog({ open: false, partKey: null, step: "choose" });
  };

  const handleBBPaymentRequest = () => {
    setSpeedUpDialog(prev => ({ ...prev, step: "confirmBB" }));
  };

  const handleConfirmBBPayment = () => {
    const { partKey } = speedUpDialog;
    if (!partKey) return;

    const part = allParts.find(p => p.key === partKey);
    const state = partStates[partKey];
    if (!part || !state) return;

    const timeRemaining = Math.max(0, state.buildEndsAt - currentTime);
    const cost = getSpeedUpCost(timeRemaining);

    if (bb < cost.bb) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${cost.bb.toFixed(6)} BB but only have ${bb.toFixed(6)} BB.`,
        variant: "destructive"
      });
      handleCloseSpeedUp();
      return;
    }

    if (subtractBB(cost.bb)) {
      completeBuildInstantly(partKey);
      
      toast({
        title: "Build Completed!",
        description: `Spent ${cost.bb.toFixed(6)} BB to complete "${part.name}" instantly.`,
      });

      handleCloseSpeedUp();
    }
  };

  const handleStarsPayment = async () => {
    toast({
      title: "Coming Soon! 🚀",
      description: "Telegram Stars payment will be available soon. Use BB payment for now!",
    });
    handleCloseSpeedUp();
  };

  const completeBuildInstantly = (partKey: string) => {
    const state = partStates[partKey];
    if (!state.isBuilding) return;

    console.log("⚡ [BuildScreen] Speed-up instant completion:", partKey);

    setPartStates(prev => ({
      ...prev,
      [partKey]: {
        level: state.level + 1,
        isBuilding: false,
        buildEndsAt: 0
      }
    }));

    // Clear active build
    setIdleState(prev => ({ ...prev, activeBuildKey: null }));
    
    // Sync to DB
    const syncSpeedUp = async () => {
      try {
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser) return;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_id", tgUser.id)
          .maybeSingle();
        
        if (profile) {
          await syncBuildPart(profile.id, {
            partId: partKey,
            level: state.level + 1,
            isBuilding: false,
            buildEndsAt: 0
          });
          console.log("✅ [BuildScreen] Speed-up synced to DB");
        }
      } catch (err) {
        console.error("❌ [BuildScreen] Speed-up sync error:", err);
      }
    };
    
    syncSpeedUp();
  };

  const handleUpgrade = (part: Part) => {
    const state = partStates[part.key];
    const cost = getUpgradeCost(part, state.level);
    const upgradeTime = getUpgradeTime(state.level);

    console.log("🔨 [BuildScreen] Upgrade clicked:", part.name);
    console.log("   Current level:", state.level);
    console.log("   Cost:", cost, "BZ");
    console.log("   Time:", upgradeTime, "ms");
    console.log("   Active build:", idleState.activeBuildKey);

    // Check if can afford
    if (bz < cost) {
      console.log("❌ [BuildScreen] Cannot afford");
      return;
    }

    // Check if already building
    if (state.isBuilding) {
      console.log("❌ [BuildScreen] Already building this part");
      return;
    }

    // Check if another build is active
    if (idleState.activeBuildKey !== null && idleState.activeBuildKey !== part.key) {
      console.log("❌ [BuildScreen] Another build is active:", idleState.activeBuildKey);
      toast({
        title: "Build in Progress",
        description: "Complete the current build before starting another.",
        variant: "destructive"
      });
      return;
    }

    console.log("✅ [BuildScreen] Starting upgrade...");

    // Deduct BZ
    if (!subtractBZ(cost)) {
      console.log("❌ [BuildScreen] Failed to deduct BZ");
      return;
    }

    console.log("✅ [BuildScreen] BZ deducted");

    // Update part state
    const endTime = Date.now() + upgradeTime;
    setPartStates(prev => ({
      ...prev,
      [part.key]: {
        level: upgradeTime === 0 ? state.level + 1 : state.level,
        isBuilding: upgradeTime > 0,
        buildEndsAt: upgradeTime > 0 ? endTime : 0
      }
    }));

    // Set active build
    if (upgradeTime > 0) {
      setIdleState(prev => ({ ...prev, activeBuildKey: part.key }));
      console.log("🏗️ [BuildScreen] Set active build:", part.key);
    }

    // Track upgrade
    incrementUpgrades();

    console.log("✅ [BuildScreen] Local state updated");

    // Sync to DB in background
    setTimeout(() => {
      const syncUpgrade = async () => {
        try {
          const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          if (!tgUser) return;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("telegram_id", tgUser.id)
            .maybeSingle();
          
          if (profile) {
            await syncBuildPart(profile.id, {
              partId: part.key,
              level: upgradeTime === 0 ? state.level + 1 : state.level,
              isBuilding: upgradeTime > 0,
              buildEndsAt: upgradeTime > 0 ? endTime : 0
            });
            console.log("✅ [BuildScreen] Upgrade synced to DB");
          }
        } catch (err) {
          console.error("❌ [BuildScreen] Upgrade sync error:", err);
        }
      };
      
      syncUpgrade();
    }, 100);
  };

  const isPartUnlocked = (part: Part): boolean => {
    if (part.index === 1) return true;

    const prevPart = allParts.find(p => p.stage === part.stage && p.index === part.index - 1);
    if (!prevPart) return true;

    const prevState = partStates[prevPart.key];
    return prevState ? prevState.level >= 5 : false;
  };

  const isStageVisible = (stageId: number): boolean => {
    if (stageId === 1) return true;

    const prevStage = stageId - 1;
    const prevStageParts = allParts.filter(p => p.stage === prevStage);
    const prevStageL5Count = prevStageParts.filter(p => {
      const state = partStates[p.key];
      return state && state.level >= 5;
    }).length;

    return prevStageL5Count >= prevStageParts.length * 0.8;
  };

  const isStageUnlocked = (stageId: number): boolean => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return false;
    return referralCount >= stage.referralRequirement;
  };

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (!isLoaded) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading build state...</p>
      </div>
    );
  }

  const accrued = getAccruedIncome();
  const hourlyYield = getTotalHourlyYield();
  const tierMultiplier = getTierMultiplier();

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      {/* Idle Income Claim */}
      <Card className={`p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800 transition-all duration-300 ${claimAnimating ? 'scale-105 shadow-xl' : ''}`}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Idle Production</h3>
              <p className="text-sm text-muted-foreground">
                {hourlyYield.toFixed(1)} BZ/h
                {tierMultiplier > 1 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    (+{Math.floor((tierMultiplier - 1) * 100)}%)
                  </span>
                )}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-600" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Base Income:</span>
              <span className="font-bold">{accrued.base.toLocaleString()} BZ</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>PowerSurge Bonus:</span>
              </div>
              <span className={`font-bold ${accrued.surge > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                {accrued.surge > 0 ? `+${accrued.surge.toLocaleString()}` : "+0"} BZ
              </span>
            </div>
            
            <div className="flex items-center justify-between text-base border-t pt-2">
              <span className="font-semibold">Total Available:</span>
              <span className="font-bold text-lg">{accrued.total.toLocaleString()} BZ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {accrued.hours.toFixed(1)}h elapsed • 
              {accrued.hours >= 4 ? " Cap reached (4h)" : ` ${(4 - accrued.hours).toFixed(1)}h until cap`}
            </p>
          </div>

          <div className="text-xs bg-orange-100 dark:bg-orange-900 p-2 rounded h-[60px] flex flex-col justify-center">
            <div className="flex items-center gap-1 font-semibold mb-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span>PowerSurge Bonus (Active Every Claim):</span>
            </div>
            <div className="text-muted-foreground text-[10px]">
              1-2h: +25% • 2-3h: +10% • 3-4h: +5% • Claim within optimal windows!
            </div>
          </div>

          <Button
            onClick={handleClaim}
            disabled={accrued.total === 0}
            className="w-full relative overflow-hidden"
            size="lg"
          >
            {claimAnimating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
            <span className="relative z-10">Claim {accrued.total.toLocaleString()} BZ</span>
          </Button>
        </div>
      </Card>

      {/* Stages */}
      {stages.map(stage => {
        const visible = isStageVisible(stage.id);
        const unlocked = isStageUnlocked(stage.id);
        const stageParts = allParts.filter(p => p.stage === stage.id);

        if (!visible) return null;

        return (
          <div key={stage.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Stage {stage.id}: {stage.name}</h2>
              {!unlocked && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {stage.referralRequirement} referrals needed
                </Badge>
              )}
            </div>

            {!unlocked && (
              <Card className="p-3 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                <p className="text-sm text-center">
                  This stage requires {stage.referralRequirement} referrals. Current: {referralCount}
                </p>
              </Card>
            )}

            <div className="space-y-2">
              {stageParts.map(part => {
                const Icon = part.icon;
                const state = partStates[part.key] || { level: 0, isBuilding: false, buildEndsAt: 0 };
                const partUnlocked = isPartUnlocked(part);
                const cost = getUpgradeCost(part, state.level);
                const currentYield = getPartYield(part, state.level);
                const nextYield = getPartYield(part, state.level + 1);
                const yieldDelta = nextYield - currentYield;
                const upgradeTime = getUpgradeTime(state.level);
                const timeRemaining = state.isBuilding ? Math.max(0, state.buildEndsAt - currentTime) : 0;
                const isActive = idleState.activeBuildKey === part.key;
                const isCelebrating = completionCelebrations[part.key];

                // Determine button state
                let buttonText = "";
                let buttonIcon = null;
                let buttonDisabled = true;
                let buttonVariant: "default" | "secondary" = "secondary";

                if (!unlocked) {
                  buttonText = "Stage Locked";
                  buttonIcon = <Lock className="mr-2 h-4 w-4" />;
                  buttonDisabled = true;
                } else if (!partUnlocked) {
                  buttonText = "Requires Prev Part L5";
                  buttonIcon = <Lock className="mr-2 h-4 w-4" />;
                  buttonDisabled = true;
                } else if (state.level >= 20) {
                  buttonText = "Max Level Reached";
                  buttonIcon = <CheckCircle2 className="mr-2 h-4 w-4" />;
                  buttonDisabled = true;
                } else if (state.isBuilding) {
                  buttonText = "Building...";
                  buttonDisabled = true;
                } else if (idleState.activeBuildKey && idleState.activeBuildKey !== part.key) {
                  buttonText = "Another Build Active";
                  buttonDisabled = true;
                } else if (bz < cost) {
                  buttonText = `Need ${cost.toLocaleString()} BZ`;
                  buttonDisabled = true;
                } else {
                  buttonText = `Upgrade for ${cost.toLocaleString()} BZ`;
                  buttonDisabled = false;
                  buttonVariant = "default";
                }

                return (
                  <Card 
                    key={part.key} 
                    className={`p-4 relative transition-all duration-300 ${
                      isActive ? "border-blue-500 border-2" : ""
                    } ${
                      isCelebrating ? "scale-105 shadow-xl border-green-500 border-2" : ""
                    }`}
                  >
                    {isCelebrating && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                          <Sparkles className="h-3 w-3" />
                          <span>Complete!</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg flex-shrink-0 transition-all duration-300 ${
                        unlocked && partUnlocked ? "bg-primary/10" : "bg-muted"
                      } ${
                        isCelebrating ? "bg-green-500/20 animate-pulse" : ""
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          unlocked && partUnlocked ? "text-primary" : "text-muted-foreground"
                        } ${
                          isCelebrating ? "text-green-500" : ""
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Name + Badge Row - ALWAYS PRESENT */}
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">{part.name}</h3>
                          <Badge variant="outline" className="flex-shrink-0">
                            {state.level === 20 ? "MAX" : `L${state.level}`}
                          </Badge>
                        </div>

                        {/* Yield Info */}
                        <p className="text-xs text-muted-foreground">
                          {currentYield > 0 ? `${currentYield.toFixed(1)} BZ/h` : "Not built"}
                          {yieldDelta > 0 && state.level < 20 && ` → +${yieldDelta.toFixed(1)} BZ/h`}
                        </p>

                        {/* Build Time Info */}
                        {upgradeTime > 0 && state.level < 20 && !state.isBuilding && unlocked && partUnlocked && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>Next build: {formatTime(upgradeTime)}</span>
                          </div>
                        )}

                        {/* Progress Bar - if building */}
                        {state.isBuilding && timeRemaining > 0 && (
                          <div className="space-y-1">
                            <Progress 
                              value={((upgradeTime - timeRemaining) / upgradeTime) * 100} 
                              className="h-2"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{Math.floor(((upgradeTime - timeRemaining) / upgradeTime) * 100)}%</span>
                              <span>{formatTime(timeRemaining)} left</span>
                            </div>
                          </div>
                        )}

                        {/* SINGLE BUTTON - ALWAYS PRESENT */}
                        <Button
                          onClick={() => handleUpgrade(part)}
                          disabled={buttonDisabled}
                          className="w-full"
                          size="sm"
                          variant={buttonVariant}
                        >
                          {buttonIcon}
                          {buttonText}
                        </Button>

                        {/* Speed Up Button - conditional */}
                        {canSpeedUp(part, state) && (
                          <Button
                            onClick={() => handleOpenSpeedUp(part.key)}
                            className="w-full mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                            size="sm"
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            Speed Up: {getSpeedUpCost(Math.max(0, state.buildEndsAt - currentTime)).bb.toFixed(3)} BB or {getSpeedUpCost(Math.max(0, state.buildEndsAt - currentTime)).stars} ⭐
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Speed-Up Dialog */}
      {speedUpDialog.open && speedUpDialog.partKey && (() => {
        const part = allParts.find(p => p.key === speedUpDialog.partKey);
        const state = partStates[speedUpDialog.partKey];
        if (!part || !state) return null;

        const timeRemaining = Math.max(0, state.buildEndsAt - currentTime);
        const cost = getSpeedUpCost(timeRemaining);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
              {speedUpDialog.step === "choose" ? (
                <>
                  <div className="text-center">
                    <Zap className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                    <h2 className="text-xl font-bold">⚡ Speed Up Build?</h2>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    <p className="font-semibold">{part.name} (Level {state.level + 1})</p>
                    <p>Time remaining: {formatTime(timeRemaining)}</p>
                  </div>

                  <p className="text-center">Complete instantly?</p>

                  <Card className="p-4 space-y-2 border-2 hover:border-primary transition-colors cursor-pointer" onClick={handleBBPaymentRequest}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          💎
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Pay with $BUNBUN (BB)</p>
                          <p className="text-xs text-muted-foreground">Cost: {cost.bb.toFixed(6)} BB</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Balance: {bb.toFixed(6)} BB</p>
                    <Button className="w-full" variant="outline">
                      Pay {cost.bb.toFixed(6)} BB
                    </Button>
                  </Card>

                  <Card className="p-4 space-y-2 border-2 border-muted bg-muted/50 cursor-not-allowed opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          ⭐
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">Telegram Stars</p>
                          <p className="text-xs text-muted-foreground">Coming Soon! 🚀</p>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </Card>

                  <Button onClick={handleCloseSpeedUp} variant="ghost" className="w-full">
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <h2 className="text-xl font-bold">Confirm Payment</h2>
                  </div>

                  <div className="text-center text-sm space-y-2">
                    <p>Spend <span className="font-bold">{cost.bb.toFixed(6)} BB</span> to complete</p>
                    <p className="font-semibold">"{part.name}"</p>
                    <p>instantly?</p>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current balance:</span>
                      <span className="font-semibold">{bb.toFixed(6)} BB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">After payment:</span>
                      <span className="font-semibold">{(bb - cost.bb).toFixed(6)} BB</span>
                    </div>
                  </div>

                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded text-xs">
                    <p>⚠️ This will complete the build instantly and grant XP reward.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCloseSpeedUp} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmBBPayment} className="flex-1">
                      Confirm Payment
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        );
      })()}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 1s infinite;
        }
      `}</style>
    </div>
  );
}