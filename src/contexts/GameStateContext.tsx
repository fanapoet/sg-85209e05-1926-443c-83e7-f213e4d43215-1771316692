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
import { getRewardState, upsertRewardState, startNewWeeklyPeriod } from "@/services/rewardStateService";
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
  checkAndResetTasks,
  claimTaskReward
} from "@/services/tasksService";
import { upsertTaskState } from "@/services/taskStateService";
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
  currentWeeklyPeriodStart: string | null;
  lastWeeklyReset: string | null;
  lastDailyReset: string | null;
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
  performTaskClaim: (
    taskId: string,
    taskType: "daily" | "weekly" | "progressive",
    rewardType: "BZ" | "BB" | "XP",
    rewardAmount: number
  ) => Promise<{ success: boolean; error?: any }>;
  purchaseNFT: (nftId: string, priceInBB: number) => void;
  resetWeeklyPeriod: () => Promise<void>;
  resetWeeklyTasks: () => Promise<void>;
  resetDailyTasks: () => Promise<void>;
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
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
  const [currentWeeklyPeriodStart, setCurrentWeeklyPeriodStart] = useState<string | null>(() => safeGetItem("currentWeeklyPeriodStart", null));
  const [lastWeeklyReset, setLastWeeklyReset] = useState<string | null>(() => safeGetItem("lastWeeklyReset", null));
  const [lastDailyReset, setLastDailyReset] = useState<string | null>(() => safeGetItem("lastDailyReset", null));
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
  const [initAttempts, setInitAttempts] = useState(0);
  const [maxInitAttempts, setMaxInitAttempts] = useState(3);

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
  useEffect(() => { safeSetItem("currentWeeklyPeriodStart", currentWeeklyPeriodStart); }, [currentWeeklyPeriodStart]);
  useEffect(() => { safeSetItem("lastWeeklyReset", lastWeeklyReset); }, [lastWeeklyReset]);
  useEffect(() => { safeSetItem("lastDailyReset", lastDailyReset); }, [lastDailyReset]);
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
      
      try {
        // Capture Telegram User Data directly from WebApp if available
        if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
          const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
          console.log("👤 [GameState] Captured Telegram User:", tgUser);
          setTelegramUser(tgUser as TelegramUser);
        }

        const authResult = await initializeUser();
        
        if (!authResult.success || !authResult.profile) {
          console.error("❌ [GameState] User initialization failed:", authResult.error);
          setInitError(authResult.error || "Failed to initialize user");
          setIsInitialized(true);
          return;
        }
        
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
          if (rewardData.currentWeeklyPeriodStart) {
            setCurrentWeeklyPeriodStart(rewardData.currentWeeklyPeriodStart);
            console.log("✅ [REWARDS-SYNC] Loaded currentWeeklyPeriodStart:", rewardData.currentWeeklyPeriodStart);
          } else {
            // Initialize weekly period if not set
            const now = new Date().toISOString();
            setCurrentWeeklyPeriodStart(now);
            await startNewWeeklyPeriod(authResult.profile.telegram_id, now);
            console.log("✅ [REWARDS-SYNC] Initialized new weekly period:", now);
          }
        } else {
          // Initialize weekly period for new users
          const now = new Date().toISOString();
          setCurrentWeeklyPeriodStart(now);
          console.log("✅ [REWARDS-SYNC] New user - initialized weekly period:", now);
        }

        // Load Task State & Initialize reset tracking record
        if (userId && telegramId) {
          await loadTasksFromDB();
          console.log("✅ [GameState] Tasks loaded and merged");
          
          const today = new Date().toISOString().split("T")[0];
          console.log("📤 [TASK-STATE] Ensuring reset tracking record exists");
          
          const { getTaskState } = await import("@/services/taskStateService");
          const currentState = await getTaskState(authResult.profile.telegram_id);
          
          if (currentState?.lastWeeklyReset) {
            setLastWeeklyReset(currentState.lastWeeklyReset);
            console.log("✅ [TASK-STATE] Loaded lastWeeklyReset from DB:", currentState.lastWeeklyReset);
          } else {
            setLastWeeklyReset(today);
          }
          
          if (currentState?.lastDailyReset) {
            setLastDailyReset(currentState.lastDailyReset);
            console.log("✅ [TASK-STATE] Loaded lastDailyReset from DB:", currentState.lastDailyReset);
          } else {
            setLastDailyReset(today);
          }

          // Only create record if user doesn't have one (new user)
          if (!currentState) {
            await upsertTaskState({
              telegramId: authResult.profile.telegram_id,
              userId: authResult.profile.id,
              lastDailyReset: today,
              lastWeeklyReset: today
            });
            console.log("✅ [TASK-STATE] Created new reset tracking record for new user");
          } else {
            console.log("✅ [TASK-STATE] Using existing reset tracking record from DB");
          }
        }
        
        // Mark initialization as complete
        console.log("✅ [GameState] Initialization complete!");
        setIsInitialized(true);
        
      } catch (error) {
        console.error("❌ [GameState] Initialization error:", error);
        setInitError(error instanceof Error ? error.message : "Unknown initialization error");
        setIsInitialized(true);
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
      quickChargeLastReset: quickChargeLastResetDate,
      totalTaps: totalTaps,
      todayTaps: todayTaps,
      idleBzPerHour: bzPerHour,
      buildParts: buildPartsData,
      dailyStreak: dailyStreak,
      currentRewardWeek: currentRewardWeek,
      lastDailyClaimDate: lastDailyClaimDate,
      dailyClaims: claimedDailyRewards,
      ownedNFTs: ownedNFTs,
      lastDailyReset: lastDailyReset,
      lastWeeklyReset: lastWeeklyReset
    };
  }, [bz, bb, xp, tier, energy, maxEnergy, boosters, quickChargeUsesRemaining, quickChargeCooldownUntil, totalTaps, todayTaps, bzPerHour, dailyStreak, currentRewardWeek, lastDailyClaimDate, claimedDailyRewards, ownedNFTs, lastDailyReset, lastWeeklyReset, quickChargeLastResetDate]);

  // Manual Sync Function
  const manualSync = async () => {
    console.log("🔘 [MANUAL SYNC] ========== FUNCTION CALLED ==========");
    console.log("🔘 [MANUAL SYNC] Step 1: Preparing game state...");
    console.log("🔘 [MANUAL SYNC] Auth State Check:", { telegramId, userId, hasBoth: !!(telegramId && userId) });
    
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
          console.log("📋 [MANUAL SYNC] telegramId:", telegramId, "userId:", userId);
          await syncTasksWithServer();
          console.log("✅ [MANUAL SYNC] Task sync completed");
        } else {
          console.warn("⚠️ [MANUAL SYNC] Skipping task sync - missing auth:", { telegramId, userId });
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

  // COMBINED DAILY + WEEKLY RESET CHECKER
  useEffect(() => {
    console.log("[Reset Checker] ✅ Reset checker mounted and active");
    
    const checkResets = async () => {
      const now = new Date();
      const currentDate = now.toDateString();
      const currentTime = now.toLocaleTimeString();
      const today = now.toISOString().split("T")[0];
      
      console.log(`[Reset Checker] 🔍 Checking at ${currentTime}`);
      console.log(`[Reset Checker] Current date: ${currentDate} (ISO: ${today})`);
      console.log(`[Reset Checker] Last daily reset: ${lastResetDate}`);
      console.log(`[Reset Checker] Last daily reset (ISO): ${lastDailyReset}`);
      console.log(`[Reset Checker] Last weekly reset (ISO): ${lastWeeklyReset}`);
      console.log(`[Reset Checker] Weekly period start: ${currentWeeklyPeriodStart}`);

      let needsSync = false;

      // CHECK 1: DAILY RESET (local toDateString comparison)
      if (currentDate !== lastResetDate) {
        console.log(`[Reset Checker] 🔄 NEW DAY DETECTED!`);
        console.log(`[Reset Checker] Previous: "${lastResetDate}" → Current: "${currentDate}"`);

        // Reset ALL daily counters IMMEDIATELY
        setTodayTaps(0);
        setHasClaimedIdleToday(false);
        setQuickChargeUsesRemaining(5);
        setQuickChargeCooldownUntil(null);
        setQuickChargeLastResetDate(currentDate);
        setLastResetDate(currentDate);

        // IMMEDIATELY write to localStorage
        safeSetItem("bunergy_todayTaps", 0);
        safeSetItem("bunergy_hasClaimedIdleToday", false);
        safeSetItem("bunergy_qc_uses", 5);
        safeSetItem("bunergy_qc_cooldown", null);
        safeSetItem("bunergy_qc_last_reset", currentDate);
        safeSetItem("bunergy_lastResetDate", currentDate);

        console.log(`[Reset Checker] ✅ Daily counters reset complete!`);
        
        toast({
          title: "🌅 New Day!",
          description: "Daily tasks and limits have been reset.",
        });
        
        needsSync = true;
      }

      // CHECK 2: DAILY TASK RESET (ISO date comparison) - FIXED
      if (lastDailyReset && lastDailyReset !== today) {
        console.log(`[Reset Checker] 🔄 DAILY TASKS RESET NEEDED!`);
        console.log(`[Reset Checker] DB date: "${lastDailyReset}" → Current: "${today}"`);
        
        await resetDailyTasks();
        needsSync = true;
      }

      // CHECK 3: WEEKLY TASK RESET (7-day period check) - FIXED
      if (lastWeeklyReset) {
        const lastWeeklyResetDateObj = new Date(lastWeeklyReset + 'T00:00:00Z');
        const nowUTC = new Date(today + 'T00:00:00Z');
        const daysSinceWeeklyReset = Math.floor((nowUTC.getTime() - lastWeeklyResetDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`[Reset Checker] 📅 Days since weekly task reset: ${daysSinceWeeklyReset}`);
        console.log(`[Reset Checker] Last weekly reset: ${lastWeeklyReset}`);
        
        if (daysSinceWeeklyReset >= 7) {
          console.log(`[Reset Checker] 🔄 WEEKLY TASKS RESET NEEDED! (${daysSinceWeeklyReset} days passed)`);
          await resetWeeklyTasks();
          needsSync = true;
        }
      }

      // CHECK 4: WEEKLY REWARDS PERIOD RESET (7-day period check) - FIXED
      if (currentWeeklyPeriodStart) {
        const periodStart = new Date(currentWeeklyPeriodStart);
        const daysSincePeriodStart = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`[Reset Checker] 🎁 Days since weekly rewards period start: ${daysSincePeriodStart}`);
        console.log(`[Reset Checker] Period start: ${currentWeeklyPeriodStart}`);
        
        if (daysSincePeriodStart >= 7) {
          console.log(`[Reset Checker] 🔄 WEEKLY REWARDS PERIOD RESET NEEDED! (${daysSincePeriodStart} days passed)`);
          await resetWeeklyPeriod();
          needsSync = true;
        }
      }

      // Sync all resets to DB if needed
      if (needsSync) {
        console.log(`[Reset Checker] 📤 Syncing reset changes to database...`);
        setTimeout(() => {
          syncPlayerState(getFullStateForSync());
        }, 500);
      } else {
        console.log(`[Reset Checker] ℹ️ No resets needed at this time`);
      }
    };

    console.log("[Reset Checker] 🚀 Running initial check on mount...");
    checkResets();
    
    console.log("[Reset Checker] ⏰ Setting up 1-minute interval...");
    const interval = setInterval(() => {
      console.log("[Reset Checker] ⏰ Interval tick - running check...");
      checkResets();
    }, 60000);

    return () => {
      console.log("[Reset Checker] ⚠️ Checker unmounted, clearing interval");
      clearInterval(interval);
    };
  }, [lastResetDate, lastDailyReset, lastWeeklyReset, currentWeeklyPeriodStart, toast]);

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
    setTodayTaps(p => {
      const newValue = p + count;
      console.log(`📊 [GameState] todayTaps updated: ${p} → ${newValue}`);
      return newValue;
    });
    setTotalTapIncome(p => p + income);
  };

  const incrementUpgrades = () => setTotalUpgrades(p => p + 1);
  const incrementConversions = (amount: number) => setTotalConversions(p => p + amount);
  const markIdleClaimed = () => {
    console.log("💰 [Idle] Marking idle as claimed, updating state...");
    setHasClaimedIdleToday(true);
    setLastClaimTimestamp(Date.now());
    
    // IMMEDIATELY write to localStorage
    safeSetItem("bunergy_hasClaimedIdleToday", true);
    safeSetItem("bunergy_lastClaimTimestamp", Date.now());
    
    console.log("💰 [Idle] hasClaimedIdleToday set to TRUE");
    console.log("💰 [Idle] Triggering immediate sync");
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
    
    // 1. Update State & Local Storage (Instant UX)
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
          currentWeeklyPeriodStart: currentWeeklyPeriodStart || new Date().toISOString()
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

  const performTaskClaim = async (
    taskId: string,
    taskType: "daily" | "weekly" | "progressive",
    rewardType: "BZ" | "BB" | "XP",
    rewardAmount: number
  ) => {
    console.log("📋 [TASK-CLAIM] Starting claim process...");
    console.log("📋 [TASK-CLAIM] Params:", { taskId, taskType, rewardType, rewardAmount });
    console.log("📋 [TASK-CLAIM] Auth state:", { telegramId, userId });

    try {
      // 1. Update Balances (Instant UX)
      if (rewardType === "BZ") addBZ(rewardAmount);
      if (rewardType === "BB") addBB(rewardAmount);
      if (rewardType === "XP") addXP(rewardAmount);
      console.log("✅ [TASK-CLAIM] Balance updated");
      
      // 2. Update Local Task State AND sync to database
      const success = await claimTaskReward(taskId);
      console.log("✅ [TASK-CLAIM] Task claimed and synced to DB:", success);
      
      if (!success) {
        throw new Error("Failed to claim task");
      }
      
      return { success: true };
    } catch (error) {
      console.error("❌ [TASK-CLAIM] Claim failed:", error);
      return { success: false, error };
    }
  };

  const resetWeeklyPeriod = async () => {
    if (!telegramId) return;
    const now = new Date().toISOString();
    
    console.log("🔄 [Weekly Reset] Resetting weekly rewards period");
    console.log("🔄 [Weekly Reset] New period start:", now);
    
    // 1. Update local state immediately
    setCurrentWeeklyPeriodStart(now);
    
    // 2. Sync to DB
    try {
      await startNewWeeklyPeriod(telegramId, now);
      console.log("✅ [Weekly Reset] Database updated with new period start:", now);
    } catch (error) {
      console.error("❌ [Weekly Reset] Failed to update database:", error);
    }
  };

  const resetWeeklyTasks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log("🔄 [Weekly Tasks Reset] Resetting weekly tasks");
    console.log("🔄 [Weekly Tasks Reset] New reset date:", today);
    
    setLastWeeklyReset(today);
    
    // Update localStorage
    safeSetItem("lastWeeklyReset", today);
    
    // Reset tasks in tasksService
    checkAndResetTasks();
    
    // Sync to database
    if (userId && telegramId) {
      console.log("📤 [Weekly Tasks Reset] Syncing to database...");
      await upsertTaskState({
        telegramId,
        userId,
        lastDailyReset: lastDailyReset || today,
        lastWeeklyReset: today
      });
      console.log("✅ [Weekly Tasks Reset] Synced to database");
    }
  }, [userId, telegramId, lastDailyReset]);

  const resetDailyTasks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log("🔄 [Daily Tasks Reset] Resetting daily tasks");
    console.log("🔄 [Daily Tasks Reset] New reset date:", today);
    
    // CRITICAL: Update React state IMMEDIATELY
    setLastDailyReset(today);
    setTodayTaps(0);
    setHasClaimedIdleToday(false);
    
    console.log("✅ [Daily Tasks Reset] React state updated: todayTaps=0, hasClaimedIdleToday=false");
    
    // Update localStorage
    safeSetItem("lastDailyReset", today);
    safeSetItem("bunergy_todayTaps", 0);
    safeSetItem("bunergy_hasClaimedIdleToday", false);
    
    // Reset tasks in tasksService
    checkAndResetTasks();
    
    // Sync to database
    if (userId && telegramId) {
      console.log("📤 [Daily Tasks Reset] Syncing to database...");
      await upsertTaskState({
        telegramId,
        userId,
        lastDailyReset: today,
        lastWeeklyReset: lastWeeklyReset || today
      });
      console.log("✅ [Daily Tasks Reset] Synced to database");
    }
  }, [userId, telegramId, lastWeeklyReset]);

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
      dailyStreak, currentRewardWeek, lastDailyClaimDate, currentWeeklyPeriodStart, lastWeeklyReset, lastDailyReset,
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
      performTaskClaim,
      purchaseNFT,
      resetWeeklyPeriod,
      resetWeeklyTasks,
      resetDailyTasks,
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