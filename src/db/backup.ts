// A full copy of her progress as one JSON file, and the way back.
// Restoring replaces everything on the phone with the file's contents.
import { db, type KuckuckDB } from "./db";

const FORMAT = "kuckuck-backup";
const VERSION = 1;
const TABLES = ["batches", "cards", "reviews", "flags", "settings"] as const;
type TableName = (typeof TABLES)[number];

export interface Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: Date;
  tables: Record<TableName, unknown[]>;
}

export interface BackupSummary {
  exportedAt: Date;
  lessons: number;
  cards: number;
  reviews: number;
}

// JSON has no dates: mark them so restore gives the scheduler real Dates.
function encode(this: Record<string, unknown>, key: string, value: unknown) {
  const raw = this[key];
  return raw instanceof Date ? { $date: raw.toISOString() } : value;
}

function decode(_key: string, value: unknown) {
  if (value && typeof value === "object" && "$date" in value && Object.keys(value).length === 1) {
    return new Date((value as { $date: string }).$date);
  }
  return value;
}

export async function exportBackup(database: KuckuckDB = db, now = new Date()): Promise<string> {
  const tables = {} as Record<TableName, unknown[]>;
  await database.transaction("r", TABLES.map((t) => database.table(t)), async () => {
    for (const t of TABLES) tables[t] = await database.table(t).toArray();
  });
  const backup: Backup = { format: FORMAT, version: VERSION, exportedAt: now, tables };
  return JSON.stringify(backup, encode);
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text, decode);
  } catch {
    throw new BackupError("not-json");
  }
  const b = data as Partial<Backup>;
  if (b?.format !== FORMAT || typeof b.version !== "number" || !b.tables) throw new BackupError("not-backup");
  if (b.version > VERSION) throw new BackupError("too-new");
  for (const t of TABLES) {
    if (!Array.isArray(b.tables[t])) throw new BackupError("not-backup");
  }
  return b as Backup;
}

export function summarize(backup: Backup): BackupSummary {
  const batches = backup.tables.batches as { passedAt?: Date }[];
  return {
    exportedAt: backup.exportedAt,
    lessons: batches.filter((b) => b.passedAt).length,
    cards: backup.tables.cards.length,
    reviews: backup.tables.reviews.length,
  };
}

export async function restoreBackup(backup: Backup, database: KuckuckDB = db) {
  await database.transaction("rw", TABLES.map((t) => database.table(t)), async () => {
    for (const t of TABLES) {
      await database.table(t).clear();
      await database.table(t).bulkAdd(backup.tables[t]);
    }
  });
}
