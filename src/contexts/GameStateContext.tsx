import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initializeUser } from "@/services/authService";
import { 
  syncPlayerState, 
  syncTapData, 
  loadPlayerState, 
  startAutoSync, 
  getSyncStatus, 
  checkOnlineStatus 
} from "@/services/syncService";
import { useToast } from "@/hooks/use-toast";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

interface Boosters {
  incomePerTap: number;
  energyPerTap: number;
  energyCapacity: number;
  recoveryRate: number;
}

interface GameState {
  telegramId: number | null;
  userId: string | null;
  bz: number;
  bb: number;
  energy: number;
  maxEnergy: number;
  bzPerHour: number;
  tier: Tier;
  xp: number;
  referralCount: number;
  
  // Stats
  totalTaps: number;
  todayTaps: number;
  totalTapIncome: number;
  totalUpgrades: number;
  totalConversions: number;
  hasClaimedIdleToday: boolean;
  lastClaimTimestamp: number;
  
  // Boosters
  boosters: Boosters;
  upgradeBooster: (type: keyof Boosters) => void;
  
  // QuickCharge
  quickChargeUsesRemaining: number;
  quickChargeCooldownUntil: number | null;

  // Sync
  isSyncing: boolean;
  lastSyncTime: number;
  isOnline: boolean;
  syncErrorCount: number;
  manualSync: () => Promise<void>;
  
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
  incrementTotalTaps: () => void;
  incrementTaps: (count: number, income: number) => void;
  incrementUpgrades: () => void;
  incrementConversions: (amount: number) => void;
  markIdleClaimed: () => void;
  subtractEnergy: (amount: number) => void;
  useQuickCharge: () => void;
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
  const { toast } = useToast();
  const mountedRef = useRef(false);

  // User Identity
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Core Currency & Stats
  const [bz, setBz] = useState(() => safeGetItem("bunergy_bz", 5000));
  const [bb, setBb] = useState(() => safeGetItem("bunergy_bb", 0.0));
  const [energy, setEnergyState] = useState(() => safeGetItem("bunergy_energy", 1500));
  const [maxEnergy, setMaxEnergyState] = useState(() => safeGetItem("bunergy_maxEnergy", 1500));
  const [bzPerHour, setBzPerHourState] = useState(() => safeGetItem("bunergy_bzPerHour", 0));
  const [xp, setXp] = useState(() => safeGetItem("bunergy_xp", 0));
  const [referralCount, setReferralCount] = useState(() => safeGetItem("bunergy_referralCount", 0));

