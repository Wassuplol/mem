"use client";

import { authClient } from "@/lib/auth-client";
import { SignInButton } from "./sign-in-button";

/** Shows the current session in the dashboard header (or a Sign in button). */
export function AuthChip() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-600">
        …
      </span>
    );
  }

  if (!data) {
    return <SignInButton compact />;
  }

  return (
    <span className="flex items-center gap-2 rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-400">
      {data.user.name}
      <button
        onClick={() => void authClient.signOut()}
        className="text-zinc-500 hover:text-zinc-300 transition"
        title="Sign out"
      >
        ⏻
      </button>
    </span>
  );
}
