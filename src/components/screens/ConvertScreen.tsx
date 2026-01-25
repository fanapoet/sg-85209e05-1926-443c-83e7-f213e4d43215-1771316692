import { useGameState } from "@/contexts/GameStateContext";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, AlertCircle, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ConversionType = "bz-to-bb" | "bb-to-bz";

interface Transaction {
  id: string;
  timestamp: number;
  type: ConversionType;
  input: number;
  output: number;
  burned?: number;
  bonus?: number;
}

const ANCHOR_RATE = 1000000; // 1,000,000 BZ = 1.000000 BB

export function ConvertScreen() {
  const { bz, bb, tier, addBZ, subtractBZ, addBB, subtractBB, incrementConversions } = useGameState();
  const [conversionType, setConversionType] = useState<ConversionType>("bz-to-bb");
  const [inputAmount, setInputAmount] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load transaction history
  useEffect(() => {
    const saved = localStorage.getItem("conversionHistory");
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  const saveTransaction = (tx: Transaction) => {
    const updated = [tx, ...transactions].slice(0, 20); // Keep last 20
    setTransactions(updated);
    localStorage.setItem("conversionHistory", JSON.stringify(updated));
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
  const tierMultiplier = 1 + (tierPercent / 100);

  const calculatePreview = () => {
    const amount = parseFloat(inputAmount) || 0;
    if (amount <= 0) return { output: 0, burned: 0, valid: false, error: "" };

    if (conversionType === "bz-to-bb") {
      // BZ → BB: Apply tier bonus to output
      const baseOutput = amount / ANCHOR_RATE;
      const output = baseOutput * tierMultiplier;
      const bonus = baseOutput * (tierPercent / 100);
      return { 
        output, 
        burned: 0, 
        bonus,
        valid: bz >= amount, 
        error: bz < amount ? "Insufficient BZ" : "" 
      };
    } else {
      // BB → BZ: Limited by tier%, with burn
      const maxConversion = bb * (tierPercent / 100);
      
      if (tierPercent === 0) {
        return { output: 0, burned: 0, bonus: 0, valid: false, error: "Bronze tier cannot convert BB to BZ" };
      }
      
      if (amount > maxConversion) {
        return { output: 0, burned: 0, bonus: 0, valid: false, error: `Max ${maxConversion.toFixed(6)} BB (${tierPercent}% of balance)` };
      }
      
      if (amount > bb) {
        return { output: 0, burned: 0, bonus: 0, valid: false, error: "Insufficient BB" };
      }

      const burned = amount / (tierPercent / 100 * 2);
      const output = amount * ANCHOR_RATE;
      
      return { output, burned, bonus: 0, valid: true, error: "" };
    }
  };

  const preview = calculatePreview();

  const handleConvert = () => {
    const amount = parseFloat(inputAmount) || 0;
    if (!preview.valid || amount <= 0) return;

    if (conversionType === "bz-to-bb") {
      if (subtractBZ(amount)) {
        addBB(preview.output);
        incrementConversions(amount); // Track for tasks/challenges
        saveTransaction({
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: "bz-to-bb",
          input: amount,
          output: preview.output
        });
        setInputAmount("");
      }
    } else {
      if (subtractBB(amount + preview.burned)) {
        addBZ(preview.output);
        saveTransaction({
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: "bb-to-bz",
          input: amount,
          output: preview.output,
          burned: preview.burned
        });
        setInputAmount("");
      }
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
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Convert</h1>
        <p className="text-sm text-muted-foreground">
          Anchor Rate: 1,000,000 BZ = 1.000000 BB
        </p>
      </div>

      {/* Balances */}
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

      {/* Conversion Type Toggle */}
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

      {/* Conversion Form */}
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

        {/* Preview */}
        {parseFloat(inputAmount) > 0 && (
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
            
            {conversionType === "bz-to-bb" && preview.bonus && preview.bonus > 0 && (
              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Base conversion:</span>
                <span className="font-medium">
                  {formatBB(preview.output - preview.bonus)} BB
                </span>
              </div>
            )}

            {conversionType === "bz-to-bb" && preview.bonus && preview.bonus > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">Tier bonus (+{tierPercent}%):</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  +{formatBB(preview.bonus)} BB
                </span>
              </div>
            )}
            
            {conversionType === "bb-to-bz" && preview.burned > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Burned:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatBB(preview.burned)} BB
                </span>
              </div>
            )}

            {conversionType === "bb-to-bz" && preview.valid && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <p>Burn formula: converted_amount ÷ (tier% × 2)</p>
                <p className="mt-1">
                  = {formatBB(parseFloat(inputAmount))} ÷ ({tierPercent}% × 2) = {formatBB(preview.burned)} BB burned
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {preview.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{preview.error}</AlertDescription>
          </Alert>
        )}

        {/* Convert Button */}
        <Button
          onClick={handleConvert}
          disabled={!preview.valid || parseFloat(inputAmount) <= 0}
          className="w-full"
          size="lg"
        >
          <ArrowLeftRight className="mr-2 h-5 w-5" />
          Convert
        </Button>

        {/* Tier Bonus Info */}
        {conversionType === "bb-to-bz" && (
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <p className="font-semibold">Tier Conversion Limits:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>Bronze: 0%</span>
              <span>Silver: 5%</span>
              <span>Gold: 15%</span>
              <span>Platinum: 25%</span>
              <span>Diamond: 40%</span>
            </div>
          </div>
        )}
      </Card>

      {/* Transaction History */}
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
                  {tx.burned && tx.burned > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 ml-5">
                      Burned: {formatBB(tx.burned)} BB
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