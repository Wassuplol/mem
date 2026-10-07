"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Ambient soundscape: a soft synthesized pad (WebAudio, no assets) with a
 * floating toggle. Muted by default; the choice is remembered.
 */
export function AmbientSound() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  useEffect(() => {
    setOn(window.localStorage.getItem("mem-sound") === "1");
  }, []);

  const stop = () => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.7);
      window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
        ctxRef.current = null;
        masterRef.current = null;
      }, 900);
    }
  };

  const start = () => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 950;
    filter.Q.value = 0.4;
    filter.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(filter);
    masterRef.current = master;

    // A minor-ish pad: A2 / E3 / A3 / C4 / E4, gently breathing.
    const freqs = [110, 164.81, 220, 261.63, 329.63];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 8;
      const gain = ctx.createGain();
      gain.gain.value = 0.016;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.04 + Math.random() * 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      lfo.start();
    });

    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.4);
  };

  const toggle = () => {
    const next = !on;
    setOn(next);
    window.localStorage.setItem("mem-sound", next ? "1" : "0");
    if (next) start();
    else stop();
  };

  return (
    <button
      onClick={toggle}
      className={`glass fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full transition ${
        on ? "text-violet-300 shadow-lg shadow-violet-600/30" : "text-zinc-500 hover:text-zinc-200"
      }`}
      aria-label={on ? "Turn ambient sound off" : "Turn ambient sound on"}
      title={on ? "Sound on" : "Sound off"}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
