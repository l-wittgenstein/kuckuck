import { Link } from "react-router-dom";
import { allBatches } from "../../content";
import { usePassedBatches } from "../../db/lessons";
import { useDueCount, useNow } from "../../db/reviews";
import { MAX_DUE_FOR_LESSONS } from "../../domain/config";
import { nextBatch } from "../../domain/progress";
import { it } from "../../i18n/it";

export function HomeScreen() {
  const now = useNow();
  const passed = usePassedBatches();
  const due = useDueCount(now);
  if (!passed || due === undefined) return <p className="screen muted">{it.home.loading}</p>;

  const next = nextBatch(allBatches, passed);
  const paused = due > MAX_DUE_FOR_LESSONS;

  return (
    <section className="screen">
      <h1>{it.home.greeting}</h1>
      <p className="muted">{it.app.tagline}</p>

      <div className="card next-card">
        <span className="unit-number">{it.home.reviews}</span>
        <strong className="big-number">{due}</strong>
        <span className="muted">{it.home.reviewsDue(due)}</span>
        {due > 0 && (
          <Link to="/ripassi" className="button wide">
            {it.home.startReviews}
          </Link>
        )}
      </div>

      {next ? (
        <div className="card next-card">
          <span className="unit-number">{it.home.nextUp}</span>
          <strong>{it.home.lessonOf(next.unit.order, next.index + 1)}</strong>
          <span className="muted">{next.unit.title}</span>
          {paused ? (
            <p className="note">{it.home.paused(MAX_DUE_FOR_LESSONS)}</p>
          ) : (
            <Link to={`/lezione/${next.id}`} className={`button wide ${due > 0 ? "secondary" : ""}`}>
              {it.home.start}
            </Link>
          )}
        </div>
      ) : (
        <p>{it.home.allDone}</p>
      )}
    </section>
  );
}
