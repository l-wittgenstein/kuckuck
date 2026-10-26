import { describe, expect, it } from "vitest";
import { newSrsState, Rating, State, type SrsState } from "../srs/scheduler";
import { cardStage, itemStage, shouldRetire } from "./stages";

const now = new Date("2026-11-01T10:00:00Z");
const review = (stability: number): SrsState => ({ ...newSrsState(now), state: State.Review, stability });

describe("stages", () => {
  it("new and learning cards are eggs", () => {
    expect(cardStage({ srs: newSrsState(now) })).toBe("uovo");
    expect(cardStage({ srs: { ...review(50), state: State.Learning } })).toBe("uovo");
    expect(cardStage({ srs: { ...review(50), state: State.Relearning } })).toBe("uovo");
  });

  it("climbs with stability", () => {
    expect(cardStage({ srs: review(6.9) })).toBe("uovo");
    expect(cardStage({ srs: review(7) })).toBe("pulcino");
    expect(cardStage({ srs: review(30) })).toBe("passerotto");
    expect(cardStage({ srs: review(90) })).toBe("gufo");
    expect(cardStage({ srs: review(400) })).toBe("gufo");
    expect(cardStage({ srs: review(400), retired: true })).toBe("aquila");
  });

  it("an item takes its lowest card", () => {
    expect(itemStage([{ srs: review(40) }, { srs: review(8) }])).toBe("pulcino");
    expect(itemStage([])).toBeUndefined();
  });

  it("retires only after a successful review past the threshold", () => {
    expect(shouldRetire(review(200), Rating.Good)).toBe(true);
    expect(shouldRetire(review(200), Rating.Hard)).toBe(true);
    expect(shouldRetire(review(200), Rating.Again)).toBe(false);
    expect(shouldRetire(review(100), Rating.Good)).toBe(false);
  });
});
