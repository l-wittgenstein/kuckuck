import { useLiveQuery } from "dexie-react-hooks";
import type { CardRef } from "../domain/cards";
import type { FirstAttempt } from "../domain/quiz";
import { gradeFor, newSrsState, rate } from "../srs/scheduler";
import { db, type CardRecord, type KuckuckDB, type ReviewRecord } from "./db";

export async function markBatchSeen(batchId: string, now = new Date(), database: KuckuckDB = db) {
  await database.transaction("rw", database.batches, async () => {
    const existing = await database.batches.get(batchId);
    if (!existing?.seenAt) await database.batches.put({ ...existing, batchId, seenAt: now });
  });
}

// A passed quiz is the first review of each card: the cards enter the
// review queue scheduled from how she did on her first attempt.
export async function completeQuiz(
  batchId: string,
  unitId: string,
  cards: CardRef[],
  firstAttempts: Record<string, FirstAttempt>,
  now = new Date(),
  database: KuckuckDB = db,
) {
  await database.transaction("rw", database.batches, database.cards, database.reviews, async () => {
    const existing = await database.batches.get(batchId);
    if (existing?.passedAt) return; // already done, e.g. a double tap

    const cardRecords: CardRecord[] = [];
    const reviews: ReviewRecord[] = [];
    for (const card of cards) {
      const attempt = firstAttempts[card.id];
      if (!attempt) throw new Error(`No answer recorded for ${card.id}`);
      const grade = gradeFor(attempt.result.outcome, attempt.result.notes, attempt.overridden);
      const { state } = rate(newSrsState(now), grade, now);
      cardRecords.push({
        id: card.id,
        itemId: card.itemId,
        unitId,
        kind: card.kind,
        createdAt: now,
        srs: state,
        due: state.due,
      });
      reviews.push({
        cardId: card.id,
        at: now,
        source: "quiz",
        answer: attempt.answer,
        outcome: attempt.result.outcome,
        notes: attempt.result.notes,
        overridden: attempt.overridden,
        grade,
      });
    }
    await database.cards.bulkPut(cardRecords);
    await database.reviews.bulkAdd(reviews);
    await database.batches.put({ ...existing, batchId, passedAt: now });
  });
}

export function usePassedBatches(): ReadonlySet<string> | undefined {
  return useLiveQuery(async () => {
    const all = await db.batches.toArray();
    return new Set(all.filter((b) => b.passedAt).map((b) => b.batchId));
  });
}
