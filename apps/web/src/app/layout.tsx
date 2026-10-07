import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { MemiAssistant } from "@/components/memi/memi-assistant";
import { FilmGrain } from "@/components/effects/film-grain";
import { BootSplash } from "@/components/effects/boot-splash";
import { AmbientSound } from "@/components/effects/ambient-sound";
import { ParallaxBg } from "@/components/effects/parallax-bg";
import { ScrollProgress } from "@/components/effects/scroll-progress";
import { SmoothScroll } from "@/components/effects/smooth-scroll";
import { CustomCursor } from "@/components/effects/custom-cursor";
import { HudFrame } from "@/components/effects/hud-frame";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const hud = JetBrains_Mono({ variable: "--font-hud", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Mem — Control Room",
  description: "The community-management Discord bot. Every feature free, forever.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${hud.variable}`}>
        {/* ambient background */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="parallax-a absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-violet-600/20 blur-[150px]" />
          <div className="parallax-b absolute -bottom-56 -right-40 h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[160px]" />
          <div className="stars parallax-a absolute inset-0" />
          <div className="stars-b parallax-b absolute inset-0" />
          <div className="absolute inset-x-0 top-0 h-[70vh] bg-grid" />
        </div>
        <div className="relative z-10">{children}</div>
        <MemiAssistant />
        <CustomCursor />
        <FilmGrain />
        <BootSplash />
        <AmbientSound />
        <ParallaxBg />
        <ScrollProgress />
        <SmoothScroll />
        <HudFrame />
      </body>
    </html>
  );
}