  // Boosters
  const [boosters, setBoosters] = useState<Boosters>(() => safeGetItem("boosters", {
    incomePerTap: 1,
    energyPerTap: 1,
    energyCapacity: 1,
    recoveryRate: 1
  }));

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
  const [quickChargeCooldownUntil, setQuickChargeCooldownUntil] = useState<number | null>(() => {
    const saved = safeGetItem("bunergy_qc_cooldown", null);
    return saved !== null ? Number(saved) : null;
  });

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [syncErrorCount, setSyncErrorCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Derived State
  const getTier = (xpValue: number): Tier => {
    if (xpValue >= 500001) return "Diamond";
    if (xpValue >= 150001) return "Platinum";
    if (xpValue >= 50001) return "Gold";
    if (xpValue >= 10001) return "Silver";
    return "Bronze";
  };
  const tier = getTier(xp);

  // Persistence Effects
  useEffect(() => { safeSetItem("bunergy_bz", bz); }, [bz]);
  useEffect(() => { safeSetItem("bunergy_bb", bb); }, [bb]);
  useEffect(() => { safeSetItem("bunergy_energy", energy); }, [energy]);
  useEffect(() => { safeSetItem("bunergy_maxEnergy", maxEnergy); }, [maxEnergy]);
  useEffect(() => { safeSetItem("bunergy_bzPerHour", bzPerHour); }, [bzPerHour]);
  useEffect(() => { safeSetItem("bunergy_xp", xp); }, [xp]);
  useEffect(() => { safeSetItem("bunergy_referralCount", referralCount); }, [referralCount]);
  useEffect(() => { safeSetItem("boosters", boosters); }, [boosters]);
  useEffect(() => { safeSetItem("bunergy_totalTaps", totalTaps); }, [totalTaps]);
  useEffect(() => { safeSetItem("bunergy_todayTaps", todayTaps); }, [todayTaps]);
  useEffect(() => { safeSetItem("bunergy_totalTapIncome", totalTapIncome); }, [totalTapIncome]);
  useEffect(() => { safeSetItem("bunergy_totalUpgrades", totalUpgrades); }, [totalUpgrades]);
  useEffect(() => { safeSetItem("bunergy_totalConversions", totalConversions); }, [totalConversions]);
  useEffect(() => { safeSetItem("bunergy_hasClaimedIdleToday", hasClaimedIdleToday); }, [hasClaimedIdleToday]);
  useEffect(() => { safeSetItem("bunergy_lastResetDate", lastResetDate); }, [lastResetDate]);
  useEffect(() => { safeSetItem("bunergy_lastClaimTimestamp", lastClaimTimestamp); }, [lastClaimTimestamp]);
  useEffect(() => { 
    safeSetItem("bunergy_qc_uses", quickChargeUsesRemaining); 
    safeSetItem("bunergy_qc_cooldown", quickChargeCooldownUntil);
  }, [quickChargeUsesRemaining, quickChargeCooldownUntil]);

  // Initialization
  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    
    const init = async () => {
      console.log("🚀 [GameState] Initializing...");
      const authResult = await initializeUser();
      
      if (authResult.success && authResult.profile) {
        console.log("✅ [GameState] User initialized:", authResult.profile.telegram_id);
        setTelegramId(authResult.profile.telegram_id);
        setUserId(authResult.profile.id);
        
        const serverData = await loadPlayerState();
        
        if (serverData) {
          console.log("📊 [GameState] Loaded server data:", serverData);
          setBz(Math.max(bz, Number(serverData.bz_balance)));
          setBb(Math.max(bb, Number(serverData.bb_balance)));
          setXp(Math.max(xp, Number(serverData.xp)));
          setEnergyState(Number(serverData.current_energy));
          setMaxEnergyState(Number(serverData.max_energy));
          setTotalTaps(Math.max(totalTaps, Number(serverData.total_taps)));
          setLastClaimTimestamp(Math.max(lastClaimTimestamp, new Date(serverData.last_claim_timestamp || 0).getTime()));
          
          setBoosters({
            incomePerTap: Math.max(1, serverData.booster_income_per_tap),
            energyPerTap: Math.max(1, serverData.booster_energy_per_tap),
            energyCapacity: Math.max(1, serverData.booster_energy_capacity),
            recoveryRate: Math.max(1, serverData.booster_recovery_rate),
          });
          
          setQuickChargeUsesRemaining(Number(serverData.quickcharge_uses_remaining));
          setQuickChargeCooldownUntil(serverData.quickcharge_cooldown_until ? new Date(serverData.quickcharge_cooldown_until).getTime() : null);
        }
      }
    };

    init();
    
    return () => { 
      mountedRef.current = false;
      setMounted(false);
    };
  }, []);

  // Helper to get full state for sync (defined BEFORE it's used)
  const getFullStateForSync = useCallback(() => {
    const baseRecovery = 0.3;
    const recoveryMultiplier = 1 + (boosters.recoveryRate - 1) * 0.1;
    const currentRecoveryRate = baseRecovery * recoveryMultiplier;

    // Collect build parts data from localStorage
    let buildPartsData: Array<{ partId: string; level: number; isBuilding: boolean; buildEndsAt: number | null }> = [];
    try {
      const savedParts = localStorage.getItem("buildParts");
      if (savedParts) {
        const parts = JSON.parse(savedParts);
        buildPartsData = Object.entries(parts).map(([key, value]: [string, any]) => ({
          partId: key,
          level: value.level || 0,
          isBuilding: value.isBuilding || false,
          buildEndsAt: value.buildEndsAt || null
        }));
      }
    } catch (e) {
      console.error("❌ [GameState] Failed to read build parts for sync:", e);
    }

    return {
      bzBalance: bz,
      bbBalance: bb,
      xp: xp,
      tier: tier,
      currentEnergy: energy,
      maxEnergy: maxEnergy,
      energyRecoveryRate: currentRecoveryRate,
      lastEnergyUpdate: Date.now(),
      boosterIncomeTap: boosters.incomePerTap,
      boosterEnergyTap: boosters.energyPerTap,
      boosterCapacity: boosters.energyCapacity,
      boosterRecovery: boosters.recoveryRate,
      quickChargeUsesRemaining: quickChargeUsesRemaining,
      quickChargeCooldownUntil: quickChargeCooldownUntil,
      totalTaps: totalTaps,
      todayTaps: todayTaps,
      idleBzPerHour: bzPerHour,
      buildParts: buildPartsData
    };
  }, [bz, bb, xp, tier, energy, maxEnergy, boosters, quickChargeUsesRemaining, quickChargeCooldownUntil, totalTaps, todayTaps, bzPerHour]);

  // Manual Sync Function
  const manualSync = async () => {
    console.log("🔘 [MANUAL SYNC] ========== FUNCTION CALLED ==========");
    console.log("🔘 [MANUAL SYNC] Step 1: Preparing game state...");
    
    setIsSyncing(true);
    try {
      const fullState = getFullStateForSync();
      console.log("🔘 [MANUAL SYNC] Step 2: Full state prepared:", fullState);
      console.log("🔘 [MANUAL SYNC] Step 3: Calling syncPlayerState...");
      
      const result = await syncPlayerState(fullState);
      console.log("🔘 [MANUAL SYNC] Step 4: syncPlayerState returned:", result);
      
      if (result.success) {
        setLastSyncTime(Date.now());
        console.log("✅ [MANUAL SYNC] SUCCESS - Data saved to database");
        toast({ 
          title: "✅ Sync Successful", 
          description: "Game progress saved to server." 
        });
      } else {
        console.error("❌ [MANUAL SYNC] FAILED:", result.error);
        toast({ 
          title: "❌ Sync Failed", 
          description: result.error || "Could not save progress.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("❌ [MANUAL SYNC] EXCEPTION:", error);
      toast({ 
        title: "❌ Sync Error", 
        description: "Unexpected error during sync.", 
        variant: "destructive" 
      });
    } finally {
      setIsSyncing(false);
      console.log("🔘 [MANUAL SYNC] Finished");
    }
  };

  // State Ref for Auto-Sync (Prevents timer reset on state change)
  const stateRef = useRef(getFullStateForSync);
  useEffect(() => { stateRef.current = getFullStateForSync; }, [getFullStateForSync]);

  // Start automatic periodic sync (every 30 seconds)
  useEffect(() => {
    if (!mounted) return;
    
    console.log("🚀 [AUTO-SYNC] Starting automatic sync every 30 seconds");
    
    try {
      const stopAutoSync = startAutoSync(() => {
        const state = stateRef.current(); // Use ref to get latest state without resetting timer
        console.log("⏰ [AUTO-SYNC] 30-second timer fired, syncing state");
        console.log("📦 [AUTO-SYNC] State includes build parts:", state.buildParts?.length || 0);
        return state;
      }, 30000);
      
      return () => {
        console.log("🛑 [AUTO-SYNC] Stopping automatic sync");
        stopAutoSync();
      };
    } catch (error) {
      console.error("❌ [AUTO-SYNC] Failed to start:", error);
    }
  }, [mounted]); // Only run on mount/unmount

  // Online/Offline Monitor
  useEffect(() => {
    const handleStatusChange = () => {
      const online = checkOnlineStatus();
      setIsOnline(online);
      console.log(`📡 [Network] Status changed: ${online ? "ONLINE" : "OFFLINE"}`);
      if (online) {
        console.log("📡 [Network] Reconnected - triggering manual sync");
        manualSync();
      }
    };

    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);
    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
    };
  }, []);

  // Energy Recovery Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergyState(current => {
        const capacityLevel = boosters.energyCapacity;
        const recoveryLevel = boosters.recoveryRate;
        const dynamicMax = 1500 + (capacityLevel - 1) * 100;
        
        const baseRecovery = 0.3;
        const recoveryMultiplier = 1 + (recoveryLevel - 1) * 0.1;
        const actualRecovery = baseRecovery * recoveryMultiplier;
        
        return Math.min(current + actualRecovery, dynamicMax);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [boosters]);

  // Recalculate maxEnergy on booster change
  useEffect(() => {
    const newMax = 1500 + (boosters.energyCapacity - 1) * 100;
    setMaxEnergyState(newMax);
  }, [boosters.energyCapacity]);

  // Debounced tap sync (2 second delay)
  useEffect(() => {
    if (!mounted) return;
    
    console.log("🔄 [Tap] Tap count updated:", totalTaps);
    console.log("🔄 [Tap] Debounced sync will fire in 2s");
    
    const timer = setTimeout(() => {
      console.log("🔄 [Tap] 2 seconds elapsed, syncing tap data...");
      syncTapData({
        bzBalance: bz,
        currentEnergy: energy,
        lastEnergyUpdate: Date.now(),
        totalTaps: totalTaps,
        todayTaps: todayTaps
      }).then(result => {
        if (result.success) {
          console.log("✅ [Tap] Tap data synced successfully");
        } else {
          console.error("❌ [Tap] Tap sync failed:", result.error);
        }
      }).catch(err => {
        console.error("❌ [Tap] Tap sync exception:", err);
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [totalTaps, mounted]);

  // Methods
  const addBZ = (amount: number) => setBz(p => p + amount);
  const subtractBZ = (amount: number) => {
    if (amount <= 0 || bz < amount) return false;
    setBz(p => p - amount);
    return true;
  };
  const addBB = (amount: number) => setBb(p => p + amount);
  const subtractBB = (amount: number) => {
    if (amount <= 0 || bb < amount) return false;
    setBb(p => p - amount);
    return true;
  };
  const addXP = (amount: number) => setXp(p => p + amount);
  const setEnergy = (val: number) => setEnergyState(Math.max(0, Math.min(val, maxEnergy)));
  const setMaxEnergy = (val: number) => setMaxEnergyState(Math.max(1500, val));
  const setBzPerHour = (val: number) => setBzPerHourState(Math.max(0, val));
  const addReferral = () => setReferralCount(p => p + 1);
  const subtractEnergy = (amount: number) => setEnergyState(prev => Math.max(0, prev - amount));
  
  const incrementTotalTaps = () => {
    setTotalTaps(p => p + 1);
  };

  const incrementTaps = (count: number, income: number) => {
    setTodayTaps(p => p + count);
    setTotalTapIncome(p => p + income);
  };

  const incrementUpgrades = () => setTotalUpgrades(p => p + 1);
  const incrementConversions = (amount: number) => setTotalConversions(p => p + amount);
  const markIdleClaimed = () => {
    setHasClaimedIdleToday(true);
    setLastClaimTimestamp(Date.now());
    console.log("💰 [Idle] Idle reward claimed, triggering immediate sync");
    setTimeout(manualSync, 0);
  };

  const upgradeBooster = (boosterType: keyof Boosters) => {
    console.log("⬆️ [BOOSTER] Upgrade requested:", boosterType);
    
    setBoosters(prev => {
      const newBoosters = {
        ...prev,
        [boosterType]: prev[boosterType] + 1
      };
      console.log("⬆️ [BOOSTER] New booster values:", newBoosters);
      
      // Immediate sync after booster upgrade
      setTimeout(() => {
        console.log("⬆️ [BOOSTER] Triggering immediate sync...");
        syncPlayerState({
          ...getFullStateForSync(),
          boosterIncomeTap: newBoosters.incomePerTap,
          boosterEnergyTap: newBoosters.energyPerTap,
          boosterCapacity: newBoosters.energyCapacity,
          boosterRecovery: newBoosters.recoveryRate
        }).then(result => {
          console.log("⬆️ [BOOSTER] Sync result:", result);
        }).catch(err => {
          console.error("❌ [BOOSTER] Sync failed:", err);
        });
      }, 100);
      
      return newBoosters;
    });
  };

  const useQuickCharge = () => {
    if (quickChargeUsesRemaining > 0) {
      const now = Date.now();
      console.log("⚡ [QuickCharge] Used, triggering immediate sync");
      setQuickChargeUsesRemaining(p => p - 1);
      setEnergyState(maxEnergy);
      setQuickChargeCooldownUntil(now + 60 * 60 * 1000); // 1 hour
      
      // Sync immediately
      setTimeout(() => {
        syncPlayerState({
          ...getFullStateForSync(),
          quickChargeUsesRemaining: quickChargeUsesRemaining - 1,
          quickChargeCooldownUntil: now + 60 * 60 * 1000,
          currentEnergy: maxEnergy
        }).then(result => {
          console.log("⚡ [QuickCharge] Sync result:", result);
        }).catch(err => {
          console.error("❌ [QuickCharge] Sync failed:", err);
        });
      }, 0);
    }
  };

  return (
    <GameStateContext.Provider value={{
      telegramId,
      userId,
      bz, bb, energy, maxEnergy, bzPerHour, tier, xp, referralCount,
      totalTaps, todayTaps, totalTapIncome, totalUpgrades, totalConversions,
      hasClaimedIdleToday, lastClaimTimestamp,
      boosters, upgradeBooster,
      quickChargeUsesRemaining, quickChargeCooldownUntil,
      isSyncing, lastSyncTime, isOnline, syncErrorCount, manualSync,
      addBZ, subtractBZ, addBB, subtractBB, addXP,
      setEnergy, setMaxEnergy, setBzPerHour, addReferral,
      incrementTotalTaps, incrementTaps, incrementUpgrades, incrementConversions,
      markIdleClaimed, subtractEnergy, useQuickCharge
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