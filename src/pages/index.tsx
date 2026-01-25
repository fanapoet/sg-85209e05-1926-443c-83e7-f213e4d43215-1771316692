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
    // Check if running inside Telegram
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg) {
      setIsInTelegram(true);
      
      // Initialize Telegram Mini App
      tg.ready();
      tg.expand();
      
      // Apply Telegram theme
      const applyTheme = () => {
        const isDark = tg.colorScheme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
      };
      
      applyTheme();
      
      // Listen for theme changes
      tg.onEvent("themeChanged", applyTheme);
      
      return () => {
        tg.offEvent("themeChanged", applyTheme);
      };
    } else {
      setIsInTelegram(false);
    }
  }, []);

  // Loading state
  if (isInTelegram === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  // Blocker for non-Telegram environments
  if (!isInTelegram) {
    return <TelegramBlocker />;
  }

  // Main app shell
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