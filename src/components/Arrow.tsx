import type { ReactNode } from "react";

// Drawn rather than typed: phone fonts set → small and low on the line.
export function Arrow({ left = false }: { left?: boolean }) {
  return (
    <svg
      className={`arrow ${left ? "arrow-left" : ""}`}
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Text from the content files, with every → and ← drawn as an Arrow.
// The arrow stays readable for screen readers through a hidden copy.
export function withArrows(text: string): ReactNode {
  if (!/[→←]/.test(text)) return text;
  return text.split(/([→←])/).map((part, i) =>
    part === "→" || part === "←" ? (
      <span key={i}>
        <Arrow left={part === "←"} />
        <span className="sr-only">{part}</span>
      </span>
    ) : (
      part
    ),
  );
}
