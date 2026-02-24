import { useEffect, useState } from "react";
import { useGameState } from "@/contexts/GameStateContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DebugLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

// Global log storage so we capture logs even before component mounts
const globalLogs: DebugLog[] = [];
let isInterceptionSetup = false;

// Set up console interception globally
if (typeof window !== "undefined" && !isInterceptionSetup) {
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    const message = args.join(" ");
    // Capture all relevant logs
    if (message.includes("[MANUAL SYNC]") || 
        message.includes("[AUTO-SYNC]") || 
        message.includes("[Tap]") || 
        message.includes("[Sync]") || 
        message.includes("[BOOSTER]") || 
        message.includes("[REWARDS-SYNC]") || 
        message.includes("[TASKS-SYNC]") || 
        message.includes("[Tasks]") ||
        message.includes("[Daily Reset]") ||
        message.includes("[Weekly Reset]")) {
      
      globalLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        message,
        type: message.includes("✅") || message.includes("SUCCESS") ? "success" : 
              message.includes("❌") || message.includes("Error") || message.includes("failed") ? "error" : "info"
      });
      // Keep only last 50 logs
      if (globalLogs.length > 50) globalLogs.shift();
    }
    originalLog.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(" ");
    if (message.includes("Sync") || message.includes("sync") || 
        message.includes("Rewards") || message.includes("Tasks") || 
        message.includes("Daily Reset") || message.includes("Weekly Reset")) {
      globalLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        message,
        type: "error"
      });
      if (globalLogs.length > 50) globalLogs.shift();
    }
    originalError.apply(console, args);
  };

  isInterceptionSetup = true;
}

export function TelegramDebugPanel({ onClose }: { onClose: () => void }) {
  const gameState = useGameState();
  const [logs, setLogs] = useState<DebugLog[]>([...globalLogs]);

  // Update logs from global storage every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...globalLogs]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const testSync = async () => {
    console.log("🔵 [MANUAL SYNC] Test Sync: Manually calling gameState.manualSync()");
    
    try {
      await gameState.manualSync();
      console.log("✅ [MANUAL SYNC] Test Sync: manualSync() completed");
    } catch (error: any) {
      console.error(`❌ [MANUAL SYNC] Test Sync Error: ${error.message}`);
    }
  };

  const testWeeklyReset = () => {
    console.log("🧪 [Weekly Reset] TEST: Manual test button clicked");
    console.log(`🧪 [Weekly Reset] TEST: currentWeeklyPeriodStart = ${gameState.currentWeeklyPeriodStart}`);
    
    if (gameState.currentWeeklyPeriodStart) {
      const now = new Date();
      const periodStart = new Date(gameState.currentWeeklyPeriodStart);
      const daysPassed = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`🧪 [Weekly Reset] TEST: Current time = ${now.toISOString()}`);
      console.log(`🧪 [Weekly Reset] TEST: Period start = ${periodStart.toISOString()}`);
      console.log(`🧪 [Weekly Reset] TEST: Days passed = ${daysPassed}`);
      
      if (daysPassed >= 7) {
        console.log("🧪 [Weekly Reset] TEST: 7+ days detected! Should trigger reset.");
        gameState.resetWeeklyPeriod();
      } else {
        console.log(`🧪 [Weekly Reset] TEST: Only ${daysPassed} days passed, need 7+ days.`);
      }
    } else {
      console.log("🧪 [Weekly Reset] TEST: currentWeeklyPeriodStart is null/undefined!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto text-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">🔍 Sync Debug Panel</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sync Status */}
      <div className="bg-purple-900 p-4 rounded-lg mb-4">
        <h3 className="font-bold mb-2">📊 Sync Status</h3>
        <div className="text-sm space-y-1">
          <div>Is Syncing: <span className={gameState.isSyncing ? "text-yellow-400" : "text-green-400"}>{gameState.isSyncing ? "YES" : "NO"}</span></div>
          <div>Last Sync: <span className="text-blue-400">
            {gameState.lastSyncTime === 0 ? "NEVER" : new Date(gameState.lastSyncTime).toLocaleTimeString()}
          </span></div>
          <div>Online: <span className={gameState.isOnline ? "text-green-400" : "text-red-400"}>{gameState.isOnline ? "YES" : "NO"}</span></div>
          <div>Sync Error Count: <span className="text-orange-400">{gameState.syncErrorCount}</span></div>
        </div>
      </div>

      {/* Weekly Reset Status */}
      <div className="bg-purple-900 p-4 rounded-lg mb-4">
        <h3 className="font-bold mb-2">📅 Weekly Reset Status</h3>
        <div className="text-xs space-y-1 font-mono">
          <div>Current Weekly Period: <span className="text-blue-400">
            {gameState.currentWeeklyPeriodStart || "NOT SET"}
          </span></div>
          {gameState.currentWeeklyPeriodStart && (
            <div>Days Since Start: <span className="text-yellow-400">
              {Math.floor((Date.now() - new Date(gameState.currentWeeklyPeriodStart).getTime()) / (1000 * 60 * 60 * 24))}
            </span></div>
          )}
        </div>
      </div>

      {/* Tasks Reset Status */}
      <div className="bg-purple-900 p-4 rounded-lg mb-4">
        <h3 className="font-bold mb-2">📅 Tasks Reset Status</h3>
        <div className="text-xs space-y-1 font-mono">
          <div>Last Daily Reset: <span className="text-blue-400">
            {gameState.lastDailyReset ? new Date(gameState.lastDailyReset).toLocaleTimeString() : "NOT SET"}
          </span></div>
          <div>Last Weekly Reset: <span className="text-blue-400">
            {gameState.lastWeeklyReset ? new Date(gameState.lastWeeklyReset).toLocaleTimeString() : "NOT SET"}
          </span></div>
        </div>
      </div>

      {/* Game State */}
      <div className="bg-purple-900 p-4 rounded-lg mb-4">
        <h3 className="font-bold mb-2">🎮 Current Game State</h3>
        <div className="text-xs space-y-1 font-mono">
          <div>BZ: {gameState.bz.toLocaleString()}</div>
          <div>BB: {gameState.bb.toFixed(6)}</div>
          <div>XP: {gameState.xp.toLocaleString()}</div>
          <div>Tier: {gameState.tier}</div>
          <div>Total Taps: {gameState.totalTaps.toLocaleString()}</div>
          <div>Energy: {Math.floor(gameState.energy)} / {gameState.maxEnergy}</div>
          <div>Boosters: Income={gameState.boosters.incomePerTap}, Energy={gameState.boosters.energyPerTap}, Capacity={gameState.boosters.energyCapacity}, Recovery={gameState.boosters.recoveryRate}</div>
        </div>
      </div>

      {/* Manual Test Buttons */}
      <div className="space-y-2 mb-4">
        <Button 
          onClick={testSync} 
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={gameState.isSyncing}
        >
          {gameState.isSyncing ? "Syncing..." : "🧪 Test Manual Sync Now"}
        </Button>
        
        <Button 
          onClick={testWeeklyReset} 
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          🧪 Test Weekly Reset Detection
        </Button>
      </div>

      {/* Sync Logs */}
      <div className="bg-purple-900 p-4 rounded-lg">
        <h3 className="font-bold mb-2">📝 Sync Logs (Last 50)</h3>
        <div className="text-xs space-y-2 max-h-96 overflow-auto font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400">No logs yet... Click test buttons or wait for auto-sync</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`p-2 rounded ${
                log.type === "error" ? "bg-red-900/50" : 
                log.type === "success" ? "bg-green-900/50" : "bg-gray-800/50"
              }`}>
                <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}