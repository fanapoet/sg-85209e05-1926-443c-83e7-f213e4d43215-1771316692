import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

interface GameState {
  bz: number;
  bb: number;
  energy: number;
  maxEnergy: number;
  bzPerHour: number;
  tier: Tier;
  xp: number;
  referralCount: number;
  
  // Stats for tasks
  totalTaps: number;
  totalUpgrades: number;
  totalConversions: number;
  hasClaimedIdleToday: boolean;
  
  // Methods
  addBZ: (amount: number) => void;
  subtractBZ: (amount: number) => boolean;
  addBB: (amount: number) => void;
  subtractBB: (amount: number) => boolean;
  addXP: (amount: number) => void;
  setEnergy: (value: number) => void;
  setMaxEnergy: (value: number) => void;
  setBzPerHour: (value: number) => void;
  addReferral: () => void;
  
  // Task tracking methods
  incrementTaps: (count: number) => void;
  incrementUpgrades: () => void;
  incrementConversions: (amount: number) => void;
  markIdleClaimed: () => void;
}

const GameStateContext = createContext<GameState | null>(null);

// Safe localStorage helpers with fallbacks
const safeGetItem = (key: string, defaultValue: any) => {
  try {
    if (typeof window === "undefined") return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const safeSetItem = (key: string, value: any) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
};

export function GameStateProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage with safe fallbacks
  const [bz, setBz] = useState(() => safeGetItem("bunergy_bz", 5000));
  const [bb, setBb] = useState(() => safeGetItem("bunergy_bb", 0.0));
  const [energy, setEnergyState] = useState(() => safeGetItem("bunergy_energy", 1500));
  const [maxEnergy, setMaxEnergyState] = useState(() => safeGetItem("bunergy_maxEnergy", 1500));
  const [bzPerHour, setBzPerHourState] = useState(() => safeGetItem("bunergy_bzPerHour", 0));
  const [xp, setXp] = useState(() => safeGetItem("bunergy_xp", 0));
  const [referralCount, setReferralCount] = useState(() => safeGetItem("bunergy_referralCount", 0));

  // Task tracking stats
  const [totalTaps, setTotalTaps] = useState(() => safeGetItem("bunergy_totalTaps", 0));
  const [totalUpgrades, setTotalUpgrades] = useState(() => safeGetItem("bunergy_totalUpgrades", 0));
  const [totalConversions, setTotalConversions] = useState(() => safeGetItem("bunergy_totalConversions", 0));
  const [hasClaimedIdleToday, setHasClaimedIdleToday] = useState(() => safeGetItem("bunergy_hasClaimedIdleToday", false));

  // Persist to localStorage on changes
  useEffect(() => {
    safeSetItem("bunergy_bz", bz);
  }, [bz]);

  useEffect(() => {
    safeSetItem("bunergy_bb", bb);
  }, [bb]);

  useEffect(() => {
    safeSetItem("bunergy_energy", energy);
  }, [energy]);

  useEffect(() => {
    safeSetItem("bunergy_maxEnergy", maxEnergy);
  }, [maxEnergy]);

  useEffect(() => {
    safeSetItem("bunergy_bzPerHour", bzPerHour);
  }, [bzPerHour]);

  useEffect(() => {
    safeSetItem("bunergy_xp", xp);
  }, [xp]);

  useEffect(() => {
    safeSetItem("bunergy_referralCount", referralCount);
  }, [referralCount]);

  useEffect(() => {
    safeSetItem("bunergy_totalTaps", totalTaps);
  }, [totalTaps]);

  useEffect(() => {
    safeSetItem("bunergy_totalUpgrades", totalUpgrades);
  }, [totalUpgrades]);

  useEffect(() => {
    safeSetItem("bunergy_totalConversions", totalConversions);
  }, [totalConversions]);

  useEffect(() => {
    safeSetItem("bunergy_hasClaimedIdleToday", hasClaimedIdleToday);
  }, [hasClaimedIdleToday]);

  // Calculate tier based on XP
  const getTier = (xpValue: number): Tier => {
    if (xpValue >= 500001) return "Diamond";
    if (xpValue >= 150001) return "Platinum";
    if (xpValue >= 50001) return "Gold";
    if (xpValue >= 10001) return "Silver";
    return "Bronze";
  };

  const tier = getTier(xp);

  // Get booster levels from localStorage for energy recovery
  const getBoosterLevel = (key: string): number => {
    try {
      const saved = localStorage.getItem("boosters");
      if (!saved) return 1;
      const data = JSON.parse(saved);
      return data[key] || 1;
    } catch {
      return 1;
    }
  };

  // Energy recovery: base 0.3/sec + (recoveryRate level - 1) × 0.05/sec
  useEffect(() => {
    const interval = setInterval(() => {
      const recoveryRateLevel = getBoosterLevel("recoveryRate");
      const recoveryPerSecond = 0.3 + (recoveryRateLevel - 1) * 0.05;
      
      setEnergyState((prev) => {
        const newEnergy = prev + recoveryPerSecond;
        return newEnergy >= maxEnergy ? maxEnergy : newEnergy;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [maxEnergy]);

  // Anti-rollback: prevent negative values
  const addBZ = (amount: number) => {
    if (amount > 0) {
      setBz((prev) => Math.max(0, prev + amount));
    }
  };

  const subtractBZ = (amount: number): boolean => {
    if (amount <= 0) return false;
    if (bz >= amount) {
      setBz((prev) => Math.max(0, prev - amount));
      return true;
    }
    return false;
  };

  const addBB = (amount: number) => {
    if (amount > 0) {
      setBb((prev) => Math.max(0, prev + amount));
    }
  };

  const subtractBB = (amount: number): boolean => {
    if (amount <= 0) return false;
    if (bb >= amount) {
      setBb((prev) => Math.max(0, prev - amount));
      return true;
    }
    return false;
  };

  const addXP = (amount: number) => {
    if (amount > 0) {
      setXp((prev) => Math.max(0, prev + amount));
    }
  };

  const setEnergy = (value: number) => {
    setEnergyState(Math.max(0, Math.min(value, maxEnergy)));
  };

  const setMaxEnergy = (value: number) => {
    if (value > 0) {
      setMaxEnergyState(Math.max(1500, value));
    }
  };

  const setBzPerHour = (value: number) => {
    if (value >= 0) {
      setBzPerHourState(Math.max(0, value));
    }
  };

  const addReferral = () => {
    setReferralCount((prev) => prev + 1);
  };

  // Task tracking methods
  const incrementTaps = (count: number) => {
    setTotalTaps((prev) => prev + count);
  };

  const incrementUpgrades = () => {
    setTotalUpgrades((prev) => prev + 1);
  };

  const incrementConversions = (amount: number) => {
    setTotalConversions((prev) => prev + amount);
  };

  const markIdleClaimed = () => {
    setHasClaimedIdleToday(true);
  };

  return (
    <GameStateContext.Provider
      value={{
        bz,
        bb,
        energy,
        maxEnergy,
        bzPerHour,
        tier,
        xp,
        referralCount,
        totalTaps,
        totalUpgrades,
        totalConversions,
        hasClaimedIdleToday,
        addBZ,
        subtractBZ,
        addBB,
        subtractBB,
        addXP,
        setEnergy,
        setMaxEnergy,
        setBzPerHour,
        addReferral,
        incrementTaps,
        incrementUpgrades,
        incrementConversions,
        markIdleClaimed,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used within GameStateProvider");
  }
  return context;
}