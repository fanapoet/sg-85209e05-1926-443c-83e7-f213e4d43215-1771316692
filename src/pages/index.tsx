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
import { TelegramDebugPanel } from "@/components/TelegramDebugPanel";
import { Button } from "@/components/ui/button";
import { ProfileModal } from "@/components/ProfileModal";
import { useGameState } from "@/contexts/GameStateContext";

type TabKey = "tap" | "boost" | "build" | "convert" | "xp" | "rewards" | "tasks";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("tap");
  const [isInTelegram, setIsInTelegram] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get game state to check if it's ready
  // FIXED: Moved out of try/catch to satisfy React Rules of Hooks
  const gameState = useGameState();

  useEffect(() => {
    console.log("🏠 [Home] Component mounted");
    
    // Check if running in Telegram
    const checkTelegram = async () => {
      try {
        const isTg = !!(window.Telegram?.WebApp?.initData);
        console.log("🔍 [Home] Telegram detection:", { isTg, initData: window.Telegram?.WebApp?.initData });
        setIsInTelegram(isTg);

        if (isTg) {
          console.log("✅ [Home] Running inside Telegram WebApp");
          setIsAuthenticating(false);
        } else {
          console.log("⚠️ [Home] NOT running inside Telegram - showing blocker");
          setIsAuthenticating(false);
        }
      } catch (err) {
        console.error("❌ [Home] Error during Telegram check:", err);
        setError("Failed to check Telegram status");
        setIsAuthenticating(false);
      }
    };

    checkTelegram();
  }, []);

  // Handle Telegram back button for sub-screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      const handleBackButton = () => {
        if (activeTab !== "tap") {
          setActiveTab("tap");
        }
      };
      
      tg.BackButton.onClick(handleBackButton);
      
      if (activeTab === "tap" && !showWelcome) {
        tg.BackButton.hide();
      } else if (!showWelcome) {
        tg.BackButton.show();
      }
      
      return () => {
        tg.BackButton.offClick(handleBackButton);
      };
    }
  }, [activeTab, showWelcome]);

  const handleWelcomeComplete = () => {
    console.log("👋 [Home] Welcome screen completed");
    
    // Wait a bit for game state to be ready
    setTimeout(() => {
      console.log("👋 [Home] Setting showWelcome to false");
      setShowWelcome(false);
      setInitializationComplete(true);
    }, 500);
  };

  // Show error screen if something went wrong
  if (error) {
    return (
      <>
        <SEO title="Error - Bunergy" description="An error occurred" />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-red-500">⚠️ Error</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Show loading while checking Telegram
  if (isInTelegram === null || isAuthenticating) {
    return (
      <>
        <SEO 
          title="Bunergy - Tap to Earn Game"
          description="Play Bunergy, the ultimate tap-to-earn Telegram mini app. Build, earn, and compete!"
        />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">
              {isAuthenticating ? "Connecting..." : "Loading..."}
            </p>
          </div>
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

  // Show welcome screen on app start
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

  // Wait for initialization to complete before showing main interface
  if (!initializationComplete) {
    return (
      <>
        <SEO title="Loading - Bunergy" description="Loading game..." />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Initializing game...</p>
          </div>
        </div>
      </>
    );
  }

  // Main game interface
  const renderScreen = () => {
    try {
      console.log("🎮 [Home] Rendering screen:", activeTab);
      
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
    } catch (err) {
      console.error("❌ [Home] Error rendering screen:", err);
      return (
        <div className="p-4 text-center">
          <p className="text-red-500">Error loading screen</p>
          <Button onClick={() => setActiveTab("tap")} className="mt-4">
            Return to Home
          </Button>
        </div>
      );
    }
  };

  return (
    <>
      <SEO 
        title="Bunergy - Play & Earn"
        description="Tap, build, and earn in Bunergy - The ultimate Telegram mini app game!"
      />
      <div className="min-h-screen bg-background pb-20 safe-area-inset">
        <CompactDashboard />
        <main className="pt-2">
          {renderScreen()}
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        <Button
          onClick={() => setShowDebug(true)}
          className="fixed bottom-20 left-4 z-40 bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          Show Debug
        </Button>

        {showDebug && <TelegramDebugPanel onClose={() => setShowDebug(false)} />}
        
        <ProfileModal />
      </div>
    </>
  );
}