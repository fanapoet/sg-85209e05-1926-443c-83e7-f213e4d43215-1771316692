import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Script from "next/script";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { GameStateProvider } from "@/contexts/GameStateContext";

export default function App({ Component, pageProps }: AppProps) {
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