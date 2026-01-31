import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Script from "next/script";
import { useEffect } from "react";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { GameStateProvider } from "@/contexts/GameStateContext";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Sync Telegram theme with next-themes
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      const telegramTheme = tg.colorScheme || "dark";
      
      // Set initial theme
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(telegramTheme);
      
      console.log("🎨 Telegram theme detected:", telegramTheme);
      
      // Listen for theme changes
      tg.onEvent("themeChanged", () => {
        const newTheme = tg.colorScheme || "dark";
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(newTheme);
        console.log("🎨 Theme changed to:", newTheme);
      });
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