import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export interface Settings {
  autoplay: boolean; // speak the German after each answer
}

const defaults: Settings = { autoplay: true };

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.settings.toArray();
    return { ...defaults, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) } as Settings;
  });
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value });
}
