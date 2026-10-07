"use client";

import { authClient } from "@/lib/auth-client";

/** Discord OAuth login button (client component). */
export function SignInButton({ compact = false }: { compact?: boolean }) {
  const signIn = () =>
    void authClient.signIn.social({ provider: "discord", callbackURL: "/dashboard" });

  if (compact) {
    return (
      <button
        onClick={signIn}
        className="rounded-full border border-[#5865F2]/60 px-3 py-1 text-xs text-[#a5b0ff] hover:border-[#5865F2] hover:text-white transition"
      >
        Sign in
      </button>
    );
  }

  return (
    <button
      onClick={signIn}
      className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] transition"
    >
      Sign in with Discord
    </button>
  );
}
