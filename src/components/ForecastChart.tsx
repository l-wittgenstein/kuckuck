import { useState } from "react";
import type { Bucket } from "../domain/forecast";
import { forecastDays, forecastHours } from "../domain/forecast";
import { it } from "../i18n/it";

type View = "hours" | "days";

function label(bucket: Bucket, view: View, index: number): string {
  if (view === "hours") {
    return index === 0 ? it.dashboard.now : `${bucket.start.getHours()}`;
  }
  if (index === 0) return it.dashboard.today;
  return bucket.start.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "");
}

// Upcoming reviews as simple bars, one accent colour, with the count
// written above each non-empty bar.
export function ForecastChart({ dues, now }: { dues: Date[]; now: Date }) {
  const [view, setView] = useState<View>("days");
  const buckets = view === "hours" ? forecastHours(dues, now) : forecastDays(dues, now);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="card forecast">
      <div className="forecast-head">
        <h2>{it.dashboard.forecast}</h2>
        <div className="segmented" role="group" aria-label={it.dashboard.forecast}>
          {(["hours", "days"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {it.dashboard.views[v]}
            </button>
          ))}
        </div>
      </div>
      <ol className={`bars bars-${view}`}>
        {buckets.map((b, i) => (
          <li key={b.start.getTime()} aria-label={it.dashboard.barLabel(label(b, view, i), b.count)}>
            <span className="bar-value">{b.count > 0 ? b.count : ""}</span>
            <span className="bar-track">
              <span className="bar" style={{ height: `${(100 * b.count) / max}%` }} />
            </span>
            <span className="bar-label" aria-hidden="true">
              {label(b, view, i)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
