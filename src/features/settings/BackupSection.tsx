import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { BackupError, exportBackup, parseBackup, restoreBackup, summarize } from "../../db/backup";
import { shareFile, today } from "../../db/files";
import { setSetting, useSettings } from "../../db/settings";
import { it } from "../../i18n/it";

const date = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

export function BackupSection() {
  const settings = useSettings();
  const persisted = useLiveQuery(() => navigator.storage?.persisted?.() ?? Promise.resolve(false));
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function save() {
    await shareFile(`kuckuck-copia-${today()}.json`, await exportBackup());
    await setSetting("lastBackupAt", new Date());
  }

  async function restore(file: File) {
    setMessage("");
    try {
      const backup = parseBackup(await file.text());
      const s = summarize(backup);
      if (!window.confirm(it.backup.confirm(date(s.exportedAt), s.lessons, s.reviews))) return;
      await restoreBackup(backup);
      setMessage(it.backup.restored);
    } catch (e) {
      setMessage(e instanceof BackupError ? it.backup.errors[e.message as keyof typeof it.backup.errors] : String(e));
    }
  }

  return (
    <>
      <h2>{it.backup.title}</h2>
      <div className="card audio-card">
        <span>{it.backup.text}</span>
        <span className="muted small">
          {settings?.lastBackupAt ? it.backup.last(date(settings.lastBackupAt)) : it.backup.never}
          {persisted ? ` ${it.backup.persisted}` : ""}
        </span>
        <button type="button" className="button" onClick={save}>
          {it.backup.export}
        </button>
        <button type="button" className="button secondary" onClick={() => fileInput.current?.click()}>
          {it.backup.restore}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) restore(file);
          }}
        />
        {message && <p className="note" role="status">{message}</p>}
      </div>
    </>
  );
}
