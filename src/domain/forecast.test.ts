import { describe, expect, it } from "vitest";
import { forecastDays, forecastHours } from "./forecast";

const now = new Date(2026, 10, 2, 9, 30); // 2 Nov 2026, 09:30 local
const at = (h: number, m = 0, day = 2) => new Date(2026, 10, day, h, m);

describe("forecast", () => {
  it("counts only what is due now in the first bucket, then clock-aligned two-hour blocks", () => {
    const b = forecastHours([at(8), at(9, 30), at(9, 45), at(10, 10), at(11, 40), at(12), at(9, 0, 4)], now);
    expect(b).toHaveLength(12);
    expect(b.slice(1, 4).map((x) => x.start.getHours())).toEqual([8, 10, 12]);
    // now | 08–10 (after 09:30) | 10–12 | 12–14
    expect(b.map((x) => x.count).slice(0, 4)).toEqual([2, 1, 2, 1]);
    expect(b.reduce((s, x) => s + x.count, 0)).toBe(6); // day 4 is beyond the chart
  });

  it("groups by calendar day, overdue counted today", () => {
    const b = forecastDays([at(7, 0, 1), at(23, 59), at(0, 1, 3), at(12, 0, 8), at(12, 0, 9)], now);
    expect(b).toHaveLength(7);
    expect(b.map((x) => x.count)).toEqual([2, 1, 0, 0, 0, 0, 1]);
    expect(b[1].start).toEqual(new Date(2026, 10, 3));
  });
});
