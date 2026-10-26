import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import type { CheckResult } from "../checker/check";
import { itemStage, shouldRetire, type Stage } from "../domain/stages";
import { gradeFor, rate, Rating, type SrsState } from "../srs/scheduler";
import { db, type CardRecord, type KuckuckDB } from "./db";

export async function loadDueCards(now = new Date(), database: KuckuckDB = db): Promise<CardRecord[]> {
  const due = await database.cards.where("due").belowOrEqual(now).sortBy("due");
  return due.filter((c) => !c.retired);
}

export interface ReviewOutcome {
  reviewId: number;
  at: Date;
  before: SrsState;
  stageBefore: Stage;
  stageAfter: Stage;
}

async function stageOfItem(database: KuckuckDB, itemId: string): Promise<Stage> {
  return itemStage(await database.cards.where("itemId").equals(itemId).toArray())!;
}

// Rates one review answer straight away, so leaving a session halfway
// keeps everything answered so far.
export async function recordReview(
  cardId: string,
  answer: string,
  result: CheckResult,
  now = new Date(),
  database: KuckuckDB = db,
): Promise<ReviewOutcome> {
  return database.transaction("rw", database.cards, database.reviews, async () => {
    const card = await database.cards.get(cardId);
    if (!card) throw new Error(`Unknown card ${cardId}`);
    const stageBefore = await stageOfItem(database, card.itemId);
    const grade = gradeFor(result.outcome, result.notes, false);
    const { state } = rate(card.srs, grade, now);
    await database.cards.update(cardId, {
      srs: state,
      due: state.due,
      retired: shouldRetire(state, grade),
    });
    const reviewId = await database.reviews.add({
      cardId,
      at: now,
      source: "review",
      answer,
      outcome: result.outcome,
      notes: result.notes,
      overridden: false,
      grade,
    });
    const stageAfter = await stageOfItem(database, card.itemId);
    return { reviewId: reviewId as number, at: now, before: card.srs, stageBefore, stageAfter };
  });
}

// "Invece è corretto": redo the rating as Good from the state before it.
export async function overrideReview(
  cardId: string,
  outcome: ReviewOutcome,
  database: KuckuckDB = db,
): Promise<ReviewOutcome> {
  return database.transaction("rw", database.cards, database.reviews, async () => {
    const card = await database.cards.get(cardId);
    if (!card) throw new Error(`Unknown card ${cardId}`);
    const { state } = rate(outcome.before, Rating.Good, outcome.at);
    await database.cards.update(cardId, {
      srs: state,
      due: state.due,
      retired: shouldRetire(state, Rating.Good),
    });
    await database.reviews.update(outcome.reviewId, { grade: Rating.Good, overridden: true });
    return { ...outcome, stageAfter: await stageOfItem(database, card.itemId) };
  });
}

// Brings a retired card back into the queue.
export async function resurrectCard(cardId: string, now = new Date(), database: KuckuckDB = db) {
  const card = await database.cards.get(cardId);
  if (!card) return;
  await database.cards.update(cardId, { retired: false, due: now, srs: { ...card.srs, due: now } });
}

// Re-renders every interval so "due now" stays true as time passes.
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useDueCount(now: Date): number | undefined {
  return useLiveQuery(async () => (await loadDueCards(now)).length, [now.getTime()]);
}
