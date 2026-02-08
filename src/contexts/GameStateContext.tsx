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
import { getRewardState, upsertRewardState } from "@/services/rewardStateService";
import { claimDailyReward } from "@/services/rewardsService";
import { 
  loadDailyClaimsFromDB, 
  loadNFTsFromDB, 
  mergeDailyClaims, 
  mergeNFTs 
} from "@/services/rewardDataService";
import { 
  loadTasksFromDB, 
  syncTasksWithServer,
  checkAndResetTasks
} from "@/services/tasksService";
import { useToast } from "@/hooks/use-toast";

type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

// Add TelegramUser interface
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface Boosters {
  incomePerTap: number;
  energyPerTap: number;
  energyCapacity: number;
  recoveryRate: number;
}

interface GameState {
  telegramId: number | null;
  userId: string | null;
  telegramUser: TelegramUser | null;
  isProfileOpen: boolean;
  setProfileOpen: (isOpen: boolean) => void;
  bz: number;
  bb: number;
  energy: number;
  maxEnergy: number;
  bzPerHour: number;
  tier: Tier;
  xp: number;
  referralCount: number;
  
  // Rewards
  dailyStreak: number;
  currentRewardWeek: number;
  lastDailyClaimDate: string | null;
  claimedDailyRewards: Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>;
  ownedNFTs: Array<{ nftId: string; purchasePrice: number; timestamp: number }>;
  
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
  checkAndResetQuickCharge: () => void;
  addReward: (amount: number) => void;
  claimReward: () => void;
  performDailyClaim: (day: number, week: number, type: "BZ" | "BB" | "XP", amount: number) => Promise<void>;
  purchaseNFT: (nftId: string, priceInBB: number) => void;
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
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isProfileOpen, setProfileOpen] = useState(false);

  // Core Currency & Stats
  const [bz, setBz] = useState(() => safeGetItem("bunergy_bz", 5000));
  const [bb, setBb] = useState(() => safeGetItem("bunergy_bb", 0.0));
  const [energy, setEnergyState] = useState(() => safeGetItem("bunergy_energy", 1500));
  const [maxEnergy, setMaxEnergyState] = useState(() => safeGetItem("bunergy_maxEnergy", 1500));
  const [bzPerHour, setBzPerHourState] = useState(() => safeGetItem("bunergy_bzPerHour", 0));
  const [xp, setXp] = useState(() => safeGetItem("bunergy_xp", 0));
  const [referralCount, setReferralCount] = useState(() => safeGetItem("bunergy_referralCount", 0));
  const [reward, setReward] = useState(() => safeGetItem("bunergy_reward", 0));

  // Rewards State
  const [dailyStreak, setDailyStreak] = useState(() => safeGetItem("dailyStreak", 0));
  const [currentRewardWeek, setCurrentRewardWeek] = useState(() => safeGetItem("currentRewardWeek", 1));
  const [lastDailyClaimDate, setLastDailyClaimDate] = useState<string | null>(() => safeGetItem("lastDailyClaimDate", null));
  const [claimedDailyRewards, setClaimedDailyRewards] = useState<Array<{ day: number; week: number; type: string; amount: number; timestamp: number }>>(() => safeGetItem("claimedDailyRewards", []));
  const [ownedNFTs, setOwnedNFTs] = useState<Array<{ nftId: string; purchasePrice: number; timestamp: number }>>(() => safeGetItem("ownedNFTs", []));

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
  const [quickChargeLastResetDate, setQuickChargeLastResetDate] = useState(() => 
    safeGetItem("bunergy_qc_last_reset", new Date().toDateString())
  );

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
  useEffect(() => { safeSetItem("dailyStreak", dailyStreak); }, [dailyStreak]);
  useEffect(() => { safeSetItem("currentRewardWeek", currentRewardWeek); }, [currentRewardWeek]);
  useEffect(() => { safeSetItem("lastDailyClaimDate", lastDailyClaimDate); }, [lastDailyClaimDate]);
  useEffect(() => { safeSetItem("claimedDailyRewards", claimedDailyRewards); }, [claimedDailyRewards]);
  useEffect(() => { safeSetItem("ownedNFTs", ownedNFTs); }, [ownedNFTs]);
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
    safeSetItem("bunergy_qc_last_reset", quickChargeLastResetDate);
  }, [quickChargeUsesRemaining, quickChargeCooldownUntil, quickChargeLastResetDate]);

  // Initialization
  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    
    const init = async () => {
      console.log("🚀 [GameState] Initializing...");
      
      // Capture Telegram User Data directly from WebApp if available
      if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
        console.log("👤 [GameState] Captured Telegram User:", tgUser);
        setTelegramUser(tgUser as TelegramUser);
      }

      const authResult = await initializeUser();
      
      if (authResult.success && authResult.profile) {
        console.log("✅ [GameState] User initialized:", authResult.profile.telegram_id);
        setTelegramId(authResult.profile.telegram_id);
        setUserId(authResult.profile.id);
        
        // Load main player state
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

        // Load reward state
        const rewardData = await getRewardState(authResult.profile.telegram_id);
        if (rewardData) {
          console.log("✅ [REWARDS-SYNC] Loaded reward data from DB:", rewardData);
          setDailyStreak(Math.max(dailyStreak, rewardData.dailyStreak));
          setCurrentRewardWeek(Math.max(currentRewardWeek, rewardData.currentRewardWeek));
          if (rewardData.lastDailyClaimDate) {
            setLastDailyClaimDate(rewardData.lastDailyClaimDate);
          }
        } else {
          // No DB record exists - create initial record with current localStorage values
          console.log("📤 [REWARDS-SYNC] No DB record found - creating initial record");
          console.log("📤 [REWARDS-SYNC] Current localStorage state:", {
            dailyStreak,
            currentRewardWeek,
            lastDailyClaimDate
          });
          
          try {
            await upsertRewardState({
              telegramId: authResult.profile.telegram_id,
              userId: authResult.profile.id,
              dailyStreak: dailyStreak,
              currentRewardWeek: currentRewardWeek,
              lastDailyClaimDate: lastDailyClaimDate,
              currentWeeklyPeriodStart: new Date().toISOString()
            });
            console.log("✅ [REWARDS-SYNC] Initial DB record created successfully");
          } catch (error) {
            console.error("❌ [REWARDS-SYNC] Failed to create initial DB record:", error);
          }
        }

        // Load and merge daily claims
        const serverClaims = await loadDailyClaimsFromDB(authResult.profile.telegram_id);
        if (serverClaims !== null) {
          const merged = mergeDailyClaims(claimedDailyRewards, serverClaims);
          setClaimedDailyRewards(merged);
          safeSetItem("claimedDailyRewards", merged);
        }

        // Load and merge NFTs
        const serverNFTs = await loadNFTsFromDB(authResult.profile.telegram_id);
        if (serverNFTs !== null) {
          const merged = mergeNFTs(ownedNFTs, serverNFTs);
          setOwnedNFTs(merged);
          safeSetItem("ownedNFTs", merged);
        }

        // Load Task State
        if (userId && telegramId) {
          await loadTasksFromDB();
          console.log("✅ [GameState] Tasks loaded and merged");
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
    const recoveryMultiplier = 1 + (boosters.recoveryRate - 1) * (0.05 / 0.3);
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
      buildParts: buildPartsData,
      dailyStreak: dailyStreak,
      currentRewardWeek: currentRewardWeek,
      lastDailyClaimDate: lastDailyClaimDate,
      dailyClaims: claimedDailyRewards,
      ownedNFTs: ownedNFTs
    };
  }, [bz, bb, xp, tier, energy, maxEnergy, boosters, quickChargeUsesRemaining, quickChargeCooldownUntil, totalTaps, todayTaps, bzPerHour, dailyStreak, currentRewardWeek, lastDailyClaimDate, claimedDailyRewards, ownedNFTs]);

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
        
        // Sync daily claims
        if (telegramId && userId && claimedDailyRewards.length > 0) {
          console.log("🎁 [MANUAL SYNC] Syncing daily claims...");
          const { syncDailyClaimsToDB } = await import("@/services/rewardDataService");
          const claimsResult = await syncDailyClaimsToDB(telegramId, userId, claimedDailyRewards);
          if (claimsResult.success) {
            console.log("✅ [MANUAL SYNC] Daily claims synced!");
          } else {
            console.error("❌ [MANUAL SYNC] Daily claims sync failed:", claimsResult.error);
          }
        }
        
        // Sync NFT purchases
        if (telegramId && userId && ownedNFTs.length > 0) {
          console.log("🖼️ [MANUAL SYNC] Syncing NFT purchases...");
          console.log("🖼️ [MANUAL SYNC] ownedNFTs array:", JSON.stringify(ownedNFTs));
          const { syncNFTsToDB } = await import("@/services/rewardDataService");
          const nftsResult = await syncNFTsToDB(telegramId, userId, ownedNFTs);
          if (nftsResult.success) {
            console.log("✅ [MANUAL SYNC] NFT purchases synced!");
          } else {
            console.error("❌ [MANUAL SYNC] NFT purchases sync failed:", nftsResult.error);
          }
        }
        
        // Sync Task Progress
        if (telegramId && userId) {
          console.log("📋 [MANUAL SYNC] Syncing task progress...");
          await syncTasksWithServer();
          console.log("✅ [MANUAL SYNC] Task sync completed");
        }
        
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

  // DAILY RESET CHECKER
  useEffect(() => {
    console.log("[Daily Reset] ✅ Daily reset checker mounted and active");
    
    const checkDailyReset = () => {
      const now = new Date();
      const currentDate = now.toDateString();
      const currentTime = now.toLocaleTimeString();
      
      console.log(`[Daily Reset] 🔍 Checking at ${currentTime}: current="${currentDate}" vs last="${lastResetDate}"`);

      if (currentDate !== lastResetDate) {
        console.log(`[Daily Reset] 🔄 NEW DAY DETECTED! Resetting daily stats.`);
        console.log(`[Daily Reset] Previous: "${lastResetDate}" → Current: "${currentDate}"`);

        // Reset ALL daily counters
        const newDate = currentDate;
        
        setTodayTaps(0);
        setHasClaimedIdleToday(false);
        setQuickChargeUsesRemaining(5);
        setQuickChargeCooldownUntil(null);
        setQuickChargeLastResetDate(newDate);
        setLastResetDate(newDate);

        // IMMEDIATELY write to localStorage
        safeSetItem("bunergy_todayTaps", 0);
        safeSetItem("bunergy_hasClaimedIdleToday", false);
        safeSetItem("bunergy_qc_uses", 5);
        safeSetItem("bunergy_qc_cooldown", null);
        safeSetItem("bunergy_qc_last_reset", newDate);
        safeSetItem("bunergy_lastResetDate", newDate);

        console.log(`[Daily Reset] ✅ Reset complete! New date: "${newDate}"`);
        console.log(`[Daily Reset] ✅ Counters: todayTaps=0, hasClaimedIdleToday=false, quickCharge=5`);

        toast({
          title: "🌅 New Day!",
          description: "Daily tasks and limits have been reset.",
        });
      } else {
        console.log(`[Daily Reset] ℹ️ Same day - no reset needed`);
      }
    };

    console.log("[Daily Reset] 🚀 Running initial check on mount...");
    checkDailyReset();
    
    console.log("[Daily Reset] ⏰ Setting up 1-minute interval...");
    const interval = setInterval(() => {
      console.log("[Daily Reset] ⏰ Interval tick - running check...");
      checkDailyReset();
    }, 60000);

    return () => {
      console.log("[Daily Reset] ⚠️ Checker unmounted, clearing interval");
      clearInterval(interval);
    };
  }, [lastResetDate, toast]);

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
        const recoveryMultiplier = 1 + (recoveryLevel - 1) * (0.05 / 0.3);
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

  const checkAndResetQuickCharge = () => {
    const now = Date.now();
    if (quickChargeCooldownUntil !== null && quickChargeCooldownUntil < now) {
      setQuickChargeUsesRemaining(5);
      setQuickChargeCooldownUntil(null);
      setQuickChargeLastResetDate(new Date().toDateString());
      console.log("🔄 [QuickCharge] Cooldown expired, resetting uses to 5");
    }
  };

  const addReward = (amount: number) => {
    setReward(p => p + amount);
    safeSetItem("bunergy_reward", reward + amount);
  };

  const claimReward = () => {
    if (reward > 0) {
      addBZ(reward);
      setReward(0);
      safeSetItem("bunergy_reward", 0);
      toast({ 
        title: "💰 Reward Claimed", 
        description: `You claimed ${reward} BZ!` 
      });
    }
  };

  const performDailyClaim = async (day: number, week: number, type: "BZ" | "BB" | "XP", amount: number) => {
    const today = new Date().toDateString();
    
    // 1. Update State & LocalStorage (Instant UX)
    setDailyStreak(day);
    setCurrentRewardWeek(week);
    setLastDailyClaimDate(today);
    
    // 2. Track claim locally for sync
    const claimRecord = {
      day,
      week,
      type,
      amount,
      timestamp: Date.now()
    };
    setClaimedDailyRewards(prev => [...prev, claimRecord]);
    console.log("📝 [DAILY-CLAIM] Tracked claim locally:", claimRecord);
    
    // 3. Update Balances
    if (type === "BZ") addBZ(amount);
    else if (type === "BB") addBB(amount);
    else if (type === "XP") addXP(amount);

    toast({
      title: "🎁 Daily Reward Claimed",
      description: `You received ${type === "BB" ? amount.toFixed(3) : amount.toLocaleString()} ${type}!`
    });

    // 4. Sync to Database (Background)
    if (telegramId && userId) {
      console.log("📤 [REWARDS-SYNC] Syncing daily claim to DB...");
      console.log("📤 [REWARDS-SYNC] Claim data:", { day, week, type, amount, telegramId, userId });
      
      try {
        // Update state table
        await upsertRewardState({
          telegramId,
          userId,
          dailyStreak: day,
          currentRewardWeek: week,
          lastDailyClaimDate: today,
          currentWeeklyPeriodStart: new Date().toISOString()
        });

        // Log transaction
        await claimDailyReward({
          telegramId,
          userId,
          day,
          bzClaimed: type === "BZ" ? amount : 0,
          bbClaimed: type === "BB" ? amount : 0,
          xpClaimed: type === "XP" ? amount : 0
        });
        
        console.log("✅ [REWARDS-SYNC] Daily claim synced to DB successfully");
      } catch (error) {
        console.error("❌ [REWARDS-SYNC] Failed to sync daily claim to DB:", error);
      }
    } else {
      console.error("❌ [REWARDS-SYNC] Cannot sync - missing telegramId or userId");
    }
  };

  const purchaseNFT = (nftId: string, priceInBB: number) => {
    // 1. Deduct BB
    if (!subtractBB(priceInBB)) {
      toast({
        title: "❌ Insufficient BB",
        description: `You need ${priceInBB.toFixed(6)} BB to purchase this NFT.`,
        variant: "destructive"
      });
      return;
    }

    // 2. Track NFT purchase locally
    const nftRecord = {
      nftId,
      purchasePrice: priceInBB,
      timestamp: Date.now()
    };
    setOwnedNFTs(prev => [...prev, nftRecord]);
    console.log("📝 [NFT-PURCHASE] Tracked NFT purchase locally:", nftRecord);

    toast({
      title: "🖼️ NFT Purchased",
      description: `You now own the ${nftId} NFT!`
    });

    // 3. Sync will happen on next manual/auto sync
    console.log("🔄 [NFT-PURCHASE] NFT purchase will sync on next sync");
  };

  return (
    <GameStateContext.Provider value={{
      telegramId,
      userId,
      bz, bb, energy, maxEnergy, bzPerHour, tier, xp, referralCount,
      dailyStreak, currentRewardWeek, lastDailyClaimDate,
      claimedDailyRewards, ownedNFTs,
      totalTaps, todayTaps, totalTapIncome, totalUpgrades, totalConversions,
      hasClaimedIdleToday, lastClaimTimestamp,
      boosters, upgradeBooster,
      quickChargeUsesRemaining, quickChargeCooldownUntil,
      isSyncing, lastSyncTime, isOnline, syncErrorCount, manualSync,
      addBZ, subtractBZ, addBB, subtractBB, addXP,
      setEnergy, setMaxEnergy, setBzPerHour, addReferral,
      incrementTotalTaps, incrementTaps, incrementUpgrades, incrementConversions,
      markIdleClaimed, subtractEnergy, useQuickCharge,
      checkAndResetQuickCharge,
      addReward,
      claimReward,
      performDailyClaim,
      purchaseNFT,
      telegramUser,
      isProfileOpen,
      setProfileOpen
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