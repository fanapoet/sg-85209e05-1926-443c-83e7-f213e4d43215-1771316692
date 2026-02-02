import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, AlertCircle, TrendingUp, TrendingDown, Clock, Divide, ArrowUpRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadConversionHistory } from "@/services/conversionService";
import { syncConversionToDB } from "@/services/syncService";

type ConversionType = "bz-to-bb" | "bb-to-bz";

interface Transaction {
  id: string;
  timestamp: number;
  type: ConversionType;
  input: number;
  output: number;
  bonus?: number;
  tier?: string;
}

const ANCHOR_RATE = 1000000;
const STORAGE_KEY = "conversionHistory";

export function ConvertScreen() {
  const { 
    bz, 
    bb, 
    tier, 
    addBZ, 
    subtractBZ, 
    addBB, 
    subtractBB, 
    incrementConversions,
    telegramId
  } = useGameState();
  
  const [conversionType, setConversionType] = useState<ConversionType>("bz-to-bb");
  const [inputAmount, setInputAmount] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load conversion history on mount (DB + localStorage merge with deduplication)
  useEffect(() => {
    const loadHistory = async () => {
      console.log("📥 [Convert] Loading conversion history...");
      
      // Load from localStorage first (instant)
      const localData = localStorage.getItem(STORAGE_KEY);
      let localTransactions: Transaction[] = [];
      
      if (localData) {
        try {
          localTransactions = JSON.parse(localData);
          setTransactions(localTransactions);
          console.log(`📥 [Convert] Loaded ${localTransactions.length} records from localStorage`);
        } catch (e) {
          console.error("❌ [Convert] Failed to parse localStorage:", e);
        }
      }

      // Load from DB if telegramId available (background)
      if (telegramId) {
        console.log("📥 [Convert] Loading from DB for telegram_id:", telegramId);
        const result = await loadConversionHistory(telegramId, 50);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log(`✅ [Convert] Loaded ${result.data.length} records from DB`);
          
          // DEDUPLICATION: Create a Map using transaction ID as key
          const transactionMap = new Map<string, Transaction>();
          
          // First, add all LOCAL transactions (they have full details with bonus)
          localTransactions.forEach(tx => {
            transactionMap.set(tx.id, tx);
          });
          
          // Then, add SERVER transactions ONLY if ID doesn't exist
          result.data.forEach(tx => {
            if (!transactionMap.has(tx.id)) {
              transactionMap.set(tx.id, tx);
            }
          });
          
          // Convert Map back to array, sort by timestamp, and limit to 50
          const merged = Array.from(transactionMap.values())
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50);
          
          setTransactions(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          
          const newFromServer = result.data.filter(tx => 
            !localTransactions.find(local => local.id === tx.id)
          ).length;
          
          console.log(`✅ [Convert] Merged: ${newFromServer} new from server, ${localTransactions.length} from local`);
        }
      }

      setIsInitialLoad(false);
    };

    loadHistory();
  }, [telegramId]);

  const saveTransaction = (tx: Transaction) => {
    // 1. Update UI immediately (no duplicates)
    const updated = [tx, ...transactions].slice(0, 50);
    setTransactions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    console.log("✅ [Convert] Saved to localStorage with ID:", tx.id);

    // 2. Background sync to DB (non-blocking)
    if (telegramId) {
      syncConversionToDB(telegramId, {
        id: tx.id,
        type: tx.type,
        input: tx.input,
        output: tx.output,
        bonus: tx.bonus,
        tier: tx.tier,
        timestamp: tx.timestamp
      }).then(result => {
        if (result.success) {
          console.log("✅ [Convert] Synced to DB with same ID:", tx.id);
        } else {
          console.warn("⚠️ [Convert] DB sync failed (data safe in localStorage):", result.error);
        }
      });
    }
  };

  const getTierPercent = (): number => {
    if (tier === "Bronze") return 0;
    if (tier === "Silver") return 5;
    if (tier === "Gold") return 15;
    if (tier === "Platinum") return 25;
    if (tier === "Diamond") return 40;
    return 0;
  };

  const tierPercent = getTierPercent();

  const calculatePreview = () => {
    const amount = parseFloat(inputAmount) || 0;
    if (amount <= 0) return { output: 0, burned: 0, bonus: 0, valid: false, error: "" };

    if (conversionType === "bz-to-bb") {
      if (bz < amount) {
        return { output: 0, burned: 0, bonus: 0, valid: false, error: "Insufficient BZ" };
      }

      const baseOutput = amount / ANCHOR_RATE;
      const bonusOutput = baseOutput * (tierPercent / 100);
      const totalOutput = baseOutput + bonusOutput;

      return {
        output: totalOutput,
        burned: 0,
        bonus: bonusOutput,
        valid: true,
        error: ""
      };
    } else {
      if (tierPercent === 0) {
        return { 
          output: 0, 
          burned: 0, 
          bonus: 0, 
          valid: false, 
          error: "Bronze tier cannot convert BB to BZ. Reach Silver tier to unlock." 
        };
      }

      const maxConversion = bb * (tierPercent / 100);

      if (amount > maxConversion) {
        return { 
          output: 0, 
          burned: 0, 
          bonus: 0, 
          valid: false, 
          error: `Max ${maxConversion.toFixed(6)} BB (${tierPercent}% of your balance)` 
        };
      }

      if (amount > bb) {
        return { 
          output: 0, 
          burned: 0, 
          bonus: 0, 
          valid: false, 
          error: "Insufficient BB" 
        };
      }

      const burned = amount / ((tierPercent / 100) * 2);
      const totalCost = amount + burned;

      if (totalCost > bb) {
        return {
          output: 0,
          burned: 0,
          bonus: 0,
          valid: false,
          error: `Need ${totalCost.toFixed(6)} BB total (${amount.toFixed(6)} convert + ${burned.toFixed(6)} burn)`
        };
      }

      const output = amount * ANCHOR_RATE;

      return { 
        output, 
        burned, 
        bonus: 0, 
        valid: true, 
        error: "" 
      };
    }
  };

  const preview = calculatePreview();

  const handleQuickFill = (type: "half" | "max") => {
    if (conversionType === "bz-to-bb") {
      const amount = type === "half" ? bz / 2 : bz;
      setInputAmount(amount.toString());
    } else {
      const eligible = bb * (tierPercent / 100);
      const amount = type === "half" ? eligible / 2 : eligible;
      setInputAmount(amount.toFixed(6));
    }
  };

  const handleConvert = async () => {
    const amount = parseFloat(inputAmount) || 0;
    if (!preview.valid || amount <= 0 || isLoading) return;

    setIsLoading(true);

    try {
      // Generate unique transaction ID (timestamp + random for uniqueness)
      const txId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (conversionType === "bz-to-bb") {
        if (subtractBZ(amount)) {
          addBB(preview.output);
          incrementConversions(amount);
          
          saveTransaction({
            id: txId,
            timestamp: Date.now(),
            type: "bz-to-bb",
            input: amount,
            output: preview.output,
            bonus: preview.bonus,
            tier
          });
          
          setInputAmount("");
        }
      } else {
        const totalCost = amount + preview.burned;
        if (subtractBB(totalCost)) {
          addBZ(preview.output);
          
          saveTransaction({
            id: txId,
            timestamp: Date.now(),
            type: "bb-to-bz",
            input: amount,
            output: preview.output,
            tier
          });
          
          setInputAmount("");
        }
      }
    } catch (error) {
      console.error("Conversion error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBB = (value: number): string => {
    return value.toFixed(6);
  };

  const formatBZ = (value: number): string => {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-6 space-y-4 max-w-2xl mx-auto pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Convert</h1>
        <p className="text-sm text-muted-foreground">
          Anchor Rate: 1,000,000 BZ = 1.000000 BB
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">BunZap (BZ)</p>
            <p className="text-2xl font-bold">{formatBZ(bz)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BunBun (BB)</p>
            <p className="text-2xl font-bold">{formatBB(bb)}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex gap-2">
          <Button
            variant={conversionType === "bz-to-bb" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setConversionType("bz-to-bb");
              setInputAmount("");
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            BZ → BB
          </Button>
          <Button
            variant={conversionType === "bb-to-bz" ? "default" : "outline"}
            className="flex-1"
            onClick={() => {
              setConversionType("bb-to-bz");
              setInputAmount("");
            }}
          >
            <TrendingDown className="mr-2 h-4 w-4" />
            BB → BZ
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {conversionType === "bz-to-bb" ? "BZ Amount" : "BB Amount"}
            </label>
            <Badge variant="outline">{tier}</Badge>
          </div>
          <Input
            type="number"
            placeholder="0"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="text-lg"
          />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("half")}
              className="flex-1"
            >
              <Divide className="mr-1 h-3 w-3" />
              Half
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("max")}
              className="flex-1"
            >
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Max
            </Button>
          </div>

          {conversionType === "bz-to-bb" && tierPercent > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Tier bonus: +{tierPercent}% extra BB on conversion
            </p>
          )}
          {conversionType === "bz-to-bb" && tierPercent === 0 && (
            <p className="text-xs text-muted-foreground">
              Bronze tier: No conversion bonus (standard 1:1 rate)
            </p>
          )}
          {conversionType === "bb-to-bz" && tierPercent > 0 && (
            <p className="text-xs text-muted-foreground">
              Max: {formatBB(bb * (tierPercent / 100))} BB ({tierPercent}% of your balance)
            </p>
          )}
          {conversionType === "bb-to-bz" && tierPercent === 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Bronze tier cannot convert BB to BZ. Reach Silver tier to unlock.
            </p>
          )}
        </div>

        {parseFloat(inputAmount) > 0 && preview.valid && (
          <div className="space-y-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You will receive:</span>
              <span className="font-bold text-lg">
                {conversionType === "bz-to-bb" 
                  ? `${formatBB(preview.output)} BB`
                  : `${formatBZ(preview.output)} BZ`
                }
              </span>
            </div>
            
            {conversionType === "bz-to-bb" && preview.bonus > 0 && (
              <>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Base conversion:</span>
                  <span className="font-medium">
                    {formatBB(preview.output - preview.bonus)} BB
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">Tier bonus (+{tierPercent}%):</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{formatBB(preview.bonus)} BB
                  </span>
                </div>
              </>
            )}
            
            {conversionType === "bb-to-bz" && preview.burned > 0 && (
              <>
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Conversion amount:</span>
                  <span className="font-medium">
                    {formatBB(parseFloat(inputAmount))} BB
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600 dark:text-red-400">Burned:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatBB(preview.burned)} BB
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-2 font-semibold">
                  <span className="text-muted-foreground">Total cost:</span>
                  <span>
                    {formatBB(parseFloat(inputAmount) + preview.burned)} BB
                  </span>
                </div>
              </>
            )}

            {conversionType === "bb-to-bz" && preview.valid && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <p className="font-semibold mb-1">Burn formula:</p>
                <p>burned = converted_amount ÷ (tier% × 2)</p>
                <p className="mt-1">
                  = {formatBB(parseFloat(inputAmount))} ÷ ({tierPercent}% × 2) = {formatBB(preview.burned)} BB burned
                </p>
              </div>
            )}
          </div>
        )}

        {preview.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleConvert}
          disabled={!preview.valid || parseFloat(inputAmount) <= 0 || isLoading}
          className="w-full"
          size="lg"
        >
          <ArrowLeftRight className="mr-2 h-5 w-5" />
          {isLoading ? "Converting..." : "Convert"}
        </Button>

        <div className="text-xs text-muted-foreground space-y-2 border-t pt-3">
          <p className="font-semibold">Tier Conversion Rules:</p>
          <div className="space-y-1">
            <p><span className="font-medium">BZ → BB:</span> Bonus output (+{tierPercent}% for {tier})</p>
            <p><span className="font-medium">BB → BZ:</span> {tierPercent === 0 ? "Locked (Silver+ only)" : `Max ${tierPercent}% of balance, with burn penalty`}</p>
          </div>
          <div className="border-t pt-2 mt-2">
            <p className="font-semibold mb-1">Tier Limits (BB → BZ):</p>
            <div className="grid grid-cols-2 gap-1">
              <span>Bronze: 0% (locked)</span>
              <span>Silver: 5%</span>
              <span>Gold: 15%</span>
              <span>Platinum: 25%</span>
              <span>Diamond: 40%</span>
            </div>
          </div>
        </div>
      </Card>

      {transactions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Transactions
          </h3>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {tx.type === "bz-to-bb" ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-blue-600" />
                    )}
                    <span className="font-medium">
                      {tx.type === "bz-to-bb" 
                        ? `${formatBZ(tx.input)} BZ → ${formatBB(tx.output)} BB`
                        : `${formatBB(tx.input)} BB → ${formatBZ(tx.output)} BZ`
                      }
                    </span>
                  </div>
                  {tx.bonus && tx.bonus > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 ml-5">
                      Bonus: +{formatBB(tx.bonus)} BB
                    </p>
                  )}
                  {tx.tier && (
                    <p className="text-xs text-muted-foreground ml-5">
                      Tier: {tx.tier}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(tx.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}