import { Link, useParams } from "react-router-dom";
import { germanLabel } from "../../components/German";
import { allBatches, findUnit } from "../../content";
import { usePassedBatches } from "../../db/lessons";
import { useDueCount, useNow } from "../../db/reviews";
import { MAX_DUE_FOR_LESSONS } from "../../domain/config";
import { batchStatuses } from "../../domain/progress";
import { it } from "../../i18n/it";

export function UnitScreen() {
  const { unitId = "" } = useParams();
  const unit = findUnit(unitId);
  const passed = usePassedBatches();
  const due = useDueCount(useNow());

  if (!unit) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/percorso">{it.path.back}</Link>
      </section>
    );
  }
  if (!passed || due === undefined) return null;
  const paused = due > MAX_DUE_FOR_LESSONS;
  const statuses = batchStatuses(allBatches, passed);
  const batches = allBatches.filter((b) => b.unit.id === unit.id);

  return (
    <section className="screen">
      <Link to="/percorso" className="back-link">
        ← {it.path.back}
      </Link>
      <span className="unit-number">{it.path.unit(unit.order)}</span>
      <h1>{unit.title}</h1>
      <p className="muted">{unit.summary}</p>

      <ol className="unit-list lesson-list">
        {batches.map((batch) => {
          const status = statuses.get(batch.id)!;
          const shown = status === "available" && paused ? "paused" : status;
          const labels = batch.items.map((c) =>
            c.kind === "vocab" ? germanLabel(c.item) : `📘 ${c.item.title}`,
          );
          const body = (
            <>
              <span className="lesson-head">
                <strong>{it.path.lesson(batch.index + 1)}</strong>
                <span className={`status status-${shown}`}>
                  {shown === "done" ? "✓ " : shown === "locked" ? "🔒 " : ""}
                  {it.path.status[shown]}
                </span>
              </span>
              <span className="muted lesson-items" lang="de">
                {labels.join(" · ")}
              </span>
            </>
          );
          return (
            <li key={batch.id}>
              {shown === "locked" || shown === "paused" ? (
                <div className="card lesson-card is-locked">{body}</div>
              ) : (
                <Link
                  to={`/lezione/${batch.id}`}
                  className={`card lesson-card ${status === "available" ? "is-next" : ""}`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
