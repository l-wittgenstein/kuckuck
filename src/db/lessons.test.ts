import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { CheckResult } from "../checker/check";
import { findBatch } from "../content";
import { cardsFor } from "../domain/cards";
import type { FirstAttempt } from "../domain/quiz";
import { Rating } from "../srs/scheduler";
import { KuckuckDB } from "./db";
import { completeQuiz, markBatchSeen } from "./lessons";

const batch = findBatch("a1-u01-b01")!;
const cards = batch.items.flatMap(cardsFor);
const now = new Date("2026-11-01T10:00:00Z");

function attempts(result: (i: number) => CheckResult, overridden = false) {
  const out: Record<string, FirstAttempt> = {};
  cards.forEach((c, i) => (out[c.id] = { answer: "x", result: result(i), overridden }));
  return out;
}

let n = 0;
const freshDb = () => new KuckuckDB(`test-${n++}`);

describe("completeQuiz", () => {
  it("creates scheduled cards, review logs and marks the batch passed", async () => {
    const db = freshDb();
    await markBatchSeen(batch.id, now, db);
    const results = attempts((i) =>
      i === 0
        ? { outcome: "wrong", notes: [], expected: "x" }
        : i === 1
          ? { outcome: "almost", notes: ["typo"], expected: "x" }
          : { outcome: "correct", notes: [], expected: "x" },
    );
    await completeQuiz(batch.id, batch.unit.id, cards, results, now, db);

    const stored = await db.cards.toArray();
    expect(stored).toHaveLength(cards.length);
    for (const card of stored) {
      expect(card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(card.unitId).toBe("a1-u01");
    }
    const reviews = await db.reviews.orderBy("id").toArray();
    expect(reviews.map((r) => r.grade).slice(0, 3)).toEqual([Rating.Again, Rating.Hard, Rating.Good]);

    // A missed card comes back sooner than one answered right.
    const missed = stored.find((c) => c.id === cards[0].id)!;
    const known = stored.find((c) => c.id === cards[2].id)!;
    expect(missed.due.getTime()).toBeLessThan(known.due.getTime());

    const record = await db.batches.get(batch.id);
    expect(record?.seenAt).toEqual(now);
    expect(record?.passedAt).toEqual(now);
  });

  it("is idempotent", async () => {
    const db = freshDb();
    const results = attempts(() => ({ outcome: "correct", notes: [], expected: "x" }));
    await completeQuiz(batch.id, batch.unit.id, cards, results, now, db);
    await completeQuiz(batch.id, batch.unit.id, cards, results, new Date(now.getTime() + 1000), db);
    expect(await db.reviews.count()).toBe(cards.length);
  });

  it("treats an overridden answer as right", async () => {
    const db = freshDb();
    const results = attempts(() => ({ outcome: "wrong", notes: [], expected: "x" }), true);
    await completeQuiz(batch.id, batch.unit.id, cards, results, now, db);
    const reviews = await db.reviews.toArray();
    expect(reviews.every((r) => r.grade === Rating.Good && r.overridden)).toBe(true);
  });
});
