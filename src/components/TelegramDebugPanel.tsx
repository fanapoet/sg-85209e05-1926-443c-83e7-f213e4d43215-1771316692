import { useEffect, useState } from "react";
import { useGameState } from "@/contexts/GameStateContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DebugLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

export function TelegramDebugPanel({ onClose }: { onClose: () => void }) {
  const gameState = useGameState();
  const [logs, setLogs] = useState<DebugLog[]>([]);

  // Intercept console.log for sync-related messages
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const message = args.join(" ");
      if (message.includes("[MANUAL SYNC]") || message.includes("[AUTO-SYNC]") || 
          message.includes("[Tap]") || message.includes("[Sync]") || 
          message.includes("[BOOSTER]") || message.includes("[REWARDS-SYNC]") || 
          message.includes("[TASKS-SYNC]") || message.includes("[Tasks]") ||
          message.includes("[Daily Reset]")) {
        setLogs(prev => [...prev.slice(-20), {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: "info"
        }]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.join(" ");
      if (message.includes("Sync") || message.includes("sync") || message.includes("Rewards") || message.includes("Tasks")) {
        setLogs(prev => [...prev.slice(-20), {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: "error"
        }]);
      }
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const testSync = async () => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message: "🔵 Test Sync: Manually calling gameState.manualSync()",
      type: "info"
    }]);
    
    try {
      await gameState.manualSync();
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        message: "✅ Test Sync: manualSync() completed",
        type: "success"
      }]);
    } catch (error: any) {
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Test Sync Error: ${error.message}`,
        type: "error"
      }]);
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

      {/* Manual Test Button */}
      <Button 
        onClick={testSync} 
        className="w-full mb-4 bg-green-600 hover:bg-green-700"
        disabled={gameState.isSyncing}
      >
        {gameState.isSyncing ? "Syncing..." : "🧪 Test Manual Sync Now"}
      </Button>

      {/* Sync Logs */}
      <div className="bg-purple-900 p-4 rounded-lg">
        <h3 className="font-bold mb-2">📝 Sync Logs (Last 20)</h3>
        <div className="text-xs space-y-2 max-h-96 overflow-auto font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-400">No logs yet... Click "Test Manual Sync" or wait for auto-sync</div>
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