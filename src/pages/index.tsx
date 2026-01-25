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
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    // Clear corrupted tasks data on first load (one-time migration)
    const migrationKey = "bunergy_tasks_migration_v2";
    if (typeof window !== "undefined" && !localStorage.getItem(migrationKey)) {
      try {
        // Clear potentially corrupted task data
        localStorage.removeItem("bunergy_tasks");
        localStorage.setItem(migrationKey, "done");
        console.log("Tasks data cleared for fresh start");
      } catch (e) {
        console.error("Migration error:", e);
      }
    }

    // Enhanced Telegram detection with multiple checks
    let detectionComplete = false;
    
    const detectTelegram = () => {
      if (detectionComplete) return;

      // Check 1: Telegram WebApp object
      const tg = (window as any).Telegram?.WebApp;
      
      // Check 2: Telegram platform
      const isTgPlatform = (window as any).Telegram?.WebApp?.platform;
      
      // Check 3: Init data (most reliable)
      const hasInitData = tg && typeof tg.initData === "string";
      
      // Check 4: User agent hints
      const userAgent = navigator.userAgent.toLowerCase();
      const isTelegramUA = userAgent.includes("telegram");

      const debug = `TG Object: ${!!tg}, Platform: ${isTgPlatform || "none"}, InitData: ${hasInitData}, UA: ${isTelegramUA}`;
      setDebugInfo(debug);
      console.log("Telegram Detection:", debug);

      // Consider it Telegram if ANY strong indicator is present
      const isTelegram = hasInitData || (tg && isTgPlatform) || isTelegramUA;

      if (isTelegram) {
        detectionComplete = true;
        setIsInTelegram(true);
        
        // Initialize Telegram Mini App
        try {
          if (tg) {
            tg.ready();
            tg.expand();
            
            // Apply Telegram theme
            const applyTheme = () => {
              const isDark = tg.colorScheme === "dark";
              document.documentElement.classList.toggle("dark", isDark);
            };
            
            applyTheme();
            tg.onEvent("themeChanged", applyTheme);
          }
        } catch (error) {
          console.error("Telegram initialization error:", error);
        }
        
        return true;
      }
      
      return false;
    };

    // Immediate check
    if (detectTelegram()) return;
    
    // Retry with delays (SDK might load asynchronously)
    const timers = [50, 150, 300, 600, 1000, 2000].map((delay, index) => 
      setTimeout(() => {
        if (detectTelegram()) {
          // Clear remaining timers
          timers.slice(index + 1).forEach(clearTimeout);
        } else if (delay === 2000) {
          // Final attempt failed - not in Telegram
          detectionComplete = true;
          setIsInTelegram(false);
          console.log("Final verdict: Not in Telegram environment");
        }
      }, delay)
    );
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // Loading state
  if (isInTelegram === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <div className="text-muted-foreground text-sm">Detecting environment...</div>
          {debugInfo && (
            <div className="text-xs text-muted-foreground/60 max-w-xs mx-auto font-mono">
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Blocker for non-Telegram environments
  if (!isInTelegram) {
    return <TelegramBlocker />;
  }

  // Main app shell (only in Telegram)
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