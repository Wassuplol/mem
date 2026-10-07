"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SignInButton } from "./sign-in-button";

/** Shows the current session in the header (or a Sign in button). */
export function AuthChip() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-500">
        <span className="h-5 w-5 animate-pulse rounded-full bg-white/10" />
        <span className="h-2.5 w-16 animate-pulse rounded-full bg-white/10" />
      </span>
    );
  }

  if (!data) {
    return <SignInButton compact />;
  }

  const name = data.user.name ?? "friend";
  return (
    <span className="group flex items-center gap-2.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] py-1 pl-1 pr-2.5 text-xs">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[11px] font-bold text-white">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="max-w-[120px] truncate text-emerald-200">{name}</span>
      <button
        onClick={() => void authClient.signOut()}
        className="text-zinc-500 transition hover:text-rose-300"
        title="Sign out"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
