import { describe, expect, it } from "vitest";
import type { CheckResult } from "../checker/check";
import { findBatch } from "../content";
import { cardsFor } from "./cards";
import { cardsCleared, isFinished, quizReducer, startQuiz, type QuizState } from "./quiz";

const right: CheckResult = { outcome: "correct", notes: [], expected: "x" };
const wrong: CheckResult = { outcome: "wrong", notes: [], expected: "x" };

const batch = findBatch("a1-u01-b01")!;
const cards = batch.items.flatMap(cardsFor);

function answer(state: QuizState, result: CheckResult, text = "a") {
  return quizReducer(quizReducer(state, { type: "answer", answer: text, result }), { type: "continue" });
}

describe("cards", () => {
  it("makes two cards per word and one per grammar exercise", () => {
    expect(cards).toHaveLength(10);
    const grammar = findBatch("a1-u01-b03")!.items.flatMap(cardsFor);
    expect(grammar.filter((c) => c.kind === "cloze")).toHaveLength(12);
    expect(grammar.find((c) => c.kind === "cloze")?.id).toBe("g-a1-0001:e1");
  });
});

describe("quiz", () => {
  it("asks every card once when all answers are right", () => {
    let state = startQuiz(cards);
    for (let i = 0; i < cards.length; i++) state = answer(state, right);
    expect(isFinished(state)).toBe(true);
    expect(Object.keys(state.firstAttempts)).toHaveLength(cards.length);
  });

  it("requeues a wrong answer and keeps the first attempt", () => {
    let state = startQuiz(cards.slice(0, 2), () => 0.99);
    const first = state.queue[0].id;
    state = answer(state, wrong, "sbagliato");
    expect(state.queue.map((c) => c.id)).toEqual([state.queue[0].id, first]);
    expect(cardsCleared(state)).toBe(0);
    state = answer(state, right);
    state = answer(state, right, "giusto");
    expect(isFinished(state)).toBe(true);
    expect(state.firstAttempts[first].result.outcome).toBe("wrong");
    expect(state.firstAttempts[first].answer).toBe("sbagliato");
  });

  it("overriding a first attempt counts it as right and does not requeue", () => {
    let state = startQuiz(cards.slice(0, 1));
    const id = state.queue[0].id;
    state = quizReducer(state, { type: "answer", answer: "a", result: wrong });
    state = quizReducer(state, { type: "override" });
    state = quizReducer(state, { type: "continue" });
    expect(isFinished(state)).toBe(true);
    expect(state.firstAttempts[id].overridden).toBe(true);
  });

  it("overriding a retry leaves the first attempt wrong", () => {
    let state = startQuiz(cards.slice(0, 1));
    const id = state.queue[0].id;
    state = answer(state, wrong);
    state = quizReducer(state, { type: "answer", answer: "a", result: wrong });
    state = quizReducer(state, { type: "override" });
    state = quizReducer(state, { type: "continue" });
    expect(isFinished(state)).toBe(true);
    expect(state.firstAttempts[id].overridden).toBe(false);
  });

  it("undoing an override restores the miss and requeues the card", () => {
    let state = startQuiz(cards.slice(0, 2), () => 0.99);
    const id = state.queue[0].id;
    state = quizReducer(state, { type: "answer", answer: "a", result: wrong });
    state = quizReducer(state, { type: "override" });
    state = quizReducer(state, { type: "undoOverride" });
    expect(state.firstAttempts[id].overridden).toBe(false);
    state = quizReducer(state, { type: "continue" });
    expect(state.queue.at(-1)?.id).toBe(id);
  });

  it("ignores override on a correct answer", () => {
    let state = startQuiz(cards.slice(0, 1));
    state = quizReducer(state, { type: "answer", answer: "a", result: right });
    expect(quizReducer(state, { type: "override" })).toBe(state);
  });
});
