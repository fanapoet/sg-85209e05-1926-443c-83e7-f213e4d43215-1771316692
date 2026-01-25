import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  
  // Stats for tasks and rewards
  totalTaps: number;
  todayTaps: number;
  totalTapIncome: number;
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
  incrementTaps: (count: number, income: number) => void;
  incrementUpgrades: () => void;
  incrementConversions: (amount: number) => void;
  markIdleClaimed: () => void;
}

const GameStateContext = createContext<GameState | null>(null);

// Safe localStorage helpers
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
  // Core Currency & Stats
  const [bz, setBz] = useState(() => safeGetItem("bunergy_bz", 5000));
  const [bb, setBb] = useState(() => safeGetItem("bunergy_bb", 0.0));
  const [energy, setEnergyState] = useState(() => safeGetItem("bunergy_energy", 1500));
  const [maxEnergy, setMaxEnergyState] = useState(() => safeGetItem("bunergy_maxEnergy", 1500));
  const [bzPerHour, setBzPerHourState] = useState(() => safeGetItem("bunergy_bzPerHour", 0));
  const [xp, setXp] = useState(() => safeGetItem("bunergy_xp", 0));
  const [referralCount, setReferralCount] = useState(() => safeGetItem("bunergy_referralCount", 0));

  // Task & Achievement Tracking
  const [totalTaps, setTotalTaps] = useState(() => safeGetItem("bunergy_totalTaps", 0));
  const [todayTaps, setTodayTaps] = useState(() => safeGetItem("bunergy_todayTaps", 0));
  const [totalTapIncome, setTotalTapIncome] = useState(() => safeGetItem("bunergy_totalTapIncome", 0));
  const [totalUpgrades, setTotalUpgrades] = useState(() => safeGetItem("bunergy_totalUpgrades", 0));
  const [totalConversions, setTotalConversions] = useState(() => safeGetItem("bunergy_totalConversions", 0));
  const [hasClaimedIdleToday, setHasClaimedIdleToday] = useState(() => safeGetItem("bunergy_hasClaimedIdleToday", false));
  const [lastResetDate, setLastResetDate] = useState(() => safeGetItem("bunergy_lastResetDate", new Date().toDateString()));

  // Persist State
  useEffect(() => { safeSetItem("bunergy_bz", bz); }, [bz]);
  useEffect(() => { safeSetItem("bunergy_bb", bb); }, [bb]);
  useEffect(() => { safeSetItem("bunergy_energy", energy); }, [energy]);
  useEffect(() => { safeSetItem("bunergy_maxEnergy", maxEnergy); }, [maxEnergy]);
  useEffect(() => { safeSetItem("bunergy_bzPerHour", bzPerHour); }, [bzPerHour]);
  useEffect(() => { safeSetItem("bunergy_xp", xp); }, [xp]);
  useEffect(() => { safeSetItem("bunergy_referralCount", referralCount); }, [referralCount]);
  
  useEffect(() => { safeSetItem("bunergy_totalTaps", totalTaps); }, [totalTaps]);
  useEffect(() => { safeSetItem("bunergy_todayTaps", todayTaps); }, [todayTaps]);
  useEffect(() => { safeSetItem("bunergy_totalTapIncome", totalTapIncome); }, [totalTapIncome]);
  useEffect(() => { safeSetItem("bunergy_totalUpgrades", totalUpgrades); }, [totalUpgrades]);
  useEffect(() => { safeSetItem("bunergy_totalConversions", totalConversions); }, [totalConversions]);
  useEffect(() => { safeSetItem("bunergy_hasClaimedIdleToday", hasClaimedIdleToday); }, [hasClaimedIdleToday]);
  useEffect(() => { safeSetItem("bunergy_lastResetDate", lastResetDate); }, [lastResetDate]);

  // Daily Reset Logic
  useEffect(() => {
    const checkDailyReset = () => {
      const today = new Date().toDateString();
      if (lastResetDate !== today) {
        setTodayTaps(0);
        setHasClaimedIdleToday(false);
        setLastResetDate(today);
      }
    };

    // Check on mount and every minute
    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, [lastResetDate]);

  // Sync Referral Count from Supabase
  useEffect(() => {
    const syncReferrals = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("referrals")
          .select("id")
          .eq("inviter_id", user.id);

        if (!error && data) {
          const realCount = data.length;
          if (realCount !== referralCount) {
            setReferralCount(realCount);
          }
        }
      } catch (err) {
        console.error("Error syncing referrals:", err);
      }
    };

    syncReferrals();
    const interval = setInterval(syncReferrals, 30000); // Sync every 30s
    return () => clearInterval(interval);
  }, []);

  // Tier Calculation
  const getTier = (xpValue: number): Tier => {
    if (xpValue >= 500001) return "Diamond";
    if (xpValue >= 150001) return "Platinum";
    if (xpValue >= 50001) return "Gold";
    if (xpValue >= 10001) return "Silver";
    return "Bronze";
  };
  const tier = getTier(xp);

  // Energy Recovery Loop
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

  // Actions
  const addBZ = (amount: number) => {
    if (amount > 0) setBz(p => p + amount);
  };
  
  const subtractBZ = (amount: number) => {
    if (amount <= 0 || bz < amount) return false;
    setBz(p => p - amount);
    return true;
  };
  
  const addBB = (amount: number) => {
    if (amount > 0) setBb(p => p + amount);
  };
  
  const subtractBB = (amount: number) => {
    if (amount <= 0 || bb < amount) return false;
    setBb(p => p - amount);
    return true;
  };
  
  const addXP = (amount: number) => {
    if (amount > 0) setXp(p => p + amount);
  };
  
  const setEnergy = (val: number) => {
    setEnergyState(Math.max(0, Math.min(val, maxEnergy)));
  };
  
  const setMaxEnergy = (val: number) => {
    setMaxEnergyState(Math.max(1500, val));
  };
  
  const setBzPerHour = (val: number) => {
    setBzPerHourState(Math.max(0, val));
  };
  
  const addReferral = () => {
    setReferralCount(p => p + 1);
  };

  // Tracking Actions
  const incrementTaps = (count: number, income: number) => {
    setTotalTaps(p => p + count);
    setTodayTaps(p => p + count);
    setTotalTapIncome(p => p + income);
  };
  
  const incrementUpgrades = () => {
    setTotalUpgrades(p => p + 1);
  };
  
  const incrementConversions = (amount: number) => {
    setTotalConversions(p => p + amount);
  };
  
  const markIdleClaimed = () => {
    setHasClaimedIdleToday(true);
  };

  return (
    <GameStateContext.Provider value={{
      bz, 
      bb, 
      energy, 
      maxEnergy, 
      bzPerHour, 
      tier, 
      xp, 
      referralCount,
      totalTaps, 
      todayTaps, 
      totalTapIncome, 
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
      markIdleClaimed
    }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) throw new Error("useGameState must be used within GameStateProvider");
  return context;
}