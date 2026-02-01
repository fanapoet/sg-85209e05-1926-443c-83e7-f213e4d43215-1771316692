import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Debug Panel to diagnose Telegram WebApp integration
 * Shows real-time status of Telegram data and auth
 */
export function TelegramDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkTelegramData = async () => {
      const tg = (window as any).Telegram?.WebApp;
      
      const info = {
        // Telegram WebApp Status
        telegramAvailable: !!tg,
        telegramVersion: tg?.version || "N/A",
        platform: tg?.platform || "N/A",
        
        // Telegram User Data
        telegramUser: tg?.initDataUnsafe?.user || null,
        telegramUserId: tg?.initDataUnsafe?.user?.id || "NOT FOUND",
        telegramUsername: tg?.initDataUnsafe?.user?.username || "N/A",
        telegramFirstName: tg?.initDataUnsafe?.user?.first_name || "N/A",
        
        // Profile Check
        profileExists: false,
        profileData: null,
      };

      // Check if profile exists by telegram_id
      if (info.telegramUserId !== "NOT FOUND") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, telegram_id, display_name, username, bz_balance, bb_balance, total_taps, tier, referral_code")
          .eq("telegram_id", info.telegramUserId)
          .maybeSingle();

        if (profile) {
          info.profileExists = true;
          info.profileData = profile;
        }
      }

      setDebugInfo(info);
    };

    checkTelegramData();
    
    // Refresh every 5 seconds
    const interval = setInterval(checkTelegramData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!debugInfo) return null;

  return (
    <>
      {/* Toggle Button - Fixed bottom-left */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-20 left-4 z-[9999] bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-bold"
      >
        {isVisible ? "Hide Debug" : "Show Debug"}
      </button>

      {/* Debug Panel - Only show when visible */}
      {isVisible && (
        <div className="fixed bottom-32 left-4 z-[9999] bg-black/95 text-white p-4 rounded-lg shadow-2xl max-w-md max-h-96 overflow-y-auto text-xs font-mono">
          <h3 className="text-sm font-bold mb-3 text-yellow-400">🔍 Telegram Debug Panel</h3>
          
          {/* Telegram WebApp Status */}
          <div className="mb-3">
            <div className="text-green-400 font-bold mb-1">📱 Telegram WebApp:</div>
            <div>Available: {debugInfo.telegramAvailable ? "✅ YES" : "❌ NO"}</div>
            <div>Version: {debugInfo.telegramVersion}</div>
            <div>Platform: {debugInfo.platform}</div>
          </div>

          {/* Telegram User Data */}
          <div className="mb-3">
            <div className="text-blue-400 font-bold mb-1">👤 Telegram User:</div>
            <div>User ID: <span className={debugInfo.telegramUserId === "NOT FOUND" ? "text-red-500" : "text-green-400"}>{debugInfo.telegramUserId}</span></div>
            <div>Username: {debugInfo.telegramUsername}</div>
            <div>First Name: {debugInfo.telegramFirstName}</div>
            {debugInfo.telegramUser && (
              <pre className="mt-1 text-[10px] bg-gray-900 p-1 rounded overflow-x-auto">
                {JSON.stringify(debugInfo.telegramUser, null, 2)}
              </pre>
            )}
          </div>

          {/* Profile Status */}
          <div className="mb-3">
            <div className="text-purple-400 font-bold mb-1">💾 Database Profile:</div>
            <div>Exists: {debugInfo.profileExists ? "✅ YES" : "❌ NO"}</div>
            {debugInfo.profileData && (
              <div className="mt-1">
                <div>Profile ID: <span className="text-green-400">{debugInfo.profileData.id}</span></div>
                <div>Telegram ID: <span className={debugInfo.profileData.telegram_id ? "text-green-400" : "text-red-500"}>{debugInfo.profileData.telegram_id || "NULL ❌"}</span></div>
                <div>Display Name: {debugInfo.profileData.display_name || "NULL"}</div>
                <div>Username: {debugInfo.profileData.username || "NULL"}</div>
                <div>Referral Code: <span className="text-yellow-400">{debugInfo.profileData.referral_code || "NULL"}</span></div>
                <div>BZ Balance: <span className="text-green-400">{debugInfo.profileData.bz_balance}</span></div>
                <div>BB Balance: <span className="text-blue-400">{Number(debugInfo.profileData.bb_balance).toFixed(6)}</span></div>
                <div>Total Taps: {debugInfo.profileData.total_taps}</div>
                <div>Tier: <span className="text-orange-400">{debugInfo.profileData.tier}</span></div>
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="pt-3 border-t border-gray-700">
            <div className="font-bold text-yellow-300">Status Summary:</div>
            {debugInfo.telegramUserId === "NOT FOUND" && (
              <div className="text-red-400 mt-1">❌ Telegram user data NOT found! Open in Telegram app.</div>
            )}
            {!debugInfo.profileExists && debugInfo.telegramUserId !== "NOT FOUND" && (
              <div className="text-red-400 mt-1">❌ Profile NOT created in database!</div>
            )}
            {debugInfo.profileData && !debugInfo.profileData.telegram_id && (
              <div className="text-red-400 mt-1">❌ Profile exists but telegram_id is NULL!</div>
            )}
            {debugInfo.profileData && debugInfo.profileData.telegram_id && (
              <div className="text-green-400 mt-1">✅ Everything working correctly!</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}