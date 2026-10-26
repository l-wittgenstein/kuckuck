import { useRef, useState } from "react";
import { addFlag } from "../db/flags";
import { it } from "../i18n/it";

// Lets her report content that looks wrong. Flags stay on the phone
// until exported from Impostazioni.
export function FlagButton({ itemId }: { itemId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await addFlag(itemId, note);
    setNote("");
    setSaved(true);
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" className="flag-button" onClick={() => dialog.current?.showModal()}>
        ⚑ {saved ? it.flag.saved : it.flag.button}
      </button>
      <dialog ref={dialog} className="sheet">
        <form onSubmit={save}>
          <h2>{it.flag.title}</h2>
          <p className="muted">{it.flag.text}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={it.flag.placeholder}
            rows={3}
          />
          <div className="lesson-nav">
            <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>
              {it.flag.cancel}
            </button>
            <button type="submit" className="button" disabled={!note.trim()}>
              {it.flag.save}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
