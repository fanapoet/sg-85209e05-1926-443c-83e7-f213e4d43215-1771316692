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

  // Calculate tier based on XP
  const getTier = (xpValue: number): Tier => {
    if (xpValue >= 500001) return "Diamond";
    if (xpValue >= 150001) return "Platinum";
    if (xpValue >= 50001) return "Gold";
    if (xpValue >= 10001) return "Silver";
    return "Bronze";
  };

  const tier = getTier(xp);

  // Energy recovery: +0.3/sec (capped at maxEnergy)
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergyState((prev) => {
        const newEnergy = prev + 0.3;
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
        addBZ,
        subtractBZ,
        addBB,
        subtractBB,
        addXP,
        setEnergy,
        setMaxEnergy,
        setBzPerHour,
        addReferral,
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