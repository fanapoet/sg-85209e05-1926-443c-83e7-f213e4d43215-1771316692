import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeUser, getCurrentTelegramUser } from "@/services/authService";
import { 
  syncPlayerState, 
  syncTapData,
  loadPlayerState,
  startAutoSync,
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
  
  // QuickCharge State
  quickChargeUsesRemaining: number;
  quickChargeCooldownUntil: number | null;

  // Sync status
  isSyncing: boolean;
  lastSyncTime: number;
  isOnline: boolean;
  syncErrorCount: number;
  
  // Methods
  addBZ: (amount: number) => void;
  subtractEnergy: (amount: number) => void;
  useQuickCharge: () => void;
  subtractBZ: (amount: number) => boolean;
  addBB: (amount: number) => void;
  subtractBB: (amount: number) => boolean;
  addXP: (amount: number) => void;
  setEnergy: (value: number) => void;
  setMaxEnergy: (value: number) => void;
  setBzPerHour: (value: number) => void;
  addReferral: () => void;
  
  // Task tracking methods
  incrementTotalTaps: () => void;
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

  // QuickCharge State
  const [quickChargeUsesRemaining, setQuickChargeUsesRemaining] = useState(() => safeGetItem("bunergy_qc_uses", 5));
  const [quickChargeCooldownUntil, setQuickChargeCooldownUntil] = useState<number | null>(() => safeGetItem("bunergy_qc_cooldown", null));

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncErrorCount, setSyncErrorCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to get full state for sync
  const getFullStateForSync = () => {
    const boosters = safeGetItem("boosters", { incomePerTap: 1, energyPerTap: 1, energyCapacity: 1, recoveryRate: 1 });
    const quickCharge = safeGetItem("quickCharge", { usesRemaining: 5, cooldownEndTime: null });
    
    return {
      bzBalance: bz,
      bbBalance: bb,
      xp: xp,
      tier: tier as string,
      currentEnergy: energy,
      maxEnergy: maxEnergy,
      energyRecoveryRate: 0.3 * (1 + (boosters.recoveryRate - 1) * 0.1), // Recalculate based on formula
      lastEnergyUpdate: Date.now(),
      boosterIncomeTap: boosters.incomePerTap,
      boosterEnergyTap: boosters.energyPerTap,
      boosterCapacity: boosters.energyCapacity,
      boosterRecovery: boosters.recoveryRate,
      quickChargeUsesRemaining: quickChargeUsesRemaining,
      quickChargeCooldownUntil: quickChargeCooldownUntil,
      totalTaps: totalTaps,
      todayTaps: todayTaps,
      idleBzPerHour: bzPerHour
    };
  };

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
      // status does not have errorCount currently, removing it to fix type error
      // setSyncErrorCount(status.errorCount); 
    }, 5000);

    return () => clearInterval(checkSync);
  }, []);

  // Load initial state from Supabase on mount
  useEffect(() => {
    const initializeState = async () => {
      try {
        console.log("🚀 [GameState] Initializing Bunergy...");
        
        // Step 1: Initialize user (creates or retrieves profile)
        console.log("🔐 [GameState] Calling initializeUser()...");
        const authResult = await initializeUser();
        
        console.log("🔐 [GameState] Auth result:", {
          success: authResult.success,
          isNewUser: authResult.isNewUser,
          hasProfile: !!authResult.profile,
          error: authResult.error,
        });
        
        if (!authResult.success) {
          console.error("❌ [GameState] User initialization failed:", authResult.error);
          setIsInitialized(true);
          return;
        }
        
        console.log("✅ [GameState] User initialized:", authResult.profile?.telegram_id);

        // Step 2: Load player state from database
        console.log("📊 [GameState] Loading player state...");
        const serverData = await loadPlayerState();
        
        console.log("📊 [GameState] Load result:", {
          hasData: !!serverData,
        });
        
        if (serverData) {
          console.log("📊 [GameState] Server data loaded:", {
            bz: serverData.bz_balance,
            bb: serverData.bb_balance,
            xp: serverData.xp,
            totalTaps: serverData.total_taps,
          });
          
          // Merge server data (take max values - never decrease)
          setBz(Math.max(bz, Number(serverData.bz_balance)));
          setBb(Math.max(bb, Number(serverData.bb_balance)));
          setXp(Math.max(xp, Number(serverData.xp)));
          setEnergyState(Number(serverData.current_energy));
          setMaxEnergyState(Number(serverData.max_energy));
          setTotalTaps(Math.max(totalTaps, Number(serverData.total_taps)));
          // Cast to any to avoid TS error if types aren't fully synced yet
          setTodayTaps(Math.max(todayTaps, (serverData as any).taps_today || 0));
          
          // Fix date handling for lastClaimTimestamp
          const serverClaimTime = serverData.last_claim_timestamp ? new Date(serverData.last_claim_timestamp).getTime() : 0;
          setLastClaimTimestamp(Math.max(lastClaimTimestamp, serverClaimTime));
          
          // Load boosters
          const mergedBoosters = {
            incomePerTap: Math.max(1, serverData.booster_income_per_tap),
            energyPerTap: Math.max(1, serverData.booster_energy_per_tap),
            energyCapacity: Math.max(1, serverData.booster_energy_capacity),
            recoveryRate: Math.max(1, serverData.booster_recovery_rate),
          };
          safeSetItem("boosters", mergedBoosters);
          
          // Load QuickCharge
          const serverCooldown = serverData.quickcharge_cooldown_until ? new Date(serverData.quickcharge_cooldown_until).getTime() : null;
          setQuickChargeUsesRemaining(serverData.quickcharge_uses_remaining);
          setQuickChargeCooldownUntil(serverCooldown);
          
          const mergedQC = {
            usesRemaining: serverData.quickcharge_uses_remaining,
            cooldownUntil: serverCooldown,
            lastReset: serverData.quickcharge_last_reset ? new Date(serverData.quickcharge_last_reset).getTime() : Date.now(),
          };
          safeSetItem("quickCharge", mergedQC);
          
          console.log("✅ [GameState] State loaded and merged successfully");
          setLastSyncTime(Date.now());
        } else {
          console.warn("⚠️ [GameState] No server data loaded, using local state");
        }
      } catch (error) {
        console.error("❌ [GameState] Initialization error:", error);
      } finally {
        console.log("✅ [GameState] Initialization complete, setting isInitialized = true");
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
    const stopSync = startAutoSync(() => getFullStateForSync());

    // Cleanup on unmount
    return () => {
      console.log("🛑 Stopping auto-sync system...");
      stopSync();
    };
  }, [isInitialized, bz, bb, xp, energy, maxEnergy, totalTaps, lastClaimTimestamp, quickChargeUsesRemaining]);

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
      setEnergyState(current => {
        // Safety check for null/undefined
        const safeCurrent = typeof current === 'number' ? current : 0;
        
        // Get current booster levels
        const capacityLevel = getBoosterLevel("energyCapacity");
        const recoveryLevel = getBoosterLevel("recoveryRate");
        
        // Calculate dynamic max energy based on booster level
        const dynamicMaxEnergy = 1500 + (capacityLevel - 1) * 100;
        
        // Calculate recovery rate (base 0.3 per second)
        const baseRecovery = 0.3;
        const recoveryMultiplier = 1 + (recoveryLevel - 1) * 0.1;
        const actualRecovery = baseRecovery * recoveryMultiplier;
        
        // Don't exceed max energy
        const newEnergy = Math.min(safeCurrent + actualRecovery, dynamicMaxEnergy);
        
        // Only log occasionally to avoid console spam, and use safeCurrent
        if (Math.random() < 0.05) {
          console.log("🔋 Energy recovery:", {
            current: safeCurrent.toFixed(1),
            maxEnergy: dynamicMaxEnergy,
            capacityLevel,
            recoveryLevel,
            actualRecovery: actualRecovery.toFixed(3),
            newEnergy: newEnergy.toFixed(1)
          });
        }
        
        return newEnergy;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []); // Empty dependency array - reads boosters fresh each time

  // Recalculate maxEnergy when energy capacity booster changes
  useEffect(() => {
    const capacityLevel = getBoosterLevel("energyCapacity");
    const newMaxEnergy = 1500 + (capacityLevel - 1) * 100;
    
    console.log("⚡ Max energy updated:", {
      capacityLevel,
      newMaxEnergy
    });
    
    setMaxEnergy(newMaxEnergy);
  }, [energy]); // Run when energy changes (which happens when boosters change)

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

  const subtractEnergy = (amount: number) => {
    setEnergyState(prev => Math.max(0, prev - amount));
  };
  
  const addReferral = () => {
    setReferralCount(p => p + 1);
  };

  const useQuickCharge = () => {
    if (quickChargeUsesRemaining > 0) {
      setQuickChargeUsesRemaining(p => p - 1);
      setEnergyState(maxEnergy);
      // Set 1 hour cooldown
      const cooldownEnd = Date.now() + 60 * 60 * 1000;
      setQuickChargeCooldownUntil(cooldownEnd);
      
      // Sync immediately
      syncPlayerState({
        quickChargeUsesRemaining: quickChargeUsesRemaining - 1,
        quickChargeCooldownUntil: cooldownEnd,
        quickChargeLastReset: Date.now()
      }).catch(console.error);
    }
  };

  // Tracking Actions with immediate tap sync
  const incrementTotalTaps = () => {
    setTotalTaps(p => {
      const newTotal = p + 1;
      // Trigger sync
      incrementTaps(1, 0); 
      return newTotal;
    });
  };

  const incrementTaps = (count: number, income: number) => {
    setTodayTaps(p => p + count);
    setTotalTapIncome(p => p + income);
    
    // Immediate tap sync (debounced internally by sync service if needed, but here we just call it)
    if (isOnline) {
      syncTapData({
        bzBalance: bz, 
        currentEnergy: energy, 
        lastEnergyUpdate: Date.now(),
        totalTaps: totalTaps + count,
        todayTaps: todayTaps + count,
      }).catch(console.error);
    }
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
      
      const state = getFullStateForSync();
      await syncPlayerState(state);
      
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
      subtractEnergy,
      useQuickCharge,
      quickChargeUsesRemaining,
      quickChargeCooldownUntil,
      incrementTotalTaps,
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