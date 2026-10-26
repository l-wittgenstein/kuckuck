import { speak } from "../audio/tts";
import { it } from "../i18n/it";

// Plays German text; tapping again right away repeats it slowly.
export function PlayButton({ text, size = "normal" }: { text: string; size?: "normal" | "large" }) {
  return (
    <button
      type="button"
      className={`play-button play-${size}`}
      aria-label={it.audio.play(text)}
      // Keep focus (and the phone keyboard) where it is during a quiz.
      onPointerDown={(e) => e.preventDefault()}
      onClick={() => speak(text)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
