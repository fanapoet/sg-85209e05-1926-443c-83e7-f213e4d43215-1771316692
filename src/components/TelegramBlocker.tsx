import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function TelegramBlocker() {
  const handleOpenBot = () => {
    window.open("https://t.me/bunergy_bot/BunBun", "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-orange-950 dark:to-yellow-950">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-2 border-orange-300 dark:border-orange-700">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/bunergy-logo.png"
            alt="Bunergy"
            width={200}
            height={200}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
            Welcome to Bunergy! ⚡
          </h1>
          <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
            Your Energy, Your Earnings
          </p>
        </div>

        {/* Description */}
        <div className="space-y-3 text-muted-foreground">
          <p className="text-base">
            <strong className="text-foreground">Bunergy</strong> runs exclusively inside Telegram for secure identity and instant gameplay.
          </p>
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-950 dark:to-yellow-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              🎮 Tap to earn BunZap (BZ)<br/>
              ⚡ Build your energy empire<br/>
              🏆 Climb tiers for bigger rewards<br/>
              🤝 Invite friends and earn together!
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleOpenBot}
          size="lg"
          className="w-full text-lg font-bold bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg"
        >
          Open @bunergy_bot 🚀
        </Button>

        <p className="text-xs text-muted-foreground">
          Start playing now and join thousands of energy enthusiasts! 💎
        </p>
      </Card>
    </div>
  );
}