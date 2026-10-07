import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mem — Control Room",
  description: "The community-management Discord bot. Every feature free, forever.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* ambient background */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -left-48 -top-48 h-[620px] w-[620px] rounded-full bg-violet-600/20 blur-[150px]" />
          <div className="absolute -bottom-56 -right-40 h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[160px]" />
          <div className="absolute inset-x-0 top-0 h-[70vh] bg-grid" />
        </div>
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
