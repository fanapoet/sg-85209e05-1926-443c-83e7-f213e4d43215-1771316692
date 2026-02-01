import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Script from "next/script";
import { useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { GameStateProvider } from "@/contexts/GameStateContext";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // 1. Signal ready state
      tg.ready();
      
      // 2. Expand to full height
      tg.expand();
      
      // 3. Sync theme immediately
      const telegramTheme = tg.colorScheme || "dark";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(telegramTheme);
      
      console.log("🎨 Telegram theme detected:", telegramTheme);
      console.log("📱 WebApp expanded to full height");
      
      // 4. Listen for theme changes
      tg.onEvent("themeChanged", () => {
        const newTheme = tg.colorScheme || "dark";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(newTheme);
        console.log("🎨 Theme changed to:", newTheme);
      });
      
      // 5. Handle back button (hide by default at root level)
      tg.BackButton.hide();
      
      // Handle viewport changes (keep stable on keyboard open/close)
      const handleViewportChanged = () => {
        if (tg.isExpanded) {
          console.log("📱 Viewport changed, maintaining expansion");
        }
      };
      
      tg.onEvent("viewportChanged", handleViewportChanged);
      
      // Cleanup
      return () => {
        tg.offEvent("viewportChanged", handleViewportChanged);
      };
    }
  }, []);

  return (
    <ThemeProvider>
      <Script 
        src="https://telegram.org/js/telegram-web-app.js" 
        strategy="beforeInteractive" 
      />
      <GameStateProvider>
        <Component {...pageProps} />
      </GameStateProvider>
    </ThemeProvider>
  );
}