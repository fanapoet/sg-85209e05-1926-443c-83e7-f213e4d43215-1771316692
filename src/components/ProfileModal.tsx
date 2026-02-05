import { useGameState } from "@/contexts/GameStateContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfileModal() {
  const { isProfileOpen, setProfileOpen, telegramUser, tier } = useGameState();
  const { toast } = useToast();

  if (!isProfileOpen) return null;

  const handleClose = () => {
    setProfileOpen(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Fallback if no Telegram user data (e.g. testing in browser)
  const user = telegramUser || {
    id: 0,
    first_name: "Bunny",
    last_name: "Player",
    username: "bunergy_player",
    language_code: "en",
    is_premium: false
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 transform transition-all animate-in slide-in-from-bottom duration-300 border-t border-amber-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Avatar className="w-24 h-24 ring-4 ring-amber-100 dark:ring-gray-800 shadow-xl mb-3">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-3xl font-bold text-white">
                {user.first_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-gray-900">
              {tier}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user.first_name} {user.last_name}
          </h2>
          
          {/* Username & ID Grouped at Top */}
          <div className="flex flex-col items-center gap-1 mt-1">
            {user.username && (
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                @{user.username}
              </p>
            )}
            <div 
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => copyToClipboard(user.id.toString(), "ID")}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                ID: {user.id}
              </span>
              <Copy className="w-3 h-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-amber-100 dark:border-gray-700">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Language</p>
            <p className="font-semibold text-gray-900 dark:text-white uppercase">
              {user.language_code || "en"}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-amber-100 dark:border-gray-700">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Status</p>
            <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              {user.is_premium ? (
                <><span>Premium</span><span className="text-sm">⭐</span></>
              ) : "Standard"}
            </p>
          </div>
        </div>

        {/* Close Button at Bottom */}
        <Button 
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-12 rounded-xl text-lg shadow-lg shadow-amber-600/20"
          onClick={handleClose}
        >
          Close
        </Button>

      </div>
    </div>
  );
}