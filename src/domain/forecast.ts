// Upcoming reviews grouped into time buckets. Anything already due
// lands in the first bucket, since it is waiting right now.

export interface Bucket {
  start: Date;
  count: number;
}

export function forecastHours(dues: Date[], now: Date, buckets = 12, hoursPerBucket = 2): Bucket[] {
  const size = hoursPerBucket * 3_600_000;
  const result: Bucket[] = Array.from({ length: buckets }, (_, i) => ({
    start: new Date(now.getTime() + i * size),
    count: 0,
  }));
  for (const due of dues) {
    const i = Math.max(0, Math.floor((due.getTime() - now.getTime()) / size));
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
