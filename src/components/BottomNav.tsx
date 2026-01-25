import { Zap, TrendingUp, Hammer, ArrowLeftRight, Award, Gift, CheckSquare } from "lucide-react";

type TabKey = "tap" | "boost" | "build" | "convert" | "xp" | "rewards" | "tasks";

interface BottomNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const tabs = [
  { key: "tap" as const, label: "Tap", icon: Zap },
  { key: "boost" as const, label: "Boost", icon: TrendingUp },
  { key: "build" as const, label: "Build", icon: Hammer },
  { key: "convert" as const, label: "Convert", icon: ArrowLeftRight },
  { key: "xp" as const, label: "XP & Tiers", icon: Award },
  { key: "rewards" as const, label: "Rewards", icon: Gift },
  { key: "tasks" as const, label: "Tasks", icon: CheckSquare },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] font-medium leading-tight text-center">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}