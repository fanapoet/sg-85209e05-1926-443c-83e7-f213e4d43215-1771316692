import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useGameState } from "@/contexts/GameStateContext";
import { SEO } from "@/components/SEO";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { telegramUser } = useGameState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <SEO 
        title="Profile - Bunergy"
        description="View your Bunergy profile and stats"
      />
      
      {/* Overlay Modal */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="fixed inset-x-0 bottom-0 top-20 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 rounded-t-3xl shadow-2xl animate-slide-up overflow-y-auto">
          
          {/* Profile Header */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-amber-200 dark:border-gray-700">
            <Avatar className="w-20 h-20 mb-4 ring-4 ring-amber-400 dark:ring-amber-600">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl font-bold">
                {telegramUser?.first_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-1">
              {telegramUser?.first_name || "Player"} {telegramUser?.last_name || ""}
            </h2>
            
            {/* Telegram ID under username */}
            {telegramUser?.id && (
              <p className="text-sm text-amber-700 dark:text-amber-300 font-mono">
                ID: {telegramUser.id}
              </p>
            )}
          </div>

          {/* Profile Content */}
          <div className="p-6 space-y-4">
            {/* Username Section */}
            {telegramUser?.username && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Telegram Username</p>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  @{telegramUser.username}
                </p>
              </div>
            )}

            {/* Language Section */}
            {telegramUser?.language_code && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Language</p>
                <p className="text-lg font-semibold text-amber-900 dark:text-amber-100 uppercase">
                  {telegramUser.language_code}
                </p>
              </div>
            )}

            {/* Premium Badge */}
            {telegramUser?.is_premium && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-4 shadow-md">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  Telegram Premium User
                </p>
              </div>
            )}
          </div>

          {/* Close Button at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white to-transparent dark:from-gray-900 dark:to-transparent">
            <Button
              onClick={handleClose}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 text-lg"
            >
              <X className="w-6 h-6" />
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}