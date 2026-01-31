import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { TelegramBlocker } from "@/components/TelegramBlocker";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { CompactDashboard } from "@/components/CompactDashboard";
import { BottomNav } from "@/components/BottomNav";
import { TapScreen } from "@/components/screens/TapScreen";
import { BoostScreen } from "@/components/screens/BoostScreen";
import { BuildScreen } from "@/components/screens/BuildScreen";
import { ConvertScreen } from "@/components/screens/ConvertScreen";
import { XPTiersScreen } from "@/components/screens/XPTiersScreen";
import { RewardsNFTsScreen } from "@/components/screens/RewardsNFTsScreen";
import { TasksReferralsScreen } from "@/components/screens/TasksReferralsScreen";

type TabKey = "tap" | "boost" | "build" | "convert" | "xp" | "rewards" | "tasks";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("tap");
  const [isInTelegram, setIsInTelegram] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  useEffect(() => {
    // Check if running in Telegram
    const checkTelegram = () => {
      const isTg = !!(window.Telegram?.WebApp?.initData);
      setIsInTelegram(isTg);

      if (isTg) {
        // Expand to full height
        window.Telegram?.WebApp?.expand();
      }
    };

    checkTelegram();
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  // Show loading while checking Telegram
  if (isInTelegram === null) {
    return (
      <>
        <SEO 
          title="Bunergy - Tap to Earn Game"
          description="Play Bunergy, the ultimate tap-to-earn Telegram mini app. Build, earn, and compete!"
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  // Show blocker if not in Telegram
  if (!isInTelegram) {
    return (
      <>
        <SEO 
          title="Bunergy - Telegram Mini App"
          description="Open Bunergy inside Telegram to play!"
        />
        <TelegramBlocker />
      </>
    );
  }

  // ALWAYS show loading screen on app start
  if (showWelcome) {
    return (
      <>
        <SEO 
          title="Welcome to Bunergy"
          description="Tap, Build, Earn & Compete - Remember to come back every 4 hours!"
        />
        <WelcomeScreen onComplete={handleWelcomeComplete} />
      </>
    );
  }

  // Main game interface
  const renderScreen = () => {
    switch (activeTab) {
      case "tap":
        return <TapScreen />;
      case "boost":
        return <BoostScreen />;
      case "build":
        return <BuildScreen />;
      case "convert":
        return <ConvertScreen />;
      case "xp":
        return <XPTiersScreen />;
      case "rewards":
        return <RewardsNFTsScreen />;
      case "tasks":
        return <TasksReferralsScreen />;
      default:
        return <TapScreen />;
    }
  };

  return (
    <>
      <SEO 
        title="Bunergy - Play & Earn"
        description="Tap, build, and earn in Bunergy - The ultimate Telegram mini app game!"
      />
      <div className="min-h-screen bg-background pb-20">
        <CompactDashboard />
        <main className="pt-2">
          {renderScreen()}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}