import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGameState } from "@/contexts/GameStateContext";
import { CompactDashboard } from "@/components/CompactDashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Award, TrendingUp, Zap, Calendar, Users } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const {
    bz,
    bb,
    xp,
    tier,
    energy,
    maxEnergy,
    bzPerHour,
    totalTaps,
    referralCount,
  } = useGameState();

  // Calculate tier bonus based on tier
  const getTierBonus = (tier: string): number => {
    const bonuses: Record<string, number> = {
      Bronze: 0,
      Silver: 5,
      Gold: 10,
      Platinum: 15,
      Diamond: 20,
    };
    return bonuses[tier] || 0;
  };

  const tierBonus = getTierBonus(tier);

  const [telegramUser, setTelegramUser] = useState<{
    firstName: string;
    lastName?: string;
    username?: string;
    id: number;
  } | null>(null);

  const [joinDate, setJoinDate] = useState<string>("");

  useEffect(() => {
    // Get Telegram user data
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setTelegramUser({
          firstName: user.first_name || "Player",
          lastName: user.last_name,
          username: user.username,
          id: user.id,
        });
      }
    }

    // Get join date from localStorage (or use current date as placeholder)
    const stored = localStorage.getItem("bunergy_join_date");
    if (stored) {
      setJoinDate(new Date(stored).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }));
    } else {
      // First time - save current date
      const now = new Date().toISOString();
      localStorage.setItem("bunergy_join_date", now);
      setJoinDate(new Date(now).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }));
    }
  }, []);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-US").format(Math.floor(num));
  };

  const formatBB = (num: number): string => {
    return num.toFixed(6);
  };

  const stats = [
    { icon: Award, label: "Tier", value: tier, color: "text-purple-500" },
    { icon: TrendingUp, label: "Tier Bonus", value: `+${tierBonus}%`, color: "text-green-500" },
    { icon: Zap, label: "Energy", value: `${Math.floor(energy)}/${maxEnergy}`, color: "text-yellow-500" },
    { icon: TrendingUp, label: "BZ/h", value: bzPerHour.toFixed(1), color: "text-orange-500" },
    { icon: User, label: "Total Taps", value: formatNumber(totalTaps || 0), color: "text-blue-500" },
    { icon: Users, label: "Referrals", value: formatNumber(referralCount || 0), color: "text-pink-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <CompactDashboard />

      <div className="p-4 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            {/* Avatar */}
            <Avatar className="w-24 h-24 border-4 border-amber-500/30">
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-600 text-white font-bold text-3xl">
                {telegramUser?.firstName?.charAt(0) || "P"}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {telegramUser?.firstName || "Player"}
                {telegramUser?.lastName && ` ${telegramUser.lastName}`}
              </h1>
              {telegramUser?.username && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  @{telegramUser.username}
                </p>
              )}
              {joinDate && (
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {joinDate}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Balances */}
        <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Balances
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">BunZap (BZ)</span>
              <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {formatNumber(bz)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">BunBun (BB)</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatBB(bb)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Experience (XP)</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {formatNumber(xp)}
              </span>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Statistics
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Telegram Info */}
        {telegramUser && (
          <Card className="p-4 bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Telegram ID: {telegramUser.id}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}