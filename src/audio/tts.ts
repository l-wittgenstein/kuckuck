// German audio through the browser's speech synthesis. Everything that
// plays audio goes through speak(), so a different source (for example
// pre-recorded files) can replace this later without touching the UI.
import { useEffect, useState } from "react";
import { pickGermanVoice } from "./voices";

const synth: SpeechSynthesis | undefined =
  typeof window !== "undefined" ? window.speechSynthesis : undefined;

export const NORMAL_RATE = 0.9;
export const SLOW_RATE = 0.6;

function germanVoice(): SpeechSynthesisVoice | undefined {
  return synth ? pickGermanVoice(synth.getVoices()) : undefined;
}

let last: { text: string; at: number; slow: boolean } | undefined;

// Plays German text. The same text again within a few seconds plays
// slowly, then at normal speed again, and so on.
export function speak(text: string, options: { repeatSlower?: boolean } = {}) {
  if (!synth) return;
  const now = Date.now();
  const again = options.repeatSlower !== false && last?.text === text && now - last.at < 8000;
  const slow = again ? !last!.slow : false;
  last = { text, at: now, slow };

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  const voice = germanVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = slow ? SLOW_RATE : NORMAL_RATE;
  synth.speak(utterance);
}

export function stopSpeaking() {
  synth?.cancel();
}

export type VoiceStatus =
  | { kind: "unsupported" }
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "ready"; name: string };

// Voices load asynchronously on Android, so listen for changes.
export function useVoiceStatus(): VoiceStatus {
  const read = (): VoiceStatus => {
    if (!synth) return { kind: "unsupported" };
    const voices = synth.getVoices();
    if (voices.length === 0) return { kind: "loading" };
    const v = pickGermanVoice(voices);
    return v ? { kind: "ready", name: v.name } : { kind: "missing" };
  };
  const [status, setStatus] = useState(read);
  useEffect(() => {
    if (!synth) return;
    const update = () => setStatus(read());
    synth.addEventListener("voiceschanged", update);
    // Some browsers never fire the event when no voices exist at all.
    const timer = setTimeout(() => {
      setStatus((s) => (s.kind === "loading" ? { kind: "missing" } : s));
    }, 3000);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      clearTimeout(timer);
    };
  }, []);
  return status;
}
