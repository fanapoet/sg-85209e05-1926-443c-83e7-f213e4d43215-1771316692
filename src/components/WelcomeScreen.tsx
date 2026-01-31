import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, TrendingUp } from "lucide-react";
import Image from "next/image";

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [dots, setDots] = useState("");

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-purple-500/5 to-background">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="relative w-24 h-24">
            <Image 
              src="/bunergy-logo.png" 
              alt="Bunergy" 
              width={96} 
              height={96}
              className="object-contain drop-shadow-2xl animate-pulse"
              priority
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-7 w-7 text-yellow-500 animate-pulse" />
            Bunergy
          </h1>
          <p className="text-sm text-muted-foreground">
            Tap, Build, Earn & Compete
          </p>
        </div>

        {/* Loading Animation */}
        <div className="py-4">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-shimmer" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Loading{dots}
          </p>
        </div>

        {/* Important Reminder Card */}
        <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <div className="flex items-start gap-3">
            <Clock className="h-8 w-8 text-orange-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="text-left space-y-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                ⏰ Important Reminder
              </h3>
              <p className="text-sm leading-relaxed">
                <strong className="text-orange-600 dark:text-orange-400">Come back every 4 hours</strong> to collect your idle profits!
              </p>
              <p className="text-xs text-muted-foreground">
                After 4 hours, profit generation stops until you claim your rewards.
              </p>
            </div>
          </div>
        </Card>

        {/* Quick Tips */}
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            <span>Build parts to increase idle income</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            <span>Invite friends for XP bonuses</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>Claim idle profits regularly</span>
          </div>
        </div>

        {/* Skip Button */}
        <Button 
          onClick={onComplete} 
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          Skip
        </Button>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          .animate-shimmer {
            animation: shimmer 2s infinite linear;
          }
        `}</style>
      </Card>
    </div>
  );
}