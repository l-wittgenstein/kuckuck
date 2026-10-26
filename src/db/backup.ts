// A full copy of her progress as one JSON file, and the way back.
// Restoring replaces everything on the phone with the file's contents.
import { z } from "zod";
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

// What each row must look like before it may replace her progress: a
// hand-edited or damaged file is refused rather than leaving the app
// unable to start.
// The page's CSP forbids eval, so don't let zod probe for it.
z.config({ jitless: true });

const date = z.date().refine((d) => !Number.isNaN(d.getTime()));
const outcome = z.enum(["correct", "almost", "wrong"]);
const note = z.enum(["typo", "capitalization", "umlaut", "accent", "missing-article", "wrong-article", "case"]);

const rows = {
  batches: z.object({ batchId: z.string(), seenAt: date.optional(), passedAt: date.optional() }),
  cards: z.object({
    id: z.string(),
    itemId: z.string(),
    unitId: z.string(),
    kind: z.enum(["recognition", "production", "cloze"]),
    createdAt: date,
    // Owned by ts-fsrs: check what the scheduler needs, keep the rest.
    srs: z.looseObject({
      due: date,
      stability: z.number(),
      difficulty: z.number(),
      elapsed_days: z.number(),
      scheduled_days: z.number(),
      learning_steps: z.number(),
      reps: z.number(),
      lapses: z.number(),
      state: z.number().int().min(0).max(3),
      last_review: date.optional(),
    }),
    due: date,
    retired: z.boolean().optional(),
  }),
  reviews: z.object({
    id: z.number().int().optional(),
    cardId: z.string(),
    at: date,
    source: z.enum(["quiz", "review"]),
    answer: z.string(),
    outcome,
    notes: z.array(note),
    overridden: z.boolean(),
    grade: z.number().int().min(1).max(4),
  }),
  flags: z.object({
    id: z.number().int().optional(),
    itemId: z.string(),
    note: z.string(),
    contentVersion: z.number(),
    at: date,
  }),
  settings: z.union([
    z.object({ key: z.literal("autoplay"), value: z.boolean() }),
    z.object({ key: z.literal("lastBackupAt"), value: date }),
  ]),
} satisfies Record<TableName, z.ZodType>;

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
  if (!date.safeParse(b.exportedAt).success) throw new BackupError("not-backup");
  const tables = {} as Record<TableName, unknown[]>;
  for (const t of TABLES) {
    const parsed = z.array(rows[t]).safeParse(b.tables[t]);
    if (!parsed.success) throw new BackupError("damaged");
    tables[t] = parsed.data;
  }
  return { format: FORMAT, version: b.version, exportedAt: b.exportedAt as Date, tables };
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
