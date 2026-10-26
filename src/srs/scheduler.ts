// The only module that knows ts-fsrs. Everything else deals in
// outcomes and our own records.
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import type { Note, Outcome } from "../checker/check";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type SrsState = Card;
export type { Grade };
export { Rating, State };

export function newSrsState(now: Date): SrsState {
  return createEmptyCard(now);
}

export function rate(
  state: SrsState,
  grade: Grade,
  now: Date,
): { state: SrsState; log: ReviewLog } {
  const { card, log } = scheduler.next(state, now, grade);
  return { state: card, log };
}

// Typed answers map onto three grades; Easy is never used.
export function gradeFor(outcome: Outcome, notes: Note[], overridden: boolean): Grade {
  if (overridden) return Rating.Good;
  if (outcome === "wrong") return Rating.Again;
  if (outcome === "almost" || notes.length > 0) return Rating.Hard;
  return Rating.Good;
}
