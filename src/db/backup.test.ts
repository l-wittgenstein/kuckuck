import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { CheckResult } from "../checker/check";
import { findBatch } from "../content";
import { cardsFor } from "../domain/cards";
import type { FirstAttempt } from "../domain/quiz";
import { BackupError, exportBackup, parseBackup, restoreBackup, summarize } from "./backup";
import { KuckuckDB } from "./db";
import { completeQuiz } from "./lessons";
import { loadDueCards, recordReview } from "./reviews";

const batch = findBatch("a1-u01-b01")!;
const cards = batch.items.flatMap(cardsFor);
const t0 = new Date("2026-11-01T10:00:00Z");
const right: CheckResult = { outcome: "correct", notes: [], expected: "x" };
let n = 0;

async function withProgress() {
  const db = new KuckuckDB(`backup-${n++}`);
  const attempts: Record<string, FirstAttempt> = {};
  for (const c of cards) attempts[c.id] = { answer: "x", result: right, overridden: false };
  await completeQuiz(batch.id, batch.unit.id, cards, attempts, t0, db);
  await recordReview(cards[0].id, "x", right, new Date(t0.getTime() + 86_400_000), db);
  await db.flags.add({ itemId: "v-a1-0001", note: "prova", contentVersion: 1, at: t0 });
  await db.settings.put({ key: "autoplay", value: false });
  return db;
}

describe("backup", () => {
  it("restores everything exactly, with real dates", async () => {
    const source = await withProgress();
    const text = await exportBackup(source, t0);
    const target = new KuckuckDB(`backup-${n++}`);
    await target.cards.add({ ...(await source.cards.toArray())[0], id: "stale:card" });

    await restoreBackup(parseBackup(text), target);

    for (const t of ["batches", "cards", "reviews", "flags", "settings"] as const) {
      expect(await target.table(t).toArray()).toEqual(await source.table(t).toArray());
    }
    const card = (await target.cards.toArray())[0];
    expect(card.due).toBeInstanceOf(Date);
    expect(card.srs.due).toBeInstanceOf(Date);
    // The restored queue works: the same cards are due later on.
    const later = new Date(t0.getTime() + 30 * 86_400_000);
    expect((await loadDueCards(later, target)).length).toBe((await loadDueCards(later, source)).length);
  });

  it("summarizes a backup before restoring", async () => {
    const backup = parseBackup(await exportBackup(await withProgress(), t0));
    expect(summarize(backup)).toEqual({ exportedAt: t0, lessons: 1, cards: 10, reviews: 11 });
  });

  it("rejects files that are not Kuckuck backups", () => {
    expect(() => parseBackup("not json")).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ format: "kuckuck-backup", version: 99, tables: {} }))).toThrow(
      /too-new/,
    );
  });

  it("rejects damaged rows and leaves the phone untouched", async () => {
    const text = await exportBackup(await withProgress(), t0);
    const damage = (edit: (b: any) => void) => {
      const b = JSON.parse(text);
      edit(b);
      return () => parseBackup(JSON.stringify(b));
    };
    expect(damage((b) => (b.tables.cards[0].due = "domani"))).toThrow(/damaged/);
    expect(damage((b) => delete b.tables.cards[0].srs)).toThrow(/damaged/);
    expect(damage((b) => (b.tables.cards[0].srs.due = { $date: "not a date" }))).toThrow(/damaged/);
    expect(damage((b) => (b.tables.reviews[0].outcome = "maybe"))).toThrow(/damaged/);
    expect(damage((b) => b.tables.settings.push({ key: "lastBackupAt", value: "ieri" }))).toThrow(/damaged/);
    expect(damage((b) => (b.exportedAt = "ieri"))).toThrow(/not-backup/);
  });
});
