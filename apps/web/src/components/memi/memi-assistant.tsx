"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send, X } from "lucide-react";
import { useSystem } from "@/lib/system";
import { parseActions } from "@/lib/memi-actions";

const ChibiCanvas = dynamic(() => import("./chibi").then((m) => m.ChibiCanvas), { ssr: false });

interface Action {
  href: string;
  label: string;
}

interface Msg {
  role: "user" | "memi";
  content: string;
  actions?: Action[];
}

const QUICK = ["What can Mem do?", "Help me set things up", "Where are my servers?"];

/** Memi: the floating chibi AI assistant (bottom-right, every page). */
export function MemiAssistant() {
  const modalOpen = useSystem((s) => s.modalOpen);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") ?? c.getContext("webgl"))) setWebgl(false);
    } catch {
      setWebgl(false);
    }
    if (!window.localStorage.getItem("memi-seen")) {
      const t = window.setTimeout(() => setNudge(true), 2600);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setNudge(false);
    window.localStorage.setItem("memi-seen", "1");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-8).map((m) => ({
            role: m.role === "memi" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      const raw =
        typeof data.reply === "string"
          ? data.reply
          : data.error === "not_configured"
            ? "My brain isn't plugged in yet - ask the admin to set `NVIDIA_API_KEY`! 🔌"
            : "Bzzt, my brain glitched. Try again? 🥺";
      const { clean, actions } = parseActions(raw);
      setMessages((cur) => [...cur, { role: "memi", content: clean || "…", actions }]);
    } catch {
      setMessages((cur) => [...cur, { role: "memi", content: "I couldn't reach my brain - connection ok? 🥺" }]);
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    setNudge(false);
    window.localStorage.setItem("memi-seen", "1");
    setOpen((o) => !o);
  };

  // The landing page hero features her big - no duplicate widget there.
  if (pathname === "/") return null;

  return (
    <div
      className="memi-widget pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3"
      style={{
        opacity: modalOpen ? 0 : 1,
        transform: modalOpen ? "translateY(0.75rem)" : undefined,
        pointerEvents: modalOpen ? "none" : undefined,
      }}
      aria-hidden={modalOpen || undefined}
    >
      {open && (
        <div className="glass animate-fade-up pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-[13px]">
              ✨
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b0b12] bg-emerald-400" />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold leading-tight">Memi</p>
              <p className="text-[11px] leading-tight text-zinc-500">your dashboard buddy</p>
            </div>
            <button onClick={toggle} className="text-zinc-500 transition hover:text-zinc-200" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex max-h-[46vh] min-h-[200px] flex-col gap-2.5 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <>
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  Hii! I'm <span className="text-zinc-100">Memi</span> 👋 I can show you around, explain features, or walk you to any page. Ask me anything!
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      className="rounded-full border border-violet-400/25 bg-violet-400/[0.07] px-2.5 py-1 text-[11.5px] text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-400/[0.14]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-violet-600 to-indigo-500 px-3.5 py-2 text-[13px] leading-relaxed text-white"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-2 text-[13px] leading-relaxed text-zinc-200"
                  }
                >
                  {m.content}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {m.actions.map((a) => (
                        <button
                          key={a.href}
                          onClick={() => router.push(a.href)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.08] px-2.5 py-1.5 text-left text-[12px] font-medium text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/[0.15]"
                        >
                          {a.label} <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.045] px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300 [animation-delay:240ms]" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-white/[0.07] px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Memi anything…"
              maxLength={500}
              className="min-w-0 flex-1 bg-transparent px-1 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white transition enabled:hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      <div className="pointer-events-auto relative">
        {nudge && !open && (
          <button
            onClick={toggle}
            className="glass animate-fade-up absolute right-[138px] top-4 whitespace-nowrap rounded-2xl rounded-br-sm px-3.5 py-2 text-[12.5px] text-zinc-200 shadow-xl shadow-black/40"
          >
            Hi! Need a hand? 👋
          </button>
        )}
        <button onClick={toggle} className="relative block h-[180px] w-[150px] cursor-pointer select-none" aria-label="Open Memi, the AI assistant">
          <span
            aria-hidden
            className="absolute inset-x-1 bottom-0 top-5 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(8,8,15,0.6),transparent_75%)] blur-md"
          />
          <span
            aria-hidden
            className="absolute inset-x-2 bottom-1 top-7 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.22),transparent_70%)] blur-xl"
          />
          {webgl ? (
            <ChibiCanvas mode={busy ? "thinking" : open ? "talking" : "idle"} />
          ) : (
            <span className="flex h-full w-full items-end justify-center pb-6">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/60 to-cyan-500/40 text-4xl shadow-lg shadow-violet-900/40">
                🤖
              </span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
