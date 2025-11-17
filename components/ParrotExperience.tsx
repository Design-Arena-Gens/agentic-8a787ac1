"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ParrotScene from "@/components/ParrotScene";

const LINES: string[] = [
  "Oh, look who finally remembered their pet exists.",
  "No, no, please, take your time. I?ll just sit here. Being fabulous.",
  "Did you just call these ?bird snacks?? It?s literally cardboard.",
  "Wow. Another meeting? Must be exhausting doing absolutely nothing.",
  "I?m not dramatic. I?m cinematic. There?s a difference.",
  "You want tricks? Pay me in mangoes. Premium grade.",
  "Eye roll? That wasn?t an eye roll. That was a performance.",
  "Yes, I?m talking to the camera. Someone has to carry this household."
];

export default function ParrotExperience() {
  const [isStarted, setIsStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [beat, setBeat] = useState(0);
  const speakingRef = useRef(false);
  const lineIndexRef = useRef(0);

  const handleStart = useCallback(() => {
    setIsStarted(true);
  }, []);

  // Simple metronome to drive micro-motions
  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();
    const tick = () => {
      const t = performance.now();
      const dt = (t - t0) / 1000;
      t0 = t;
      setBeat((b) => b + dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // TTS playback loop
  useEffect(() => {
    if (!isStarted) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;

    const speakNext = () => {
      const idx = lineIndexRef.current % LINES.length;
      const text = LINES[idx];
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.05;
      utter.volume = 1;

      utter.onstart = () => {
        speakingRef.current = true;
        setIsSpeaking(true);
        setLineIndex(idx);
      };
      utter.onend = () => {
        speakingRef.current = false;
        setIsSpeaking(false);
        lineIndexRef.current = (lineIndexRef.current + 1) % LINES.length;
        setTimeout(() => {
          // Dramatic pause between lines
          if (isStarted) speakNext();
        }, 800 + Math.random() * 400);
      };

      // Try to prefer a crisp English voice if available
      const voices = synth.getVoices();
      const preferred = voices.find(v => /en-US|en-GB/i.test(v.lang) && /Female|Jenny|Libby|Emma|Google US English/i.test(v.name));
      if (preferred) utter.voice = preferred;

      // Ensure queue is clean
      synth.cancel();
      synth.speak(utter);
    };

    speakNext();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isStarted]);

  const overlay = useMemo(() => (
    <div style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      padding: "16px"
    }}>
      <div style={{ pointerEvents: "auto" }}>
        {!isStarted && (
          <button
            onClick={handleStart}
            style={{
              background: "#1fdf64",
              color: "#0b0b0b",
              border: 0,
              padding: "12px 16px",
              borderRadius: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 30px rgba(31,223,100,0.35)"
            }}
          >
            Start the roast
          </button>
        )}
      </div>
      <div style={{
        fontSize: 12,
        opacity: 0.75,
        userSelect: "none"
      }}>
        4K ? Smooth ? Cinematic
      </div>
    </div>
  ), [handleStart, isStarted]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <ParrotScene speaking={isSpeaking} beat={beat} lineIndex={lineIndex} />
      {overlay}
    </div>
  );
}
