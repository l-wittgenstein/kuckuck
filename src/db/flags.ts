import { useLiveQuery } from "dexie-react-hooks";
import { manifest } from "../content";
import { db, type FlagRecord } from "./db";
import { shareFile, today } from "./files";

export async function addFlag(itemId: string, note: string, now = new Date()) {
  await db.flags.add({ itemId, note: note.trim(), contentVersion: manifest.version, at: now });
}

export async function deleteFlag(id: number) {
  await db.flags.delete(id);
}

export function useFlags(): FlagRecord[] | undefined {
  return useLiveQuery(() => db.flags.orderBy("at").reverse().toArray());
}

export async function exportFlags(flags: FlagRecord[]) {
  const json = JSON.stringify(
    flags.map(({ itemId, note, contentVersion, at }) => ({ itemId, note, contentVersion, at })),
    null,
    2,
  );
  await shareFile(`kuckuck-segnalazioni-${today()}.json`, json);
}
