// Everything she does is stored on the phone, in IndexedDB.
import Dexie, { type EntityTable } from "dexie";
import type { Note, Outcome } from "../checker/check";
import type { CardKind } from "../domain/cards";
import type { Grade, SrsState } from "../srs/scheduler";

export interface BatchRecord {
  batchId: string;
  seenAt?: Date;
  passedAt?: Date;
}

export interface CardRecord {
  id: string; // "v-a1-0001:production", "g-a1-0001:e3"
  itemId: string;
  unitId: string;
  kind: CardKind;
  createdAt: Date;
  srs: SrsState;
  due: Date; // copy of srs.due, indexed for the review queue
}

export interface ReviewRecord {
  id?: number;
  cardId: string;
  at: Date;
  source: "quiz" | "review";
  answer: string;
  outcome: Outcome;
  notes: Note[];
  overridden: boolean;
  grade: Grade;
}

export interface FlagRecord {
  id?: number;
  itemId: string;
  note: string;
  contentVersion: number;
  at: Date;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class KuckuckDB extends Dexie {
  batches!: EntityTable<BatchRecord, "batchId">;
  cards!: EntityTable<CardRecord, "id">;
  reviews!: EntityTable<ReviewRecord, "id">;
  flags!: EntityTable<FlagRecord, "id">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor(name = "kuckuck") {
    super(name);
    this.version(1).stores({
      batches: "batchId",
      cards: "id, itemId, unitId, due",
      reviews: "++id, cardId, at",
      flags: "++id, itemId, at",
      settings: "key",
    });
  }
}

export const db = new KuckuckDB();

// Ask the browser not to evict our data under storage pressure.
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}
