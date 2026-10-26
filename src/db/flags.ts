import { useLiveQuery } from "dexie-react-hooks";
import { manifest } from "../content";
import { db, type FlagRecord } from "./db";

export async function addFlag(itemId: string, note: string, now = new Date()) {
  await db.flags.add({ itemId, note: note.trim(), contentVersion: manifest.version, at: now });
}

export async function deleteFlag(id: number) {
  await db.flags.delete(id);
}

export function useFlags(): FlagRecord[] | undefined {
  return useLiveQuery(() => db.flags.orderBy("at").reverse().toArray());
}

// Shares the flags as a JSON file (Android share sheet), or downloads it.
export async function exportFlags(flags: FlagRecord[]) {
  const json = JSON.stringify(
    flags.map(({ itemId, note, contentVersion, at }) => ({ itemId, note, contentVersion, at })),
    null,
    2,
  );
  const name = `kuckuck-segnalazioni-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
