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

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [bz, setBz] = useState(5000);
  const [bb, setBb] = useState(0.000000);
  const [energy, setEnergyState] = useState(1500);
  const [maxEnergy, setMaxEnergyState] = useState(1500);
  const [bzPerHour, setBzPerHourState] = useState(0);
  const [xp, setXp] = useState(0);
  const [referralCount, setReferralCount] = useState(0);

  // Calculate tier based on XP
  const getTier = (xpValue: number): Tier => {
    if (xpValue >= 500001) return "Diamond";
    if (xpValue >= 150001) return "Platinum";
    if (xpValue >= 50001) return "Gold";
    if (xpValue >= 10001) return "Silver";
    return "Bronze";
  };

  const tier = getTier(xp);

  // Energy recovery: +0.3/sec
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergyState((prev) => {
        const newEnergy = prev + 0.3;
        return newEnergy >= maxEnergy ? maxEnergy : newEnergy;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [maxEnergy]);

  const addBZ = (amount: number) => {
    setBz((prev) => prev + amount);
  };

  const subtractBZ = (amount: number): boolean => {
    if (bz >= amount) {
      setBz((prev) => prev - amount);
      return true;
    }
    return false;
  };

  const addBB = (amount: number) => {
    setBb((prev) => prev + amount);
  };

  const subtractBB = (amount: number): boolean => {
    if (bb >= amount) {
      setBb((prev) => prev - amount);
      return true;
    }
    return false;
  };

  const addXP = (amount: number) => {
    setXp((prev) => prev + amount);
  };

  const setEnergy = (value: number) => {
    setEnergyState(value);
  };

  const setMaxEnergy = (value: number) => {
    setMaxEnergyState(value);
  };

  const setBzPerHour = (value: number) => {
    setBzPerHourState(value);
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