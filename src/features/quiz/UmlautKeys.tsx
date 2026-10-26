import type { RefObject } from "react";

const KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

// Inserts special letters at the cursor without closing the keyboard.
export function UmlautKeys({
  inputRef,
  onInsert,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onInsert: (value: string) => void;
}) {
  function insert(ch: string) {
    const input = inputRef.current;
    if (!input || input.readOnly) return;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const value = input.value.slice(0, start) + ch + input.value.slice(end);
    onInsert(value);
    requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
  }

  return (
    <div className="umlaut-keys">
      {KEYS.map((ch) => (
        <button
          key={ch}
          type="button"
          lang="de"
          // Keep focus in the input so the phone keyboard stays open.
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => insert(ch)}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
