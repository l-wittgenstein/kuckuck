// The post-lesson quiz. Every card is asked once; a wrong answer goes
// back to the end of the queue until she gets it right. Only the first
// attempt counts towards scheduling.
import type { CheckResult } from "../checker/check";
import type { CardRef } from "./cards";

export interface FirstAttempt {
  answer: string;
  result: CheckResult;
  overridden: boolean;
}

export interface QuizState {
  queue: CardRef[];
  firstAttempts: Record<string, FirstAttempt>;
  // Set between answering and pressing "Avanti".
  feedback?: { answer: string; result: CheckResult; overridden: boolean; isFirst: boolean };
  total: number;
}

export type QuizAction =
  | { type: "answer"; answer: string; result: CheckResult }
  | { type: "override" }
  | { type: "undoOverride" }
  | { type: "continue" };

export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ordered: ask the cards as given (the extra-practice drill builds its own order).
export function startQuiz(cards: CardRef[], random: () => number = Math.random, ordered = false): QuizState {
  const queue = ordered ? [...cards] : shuffled(cards, random);
  return { queue, firstAttempts: {}, total: cards.length };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  const current = state.queue[0];
  if (!current) return state;

  switch (action.type) {
    case "answer": {
      if (state.feedback) return state;
      const isFirst = !(current.id in state.firstAttempts);
      const firstAttempts = !isFirst
        ? state.firstAttempts
        : {
            ...state.firstAttempts,
            [current.id]: { answer: action.answer, result: action.result, overridden: false },
          };
      return {
        ...state,
        firstAttempts,
        feedback: { answer: action.answer, result: action.result, overridden: false, isFirst },
      };
    }
    case "override": {
      if (!state.feedback || state.feedback.result.outcome !== "wrong") return state;
      // Overriding a retry clears the retry only; the first attempt keeps
      // its result.
      const firstAttempts = state.feedback.isFirst
        ? {
            ...state.firstAttempts,
            [current.id]: { ...state.firstAttempts[current.id], overridden: true },
          }
        : state.firstAttempts;
      return { ...state, firstAttempts, feedback: { ...state.feedback, overridden: true } };
    }
    case "undoOverride": {
      if (!state.feedback?.overridden) return state;
      const firstAttempts = state.feedback.isFirst
        ? {
            ...state.firstAttempts,
            [current.id]: { ...state.firstAttempts[current.id], overridden: false },
          }
        : state.firstAttempts;
      return { ...state, firstAttempts, feedback: { ...state.feedback, overridden: false } };
    }
    case "continue": {
      if (!state.feedback) return state;
      const failed = state.feedback.result.outcome === "wrong" && !state.feedback.overridden;
      const rest = state.queue.slice(1);
      return {
        ...state,
        queue: failed ? [...rest, current] : rest,
        feedback: undefined,
      };
    }
  }
}

export function isFinished(state: QuizState): boolean {
  return state.queue.length === 0;
}

// Cards she has got right at least once, for the progress bar.
export function cardsCleared(state: QuizState): number {
  return state.total - state.queue.length;
}
