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
  Slice,
  Lock,
  Clock,
  TrendingUp,
  Flame
} from "lucide-react";

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
  upgrading: boolean;
  upgradeStartTime: number;
  upgradeEndTime: number;
}

interface IdleState {
  lastClaimTime: number;
  activeBuildKey: string | null;
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
  { key: "s1p8", name: "Base Insulation", icon: Slice, stage: 1, index: 8, baseCost: 1200, baseYield: 24 },
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

export function BuildScreen() {
  const { bz, subtractBZ, addBZ, referralCount, tier } = useGameState();
  const [partStates, setPartStates] = useState<Record<PartKey, PartState>>({});
  const [idleState, setIdleState] = useState<IdleState>({
    lastClaimTime: Date.now(),
    activeBuildKey: null
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [powerSurgeUsed, setPowerSurgeUsed] = useState(false);

  // Load persisted state
  useEffect(() => {
    const savedParts = localStorage.getItem("buildParts");
    const savedIdle = localStorage.getItem("idleState");
    const savedPowerSurge = localStorage.getItem("powerSurgeUsed");

    if (savedParts) {
      const loaded = JSON.parse(savedParts);
      setPartStates(loaded);
    } else {
      // Initialize all parts at L0
      const initial: Record<PartKey, PartState> = {};
      allParts.forEach(part => {
        initial[part.key] = { level: 0, upgrading: false, upgradeStartTime: 0, upgradeEndTime: 0 };
      });
      setPartStates(initial);
    }

    if (savedIdle) {
      setIdleState(JSON.parse(savedIdle));
    }

    if (savedPowerSurge) {
      setPowerSurgeUsed(JSON.parse(savedPowerSurge));
    }
  }, []);

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete builds
  useEffect(() => {
    const now = Date.now();
    let updated = false;
    const newStates = { ...partStates };

    Object.keys(newStates).forEach(key => {
      const state = newStates[key];
      if (state.upgrading && now >= state.upgradeEndTime) {
        state.level += 1;
        state.upgrading = false;
        state.upgradeStartTime = 0;
        state.upgradeEndTime = 0;
        updated = true;

        if (idleState.activeBuildKey === key) {
          setIdleState(prev => ({ ...prev, activeBuildKey: null }));
          localStorage.setItem("idleState", JSON.stringify({ ...idleState, activeBuildKey: null }));
        }
      }
    });

    if (updated) {
      setPartStates(newStates);
      localStorage.setItem("buildParts", JSON.stringify(newStates));
    }
  }, [currentTime, partStates, idleState]);

  const savePartStates = (states: Record<PartKey, PartState>) => {
    setPartStates(states);
    localStorage.setItem("buildParts", JSON.stringify(states));
  };

  const saveIdleState = (state: IdleState) => {
    setIdleState(state);
    localStorage.setItem("idleState", JSON.stringify(state));
  };

  // Timer duration by level
  const getUpgradeTime = (level: number): number => {
    if (level < 3) return 0;
    if (level === 3) return 15 * 60 * 1000; // 15m
    if (level === 4) return 30 * 60 * 1000; // 30m
    if (level === 5) return 60 * 60 * 1000; // 1h
    if (level === 6) return 4 * 60 * 60 * 1000; // 4h
    if (level === 7) return 8 * 60 * 60 * 1000; // 8h
    if (level === 8) return 16 * 60 * 60 * 1000; // 16h
    if (level === 9) return 24 * 60 * 60 * 1000; // 24h
    if (level === 10) return 36 * 60 * 60 * 1000; // 36h
    return 48 * 60 * 60 * 1000; // 48h
  };

  // Upgrade cost formula
  const getUpgradeCost = (part: Part, currentLevel: number): number => {
    return Math.floor(
      part.baseCost * Math.pow(1.2, currentLevel) * (1 + 0.10 * part.stage)
    );
  };

  // Yield per hour per part
  const getPartYield = (part: Part, level: number): number => {
    if (level === 0) return 0;
    return part.baseYield * Math.pow(1.15, level) * (1 + 0.15 * part.stage);
  };

  // Total hourly yield
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

  // Tier multiplier
  const getTierMultiplier = (): number => {
    if (tier === "Bronze") return 1.0;
    if (tier === "Silver") return 1.05;
    if (tier === "Gold") return 1.15;
    if (tier === "Platinum") return 1.25;
    if (tier === "Diamond") return 1.40;
    return 1.0;
  };

  // Accrued idle income
  const getAccruedIncome = (): { base: number; surge: number; total: number; hours: number } => {
    const now = Date.now();
    const elapsed = now - idleState.lastClaimTime;
    const hours = Math.min(elapsed / (60 * 60 * 1000), 4); // Cap at 4h

    const hourlyYield = getTotalHourlyYield();
    const tierMultiplier = getTierMultiplier();
    const baseIncome = hourlyYield * hours * tierMultiplier;

    let surgeBonus = 0;
    if (!powerSurgeUsed) {
      if (hours < 1) {
        surgeBonus = 0;
      } else if (hours < 2) {
        surgeBonus = baseIncome * 0.25;
      } else if (hours < 3) {
        surgeBonus = baseIncome * 0.10;
      } else if (hours <= 4) {
        surgeBonus = baseIncome * 0.05;
      }
    }

    return {
      base: Math.floor(baseIncome),
      surge: Math.floor(surgeBonus),
      total: Math.floor(baseIncome + surgeBonus),
      hours
    };
  };

  // Claim idle income
  const handleClaim = () => {
    const accrued = getAccruedIncome();
    if (accrued.total > 0) {
      addBZ(accrued.total);
      saveIdleState({ ...idleState, lastClaimTime: Date.now() });
      
      if (accrued.surge > 0) {
        setPowerSurgeUsed(true);
        localStorage.setItem("powerSurgeUsed", JSON.stringify(true));
      }
    }
  };

  // Start upgrade
  const handleUpgrade = (part: Part) => {
    const state = partStates[part.key];
    if (!state) return;

    const cost = getUpgradeCost(part, state.level);
    if (bz < cost) return;

    if (!canUpgradePart(part)) return;

    // Check for active build
    if (idleState.activeBuildKey && idleState.activeBuildKey !== part.key) return;

    const upgradeTime = getUpgradeTime(state.level);

    if (subtractBZ(cost)) {
      const now = Date.now();
      const newStates = {
        ...partStates,
        [part.key]: {
          ...state,
          upgrading: upgradeTime > 0,
          upgradeStartTime: now,
          upgradeEndTime: now + upgradeTime,
          level: upgradeTime === 0 ? state.level + 1 : state.level
        }
      };

      savePartStates(newStates);

      if (upgradeTime > 0) {
        saveIdleState({ ...idleState, activeBuildKey: part.key });
      }
    }
  };

  // Check if part is unlocked
  const isPartUnlocked = (part: Part): boolean => {
    if (part.index === 1) return true;

    const prevPart = allParts.find(p => p.stage === part.stage && p.index === part.index - 1);
    if (!prevPart) return true;

    const prevState = partStates[prevPart.key];
    return prevState ? prevState.level >= 5 : false;
  };

  // Check if stage is visible
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

  // Check if stage is unlocked (referral gate)
  const isStageUnlocked = (stageId: number): boolean => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return false;
    return referralCount >= stage.referralRequirement;
  };

  // Can upgrade part
  const canUpgradePart = (part: Part): boolean => {
    const state = partStates[part.key];
    if (!state) return false;
    if (state.level >= 20) return false;
    if (state.upgrading) return false;
    if (!isPartUnlocked(part)) return false;
    if (!isStageVisible(part.stage)) return false;
    if (!isStageUnlocked(part.stage)) return false;

    return true;
  };

  // Format time
  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const accrued = getAccruedIncome();
  const hourlyYield = getTotalHourlyYield();
  const tierMultiplier = getTierMultiplier();

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      {/* Idle Income Claim */}
      <Card className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800">
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
            {accrued.surge > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span>PowerSurge Bonus:</span>
                </div>
                <span className="font-bold text-orange-600">+{accrued.surge.toLocaleString()} BZ</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base border-t pt-2">
              <span className="font-semibold">Total Available:</span>
              <span className="font-bold text-lg">{accrued.total.toLocaleString()} BZ</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {accrued.hours.toFixed(1)}h elapsed • 
              {accrued.hours >= 4 ? " Cap reached (4h)" : ` ${(4 - accrued.hours).toFixed(1)}h until cap`}
            </p>
          </div>

          {!powerSurgeUsed && accrued.hours > 0 && (
            <div className="text-xs bg-orange-100 dark:bg-orange-900 p-2 rounded">
              <div className="font-semibold mb-1">PowerSurge Bonus Active:</div>
              <div className="space-y-0.5 text-muted-foreground">
                <div>&lt;1h: +0% • 1-2h: +25%</div>
                <div>2-3h: +10% • 3-4h: +5% • &gt;4h: 0%</div>
              </div>
            </div>
          )}

          <Button
            onClick={handleClaim}
            disabled={accrued.total === 0}
            className="w-full"
            size="lg"
          >
            Claim {accrued.total.toLocaleString()} BZ
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
                const state = partStates[part.key] || { level: 0, upgrading: false, upgradeStartTime: 0, upgradeEndTime: 0 };
                const partUnlocked = isPartUnlocked(part);
                const cost = getUpgradeCost(part, state.level);
                const currentYield = getPartYield(part, state.level);
                const nextYield = getPartYield(part, state.level + 1);
                const yieldDelta = nextYield - currentYield;
                const upgradeTime = getUpgradeTime(state.level);
                const timeRemaining = state.upgrading ? Math.max(0, state.upgradeEndTime - currentTime) : 0;
                const canUpgrade = canUpgradePart(part);
                const isActive = idleState.activeBuildKey === part.key;

                let statusText = "";
                let statusColor = "";
                if (!partUnlocked) {
                  statusText = "Locked";
                  statusColor = "text-muted-foreground";
                } else if (!unlocked) {
                  statusText = "Stage Locked";
                  statusColor = "text-red-600";
                } else if (state.upgrading) {
                  statusText = `Building... ${formatTime(timeRemaining)}`;
                  statusColor = "text-blue-600";
                } else if (state.level >= 20) {
                  statusText = "Max Level";
                  statusColor = "text-green-600";
                } else {
                  statusText = "Ready";
                  statusColor = "text-green-600";
                }

                return (
                  <Card 
                    key={part.key} 
                    className={`p-3 ${isActive ? "border-blue-500 border-2" : ""} ${!partUnlocked || !unlocked ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${unlocked && partUnlocked ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-5 w-5 ${unlocked && partUnlocked ? "text-primary" : "text-muted-foreground"}`} />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{part.name}</h3>
                              {!partUnlocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {currentYield > 0 ? `${currentYield.toFixed(1)} BZ/h` : "Not built"}
                              {yieldDelta > 0 && state.level < 20 && ` → +${yieldDelta.toFixed(1)} BZ/h`}
                            </p>
                          </div>
                          <Badge variant="outline">L{state.level}</Badge>
                        </div>

                        {upgradeTime > 0 && state.level < 20 && !state.upgrading && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Next build: {formatTime(upgradeTime)}</span>
                          </div>
                        )}

                        <div className={`text-sm font-medium ${statusColor}`}>
                          {statusText}
                        </div>

                        {state.upgrading && timeRemaining > 0 && (
                          <Progress value={((upgradeTime - timeRemaining) / upgradeTime) * 100} className="h-2" />
                        )}

                        <Button
                          onClick={() => handleUpgrade(part)}
                          disabled={!canUpgrade || state.level >= 20 || (idleState.activeBuildKey !== null && idleState.activeBuildKey !== part.key)}
                          className="w-full"
                          size="sm"
                          variant={canUpgrade && state.level < 20 ? "default" : "secondary"}
                        >
                          {!partUnlocked ? (
                            "Locked - Upgrade Previous Part"
                          ) : !unlocked ? (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Stage Locked
                            </>
                          ) : state.level >= 20 ? (
                            "Max Level Reached"
                          ) : state.upgrading ? (
                            "Building..."
                          ) : idleState.activeBuildKey && idleState.activeBuildKey !== part.key ? (
                            "Another Build Active"
                          ) : bz < cost ? (
                            `Need ${cost.toLocaleString()} BZ`
                          ) : (
                            `Upgrade for ${cost.toLocaleString()} BZ`
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}