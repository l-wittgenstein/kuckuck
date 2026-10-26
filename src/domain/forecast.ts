// Upcoming reviews grouped into time buckets. Anything already due
// lands in the first bucket, since it is waiting right now.

export interface Bucket {
  start: Date;
  count: number;
}

// The first bucket is what is due right now; the rest are clock-aligned
// blocks (20:00, 22:00, …), the first of them starting at the current block.
export function forecastHours(dues: Date[], now: Date, buckets = 12, hoursPerBucket = 2): Bucket[] {
  const size = hoursPerBucket * 3_600_000;
  const base = new Date(now);
  base.setHours(now.getHours() - (now.getHours() % hoursPerBucket), 0, 0, 0);
  const result: Bucket[] = [
    { start: now, count: 0 },
    ...Array.from({ length: buckets - 1 }, (_, i) => ({ start: new Date(base.getTime() + i * size), count: 0 })),
  ];
  for (const due of dues) {
    if (due.getTime() <= now.getTime()) {
      result[0].count++;
      continue;
    }
    const i = 1 + Math.floor((due.getTime() - base.getTime()) / size);
    if (i < buckets) result[i].count++;
  }
  return result;
}

// Calendar days in local time: today, tomorrow, …
export function forecastDays(dues: Date[], now: Date, days = 7): Bucket[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: Bucket[] = Array.from({ length: days }, (_, i) => ({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + i),
    count: 0,
  }));
  for (const due of dues) {
    if (due.getTime() < result[0].start.getTime()) {
      result[0].count++;
      continue;
    }
    const day = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const i = result.findIndex((b) => b.start.getTime() === day.getTime());
    if (i >= 0) result[i].count++;
  }
  return result;
}
