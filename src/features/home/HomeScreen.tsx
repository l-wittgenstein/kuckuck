import { Link } from "react-router-dom";
import { ForecastChart } from "../../components/ForecastChart";
import { StageTiles } from "../../components/StageTiles";
import { allBatches, levels } from "../../content";
import { groupByItem, useAllCards } from "../../db/cards";
import { usePassedBatches } from "../../db/lessons";
import { useNow } from "../../db/reviews";
import { MAX_DUE_FOR_LESSONS } from "../../domain/config";
import { batchStatuses, nextBatch, unitProgress } from "../../domain/progress";
import { itemStats } from "../../domain/stats";
import { it } from "../../i18n/it";

export function HomeScreen() {
  const now = useNow();
  const passed = usePassedBatches();
  const cards = useAllCards();
  if (!passed || !cards) return <p className="screen muted">{it.home.loading}</p>;

  const active = cards.filter((c) => !c.retired);
  const due = active.filter((c) => c.due <= now).length;
  const next = nextBatch(allBatches, passed);
  const paused = due > MAX_DUE_FOR_LESSONS;
  const units = levels.flatMap((l) => l.unitContents);
  const statuses = batchStatuses(allBatches, passed);
  const stats = itemStats(units, groupByItem(cards));

  return (
    <section className="screen dashboard">
      <h1>{it.home.greeting}</h1>
      <p className="muted">{it.app.tagline}</p>

      <div className="card next-card">
        <span className="unit-number">{it.home.nextUp}</span>
        {due > 0 ? (
          <>
            <strong>{it.home.reviewsDue(due)}</strong>
            <Link to="/ripassi" className="button wide">
              {it.home.startReviews}
            </Link>
          </>
        ) : next ? (
          <>
            <strong>{it.home.lessonOf(next.unit.order, next.index + 1)}</strong>
            <span className="muted">{next.unit.title}</span>
            <Link to={`/lezione/${next.id}`} className="button wide">
              {it.home.start}
            </Link>
          </>
        ) : (
          <strong>{it.home.reviewsDue(0)}</strong>
        )}
      </div>

      <div className="summary-row">
        <div className="card summary">
          <strong className="big-number">{due}</strong>
          <span className="muted">{it.home.reviews}</span>
        </div>
        <div className="card summary">
          {next ? (
            <>
              <strong className="big-number">{next.items.length}</strong>
              <span className="muted">{paused ? it.home.lessonsPaused : it.home.newItems}</span>
              {due > 0 && !paused && (
                <Link to={`/lezione/${next.id}`} className="summary-link">
                  {it.home.startShort}
                </Link>
              )}
            </>
          ) : (
            <span className="muted">{it.home.allDone}</span>
          )}
        </div>
      </div>
      {next && paused && <p className="note">{it.home.paused(MAX_DUE_FOR_LESSONS)}</p>}

      <ForecastChart dues={active.map((c) => c.due)} now={now} />

      <h2>{it.dashboard.progress}</h2>
      <StageTiles counts={stats.stages} unstudied={stats.total - stats.studied} />
      <p className="muted">{it.dashboard.studied(stats.studied, stats.total)}</p>

      <h2>{it.dashboard.units}</h2>
      <ul className="unit-list">
        {units.map((unit) => {
          const p = unitProgress(unit, statuses);
          const s = itemStats([unit], groupByItem(cards));
          return (
            <li key={unit.id}>
              <Link to={`/percorso/${unit.id}`} className={`card unit-card ${p.locked ? "is-locked" : ""}`}>
                <span className="lesson-head">
                  <strong>{it.path.unit(unit.order)}</strong>
                  <span className="muted">{it.path.lessonsDone(p.done, p.total)}</span>
                </span>
                <span className="muted">{unit.title}</span>
                <span className="mini-bar" aria-hidden="true">
                  <span style={{ width: `${(100 * s.studied) / s.total}%` }} />
                </span>
                <span className="unit-counts muted">{it.dashboard.studied(s.studied, s.total)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
