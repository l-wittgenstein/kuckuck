import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { CheckResult } from "../checker/check";
import { findBatch } from "../content";
import { cardsFor } from "../domain/cards";
import type { FirstAttempt } from "../domain/quiz";
import { Rating, State } from "../srs/scheduler";
import { KuckuckDB } from "./db";
import { completeQuiz } from "./lessons";
import { loadDueCards, overrideReview, recordReview, resurrectCard } from "./reviews";

const batch = findBatch("a1-u01-b01")!;
const cards = batch.items.flatMap(cardsFor);
const t0 = new Date("2026-11-01T10:00:00Z");
const right: CheckResult = { outcome: "correct", notes: [], expected: "x" };
const wrong: CheckResult = { outcome: "wrong", notes: [], expected: "x" };

let n = 0;
async function studied() {
  const db = new KuckuckDB(`reviews-${n++}`);
  const attempts: Record<string, FirstAttempt> = {};
  for (const c of cards) attempts[c.id] = { answer: "x", result: right, overridden: false };
  await completeQuiz(batch.id, batch.unit.id, cards, attempts, t0, db);
  return db;
}

describe("reviews", () => {
  it("nothing is due right after the quiz, everything a day later", async () => {
    const db = await studied();
    expect(await loadDueCards(t0, db)).toHaveLength(0);
    const later = new Date(t0.getTime() + 3 * 86_400_000);
    expect(await loadDueCards(later, db)).toHaveLength(cards.length);
  });

  it("a right answer pushes the card later, a wrong one brings it back soon", async () => {
    const db = await studied();
    const at = new Date(t0.getTime() + 3 * 86_400_000);
    await recordReview(cards[0].id, "x", right, at, db);
    await recordReview(cards[1].id, "x", wrong, at, db);
    const good = (await db.cards.get(cards[0].id))!;
    const bad = (await db.cards.get(cards[1].id))!;
    expect(good.due.getTime()).toBeGreaterThan(bad.due.getTime());
    const logs = await db.reviews.where("cardId").equals(cards[1].id).toArray();
    expect(logs.at(-1)?.grade).toBe(Rating.Again);
  });

  it("override rewrites the rating to Good from the state before", async () => {
    const db = await studied();
    const at = new Date(t0.getTime() + 3 * 86_400_000);
    const twin = await studied();
    await recordReview(cards[0].id, "x", right, at, twin);
    const expected = (await twin.cards.get(cards[0].id))!;

    const outcome = await recordReview(cards[0].id, "x", wrong, at, db);
    const wrongState = (await db.cards.get(cards[0].id))!;
    await overrideReview(cards[0].id, outcome, true, db);
    const card = (await db.cards.get(cards[0].id))!;
    expect(card.due).toEqual(expected.due);
    expect(card.srs.lapses).toBe(0);
    const log = await db.reviews.get(outcome.reviewId);
    expect(log?.grade).toBe(Rating.Good);
    expect(log?.overridden).toBe(true);

    // Annulla: back to exactly what the checker decided.
    await overrideReview(cards[0].id, outcome, false, db);
    expect((await db.cards.get(cards[0].id))!.due).toEqual(wrongState.due);
    const undone = await db.reviews.get(outcome.reviewId);
    expect(undone?.grade).toBe(Rating.Again);
    expect(undone?.overridden).toBe(false);
  });

  it("reports the item's stage before and after", async () => {
    const db = await studied();
    const at = new Date(t0.getTime() + 3 * 86_400_000);
    const outcome = await recordReview(cards[0].id, "x", right, at, db);
    expect(outcome.stageBefore).toBe("uovo");
    expect(["uovo", "pulcino"]).toContain(outcome.stageAfter);
  });

  it("retired cards leave the queue and can come back", async () => {
    const db = await studied();
    const card = (await db.cards.get(cards[0].id))!;
    await db.cards.update(card.id, {
      srs: { ...card.srs, state: State.Review, stability: 300 },
    });
    const far = new Date(t0.getTime() + 400 * 86_400_000);
    await recordReview(card.id, "x", right, far, db);
    expect((await db.cards.get(card.id))?.retired).toBe(true);
    const muchLater = new Date(far.getTime() + 5000 * 86_400_000);
    expect((await loadDueCards(muchLater, db)).map((c) => c.id)).not.toContain(card.id);

    await resurrectCard(card.id, muchLater, db);
    expect((await loadDueCards(muchLater, db)).map((c) => c.id)).toContain(card.id);
  });
});
