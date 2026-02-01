import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeUser, getCurrentTelegramUser } from "@/services/authService";
import { 
  syncPlayerState, 
  syncBoosters, 
  syncQuickCharge,
  syncTapData,
  loadPlayerState,
  startAutoSync,
  stopAutoSync,
  getSyncStatus,
  checkOnlineStatus
} from "@/services/syncService";

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
  lastClaimTimestamp: number;
  
  // Sync status
  isSyncing: boolean;
  lastSyncTime: number;
  isOnline: boolean;
  syncErrorCount: number;
  
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
  
  // Sync methods
  manualSync: () => Promise<void>;
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
  const [lastClaimTimestamp, setLastClaimTimestamp] = useState(() => safeGetItem("bunergy_lastClaimTimestamp", Date.now()));

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncErrorCount, setSyncErrorCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

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
  useEffect(() => { safeSetItem("bunergy_lastClaimTimestamp", lastClaimTimestamp); }, [lastClaimTimestamp]);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = checkOnlineStatus();
      setIsOnline(online);
      if (online) {
        console.log("🟢 Back online - resuming sync");
        // Trigger immediate sync when back online
        manualSync();
      } else {
        console.log("🔴 Offline - changes will sync later");
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);

      return () => {
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      };
    }
  }, []);

  // Monitor sync status
  useEffect(() => {
    const checkSync = setInterval(() => {
      const status = getSyncStatus();
      setSyncErrorCount(status.errorCount);
    }, 5000);

    return () => clearInterval(checkSync);
  }, []);

  // Load initial state from Supabase on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        console.log("🚀 Initializing Bunergy...");
        
        // Step 1: Initialize user (creates or retrieves profile)
        const authResult = await initializeUser();
        
        if (!authResult.success) {
          console.error("❌ User initialization failed:", authResult.error);
          setIsInitialized(true);
          return;
        }
        
        console.log("✅ User initialized:", authResult.profile?.telegram_id);

        // Step 2: Load player state from database
        const result = await loadPlayerState();
        
        if (result.success && result.data) {
          const serverData = result.data;
          
          // Merge server data (take max values - never decrease)
          setBz(Math.max(bz, serverData.bz));
          setBb(Math.max(bb, serverData.bb));
          setXp(Math.max(xp, serverData.xp));
          setEnergyState(serverData.energy);
          setMaxEnergyState(serverData.maxEnergy);
          setTotalTaps(Math.max(totalTaps, serverData.totalTaps));
          setTodayTaps(Math.max(todayTaps, serverData.tapsToday || 0));
          setLastClaimTimestamp(Math.max(lastClaimTimestamp, serverData.lastClaimTimestamp));
          
          // Load boosters
          const savedBoosters = safeGetItem("boosters", {});
          const mergedBoosters = {
            incomePerTap: Math.max(savedBoosters.incomePerTap || 1, serverData.boosters.incomePerTap),
            energyPerTap: Math.max(savedBoosters.energyPerTap || 1, serverData.boosters.energyPerTap),
            energyCapacity: Math.max(savedBoosters.energyCapacity || 1, serverData.boosters.energyCapacity),
            recoveryRate: Math.max(savedBoosters.recoveryRate || 1, serverData.boosters.recoveryRate),
          };
          safeSetItem("boosters", mergedBoosters);
          
          // Load QuickCharge
          const savedQC = safeGetItem("quickCharge", {});
          const mergedQC = {
            usesRemaining: Math.max(savedQC.usesRemaining || 5, serverData.quickCharge.usesRemaining),
            cooldownEndTime: serverData.quickCharge.cooldownEndTime || savedQC.cooldownEndTime,
            lastReset: Math.max(savedQC.lastReset || Date.now(), serverData.quickCharge.lastReset),
          };
          safeSetItem("quickCharge", mergedQC);
          
          console.log("✅ State loaded and merged successfully");
          setLastSyncTime(Date.now());
        }
      } catch (error) {
        console.error("❌ Initialization error:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeState();
  }, []); // Only run once on mount

  // Start auto-sync after initialization
  useEffect(() => {
    if (!isInitialized) return;

    console.log("🚀 Starting auto-sync system...");

    // Start auto-sync with current state getter
    startAutoSync(() => {
      const currentState = {
        bz,
        bb,
        xp,
        tier: getTier(xp),
        energy,
        maxEnergy,
        totalTaps,
        lastClaimTimestamp,
        boosters: safeGetItem("boosters", {
          incomePerTap: 1,
          energyPerTap: 1,
          energyCapacity: 1,
          recoveryRate: 1,
        }),
        quickCharge: safeGetItem("quickCharge", {
          usesRemaining: 5,
          cooldownEndTime: undefined,
          lastReset: Date.now(),
        }),
      };
      
      console.log("📊 Current game state for sync:", {
        bz: currentState.bz,
        bb: currentState.bb,
        xp: currentState.xp,
        totalTaps: currentState.totalTaps,
      });
      
      return currentState;
    });

    // Cleanup on unmount
    return () => {
      console.log("🛑 Stopping auto-sync system...");
      stopAutoSync();
    };
  }, [isInitialized, bz, bb, xp, energy, maxEnergy, totalTaps, lastClaimTimestamp]);

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
  }, [referralCount]);

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

  // Tracking Actions with immediate tap sync
  const incrementTaps = (count: number, income: number) => {
    setTotalTaps(p => {
      const newTotal = p + count;
      
      // Immediate tap sync (debounced internally by sync service)
      if (isOnline) {
        syncTapData({
          totalTaps: newTotal,
          tapsToday: todayTaps + count,
          totalTapIncome: totalTapIncome + income,
          lastTapTime: Date.now(),
        }).catch(console.error);
      }
      
      return newTotal;
    });
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
    setLastClaimTimestamp(Date.now());
  };

  // Manual sync function
  const manualSync = async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    try {
      console.log("🔄 Manual sync started...");
      
      await syncPlayerState({
        bz,
        bb,
        xp,
        tier,
        energy,
        maxEnergy,
        totalTaps,
        lastClaimTimestamp,
      });
      
      await syncBoosters(safeGetItem("boosters", {
        incomePerTap: 1,
        energyPerTap: 1,
        energyCapacity: 1,
        recoveryRate: 1,
      }));
      
      await syncQuickCharge(safeGetItem("quickCharge", {
        usesRemaining: 5,
        cooldownEndTime: undefined,
        lastReset: Date.now(),
      }));
      
      setLastSyncTime(Date.now());
      console.log("✅ Manual sync completed");
    } catch (error) {
      console.error("❌ Manual sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
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
      lastClaimTimestamp,
      isSyncing,
      lastSyncTime,
      isOnline,
      syncErrorCount,
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
      manualSync
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