import { describe, expect, it } from "vitest";
import { findUnit } from "../content";
import { newSrsState, State } from "../srs/scheduler";
import { itemStats } from "./stats";

const now = new Date("2026-11-01T10:00:00Z");
const unit = findUnit("a1-u01")!;

describe("itemStats", () => {
  it("counts items by their lowest card, the rest as unstudied", () => {
    const strong = { srs: { ...newSrsState(now), state: State.Review, stability: 40 } };
    const weak = { srs: newSrsState(now) };
    const cards = new Map([
      ["v-a1-0001", [strong, strong]],
      ["v-a1-0002", [strong, weak]],
    ]);
    const stats = itemStats([unit], cards);
    expect(stats.total).toBe(34);
    expect(stats.studied).toBe(2);
    expect(stats.stages.passerotto).toBe(1);
    expect(stats.stages.uovo).toBe(1);
  });
});
