import { describe, expect, it } from "vitest";
import type { CheckResult } from "../checker/check";
import { findBatch } from "../content";
import { cardsFor } from "./cards";
import { drillQueue, sessionResults } from "./results";

const right: CheckResult = { outcome: "correct", notes: [], expected: "x" };
const almost: CheckResult = { outcome: "almost", notes: ["typo"], expected: "x" };
const wrong: CheckResult = { outcome: "wrong", notes: [], expected: "x" };
const attempt = (result: CheckResult, overridden = false) => ({ answer: "a", result, overridden });

const cards = findBatch("a1-u01-b01")!.items.flatMap(cardsFor);

describe("sessionResults", () => {
  it("groups cards by item; an item with any miss is wrong", () => {
    const [a1, a2, b1, b2, c1] = cards;
    const results = sessionResults(cards, {
      [a1.id]: attempt(right),
      [a2.id]: attempt(wrong),
      [b1.id]: attempt(almost),
      [b2.id]: attempt(right),
      [c1.id]: attempt(wrong, true),
    });
    expect(results.wrong.map((r) => r.itemId)).toEqual([a1.itemId]);
    expect(results.wrong[0].missed.map((c) => c.id)).toEqual([a2.id]);
    expect(results.right.map((r) => r.itemId)).toEqual([b1.itemId, c1.itemId]);
    expect(results.answeredCards).toBe(5);
    expect(results.rightCards).toBe(4);
  });

  it("leaves out cards that were never answered", () => {
    const results = sessionResults(cards, {});
    expect(results.right).toEqual([]);
    expect(results.wrong).toEqual([]);
    expect(results.answeredCards).toBe(0);
  });
});

describe("drillQueue", () => {
  it("asks every missed card three times, never twice in a row", () => {
    const missed = cards.slice(0, 3);
    for (let seed = 0; seed < 50; seed++) {
      let x = seed;
      const random = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      const queue = drillQueue(missed, 3, random);
      expect(queue).toHaveLength(9);
      for (const card of missed) expect(queue.filter((c) => c.id === card.id)).toHaveLength(3);
      for (let i = 1; i < queue.length; i++) expect(queue[i].id).not.toBe(queue[i - 1].id);
    }
  });

  it("repeats a single missed card three times", () => {
    expect(drillQueue(cards.slice(0, 1)).map((c) => c.id)).toEqual(Array(3).fill(cards[0].id));
  });
});
