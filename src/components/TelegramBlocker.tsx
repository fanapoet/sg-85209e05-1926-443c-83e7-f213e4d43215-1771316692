import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TelegramBlocker() {
  const handleOpenBot = () => {
    window.open("https://t.me/bunergy_bot", "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Open in Telegram
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            This mini-app runs inside Telegram for secure identity and instant gameplay.
          </p>
        </div>
        
        <Button
          onClick={handleOpenBot}
          size="lg"
          className="w-full text-lg h-14"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Open @bunergy_bot
        </Button>
      </div>
    </div>
  );
}