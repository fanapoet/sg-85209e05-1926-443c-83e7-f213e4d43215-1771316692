import { SEO } from "@/components/SEO";
import { useEffect, useState } from "react";
import { CompactDashboard } from "@/components/CompactDashboard";
import { BottomNav } from "@/components/BottomNav";
import { TapScreen } from "@/components/screens/TapScreen";
import { BoostScreen } from "@/components/screens/BoostScreen";
import { BuildScreen } from "@/components/screens/BuildScreen";
import { ConvertScreen } from "@/components/screens/ConvertScreen";
import { XPTiersScreen } from "@/components/screens/XPTiersScreen";
import { RewardsNFTsScreen } from "@/components/screens/RewardsNFTsScreen";
import { TasksReferralsScreen } from "@/components/screens/TasksReferralsScreen";
import { TelegramBlocker } from "@/components/TelegramBlocker";

type TabKey = "tap" | "boost" | "build" | "convert" | "xp" | "rewards" | "tasks";

export default function Home() {
  const [isInTelegram, setIsInTelegram] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("tap");

  useEffect(() => {
    // Clear corrupted tasks data on first load (one-time migration)
    const migrationKey = "bunergy_tasks_migration_v2";
    if (typeof window !== "undefined" && !localStorage.getItem(migrationKey)) {
      try {
        localStorage.removeItem("bunergy_tasks");
        localStorage.setItem(migrationKey, "done");
        console.log("✅ Tasks data migration complete");
      } catch (e) {
        console.error("❌ Migration error:", e);
      }
    }

    // STRICT Telegram detection - only real Telegram Mini Apps pass
    const maxAttempts = 6;
    let currentAttempt = 0;
    
    const detectTelegram = () => {
      currentAttempt++;
      
      const tg = (window as any).Telegram?.WebApp;
      
      // CRITICAL: Must have ALL of these to be considered valid Telegram environment
      const hasTelegramObject = typeof (window as any).Telegram !== "undefined";
      const hasWebApp = tg && typeof tg === "object";
      const hasInitData = tg && typeof tg.initData === "string" && tg.initData.length > 0;
      const hasInitDataUnsafe = tg && typeof tg.initDataUnsafe === "object";
      const hasVersion = tg && typeof tg.version === "string";
      
      // Debug logging
      console.log(`🔍 Telegram Detection Attempt ${currentAttempt}/${maxAttempts}:`, {
        hasTelegramObject,
        hasWebApp,
        hasInitData,
        hasInitDataUnsafe,
        hasVersion,
        initDataLength: tg?.initData?.length || 0,
        platform: tg?.platform || "none",
        version: tg?.version || "none"
      });

      // STRICT CHECK: Must have WebApp object AND (initData OR initDataUnsafe)
      // This ensures it's a real Telegram Mini App, not just a browser with the script loaded
      const isValidTelegram = hasWebApp && (hasInitData || hasInitDataUnsafe);

      if (isValidTelegram) {
        console.log("✅ VALID Telegram Mini App detected!");
        setIsInTelegram(true);
        
        // Initialize Telegram Mini App
        try {
          tg.ready();
          tg.expand();
          
          // Apply Telegram theme
          const applyTheme = () => {
            const isDark = tg.colorScheme === "dark";
            document.documentElement.classList.toggle("dark", isDark);
            console.log(`🎨 Theme applied: ${isDark ? "dark" : "light"}`);
          };
          
          applyTheme();
          tg.onEvent("themeChanged", applyTheme);
          
          console.log("✅ Telegram Mini App initialized successfully");
        } catch (error) {
          console.error("❌ Telegram initialization error:", error);
        }
        
        return true;
      }

      // If we've tried all attempts and still no valid Telegram, show blocker
      if (currentAttempt >= maxAttempts) {
        console.log("❌ NOT a Telegram Mini App - showing blocker");
        setIsInTelegram(false);
        return false;
      }

      return false;
    };

    // Immediate check
    if (detectTelegram()) return;
    
    // Progressive retry delays: 50ms, 150ms, 300ms, 600ms, 1000ms, 2000ms
    const delays = [50, 150, 300, 600, 1000, 2000];
    const timers = delays.map((delay) => 
      setTimeout(() => {
        detectTelegram();
      }, delay)
    );
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Loading state - show while detecting
  if (isInTelegram === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 bg-purple-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="text-gray-700 dark:text-gray-300 font-medium">
            Detecting environment...
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Verifying Telegram Mini App
          </div>
        </div>
      </div>
    );
  }

  // Blocker for non-Telegram environments (browsers, Softgen preview, etc.)
  if (!isInTelegram) {
    return <TelegramBlocker />;
  }

  // Main app shell (only in real Telegram Mini Apps)
  return (
    <>
      <SEO
        title="Bunergy - Telegram Mini App"
        description="Build, tap, and earn in the Bunergy game"
      />
      
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Compact Dashboard */}
        <CompactDashboard />
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20">
          {activeTab === "tap" && <TapScreen />}
          {activeTab === "boost" && <BoostScreen />}
          {activeTab === "build" && <BuildScreen />}
          {activeTab === "convert" && <ConvertScreen />}
          {activeTab === "xp" && <XPTiersScreen />}
          {activeTab === "rewards" && <RewardsNFTsScreen />}
          {activeTab === "tasks" && <TasksReferralsScreen />}
        </main>
        
        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}