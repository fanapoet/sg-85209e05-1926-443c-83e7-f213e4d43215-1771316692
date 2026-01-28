import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, Zap, Users, Target, Award } from "lucide-react";
import { useGameState } from "@/contexts/GameStateContext";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const { 
    BZ, 
    BB, 
    XP, 
    currentTier, 
    nextTier,
    referralCount,
    totalTaps,
    todayTaps,
  } = useGameState();
  
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Calculate progress to next tier
  const getTierProgress = () => {
    const tiers = [
      { name: "Bronze", min: 0, max: 10000, bonus: 0 },
      { name: "Silver", min: 10001, max: 50000, bonus: 5 },
      { name: "Gold", min: 50001, max: 150000, bonus: 15 },
      { name: "Platinum", min: 150001, max: 500000, bonus: 25 },
      { name: "Diamond", min: 500001, max: Infinity, bonus: 40 },
    ];

    const current = tiers.find(t => XP >= t.min && XP <= t.max) || tiers[0];
    const next = tiers[tiers.indexOf(current) + 1] || null;

    if (!next) {
      return { current, next: null, progress: 100, remaining: 0 };
    }

    const progress = ((XP - current.min) / (next.min - current.min)) * 100;
    const remaining = next.min - XP;

    return { current, next, progress, remaining };
  };

  const tierInfo = getTierProgress();

  const handleContinue = () => {
    if (dontShowAgain) {
      localStorage.setItem("bunergy_hide_welcome", "true");
    }
    // Update last shown date
    localStorage.setItem("bunergy_welcome_last_shown", new Date().toDateString());
    onComplete();
  };

  // Quick tips based on user progress
  const getPersonalizedTips = () => {
    const tips = [];

    // Tier progression tip
    if (tierInfo.next) {
      if (tierInfo.remaining < 5000) {
        tips.push({
          icon: <Award className="h-5 w-5 text-yellow-500" />,
          title: `Almost ${tierInfo.next.name}!`,
          description: `Just ${tierInfo.remaining.toLocaleString()} XP away from +${tierInfo.next.bonus}% bonus`,
          priority: 1
        });
      } else {
        tips.push({
          icon: <Target className="h-5 w-5 text-purple-500" />,
          title: `Next Tier: ${tierInfo.next.name}`,
          description: `${tierInfo.remaining.toLocaleString()} XP needed for +${tierInfo.next.bonus}% bonus`,
          priority: 2
        });
      }
    }

    // Referral tip
    if (referralCount < 5) {
      tips.push({
        icon: <Users className="h-5 w-5 text-blue-500" />,
        title: "Invite Friends",
        description: `Invite ${5 - referralCount} more friends to unlock Energy boosters (+2,500 XP each)`,
        priority: referralCount === 0 ? 1 : 3
      });
    }

    // Tapping tip
    if (todayTaps < 100) {
      tips.push({
        icon: <Zap className="h-5 w-5 text-green-500" />,
        title: "Keep Tapping!",
        description: `Tap ${100 - todayTaps} more times today to complete daily task (+1,000 XP)`,
        priority: 2
      });
    }

    // Build tip (always show if no other priority 1)
    if (!tips.some(t => t.priority === 1)) {
      tips.push({
        icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
        title: "Upgrade Your Build",
        description: "Each part upgrade earns you XP and increases your BZ/hour income",
        priority: 2
      });
    }

    return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };

  const tips = getPersonalizedTips();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-purple-500/5 to-background">
      <Card className="w-full max-w-lg p-6 space-y-6 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-3xl shadow-lg">
              🐰
            </div>
          </div>
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Welcome Back to Bunergy!
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's your progress summary
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
            <p className="text-xl font-bold text-green-600">
              {BZ.toLocaleString()} <span className="text-sm">BZ</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {BB.toFixed(6)} BB
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <p className="text-xs text-muted-foreground mb-1">Total Taps</p>
            <p className="text-xl font-bold text-purple-600">
              {totalTaps.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {todayTaps} today
            </p>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <p className="text-xs text-muted-foreground mb-1">Your XP</p>
            <p className="text-xl font-bold text-blue-600">
              {XP.toLocaleString()}
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {tierInfo.current.name}
            </Badge>
          </Card>

          <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <p className="text-xs text-muted-foreground mb-1">Referrals</p>
            <p className="text-xl font-bold text-orange-600">
              {referralCount}
            </p>
            <p className="text-xs text-muted-foreground">
              friends invited
            </p>
          </Card>
        </div>

        {/* Tier Progress */}
        {tierInfo.next && (
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-sm">Tier Progress</p>
                    <p className="text-xs text-muted-foreground">
                      {tierInfo.current.name} → {tierInfo.next.name}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {Math.floor(tierInfo.progress)}%
                </Badge>
              </div>
              <Progress value={tierInfo.progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{XP.toLocaleString()} XP</span>
                <span className="font-semibold text-yellow-600">
                  {tierInfo.remaining.toLocaleString()} XP to go
                </span>
                <span>{tierInfo.next.min.toLocaleString()} XP</span>
              </div>
            </div>
          </Card>
        )}

        {/* Personalized Tips */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quick Actions to Level Up
          </h3>
          {tips.map((tip, index) => (
            <Card key={index} className="p-3 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{tip.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{tip.title}</p>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Don't Show Again Checkbox */}
        <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
          <Checkbox 
            id="dont-show" 
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="dont-show"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Don't show this screen again
          </label>
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleContinue} 
          size="lg" 
          className="w-full text-base h-12"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Start Playing!
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Tap, Build, Earn, and Compete! 🚀
        </p>
      </Card>
    </div>
  );
}