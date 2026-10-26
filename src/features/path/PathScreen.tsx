import { Link } from "react-router-dom";
import { allBatches, levels } from "../../content";
import { usePassedBatches } from "../../db/lessons";
import { batchStatuses, unitProgress } from "../../domain/progress";
import { it } from "../../i18n/it";

export function PathScreen() {
  const passed = usePassedBatches();
  if (!passed) return null;
  const statuses = batchStatuses(allBatches, passed);

  return (
    <section className="screen">
      <h1>{it.path.title}</h1>
      <p className="muted">{it.path.subtitle}</p>
      {levels.map((level) => (
        <div key={level.id} className="level">
          <h2>
            {level.title} <span className="muted">· {level.subtitle}</span>
          </h2>
          <ol className="unit-list">
            {level.unitContents.map((unit) => {
              const progress = unitProgress(unit, statuses);
              return (
                <li key={unit.id}>
                  <Link
                    to={`/percorso/${unit.id}`}
                    className={`card unit-card ${progress.locked ? "is-locked" : ""}`}
                  >
                    <span className="unit-number">{it.path.unit(unit.order)}</span>
                    <strong>{unit.title}</strong>
                    <span className="muted">{unit.summary}</span>
                    <span className="unit-counts">
                      {progress.locked
                        ? `🔒 ${it.path.locked}`
                        : it.path.lessonsDone(progress.done, progress.total)}
                    </span>
                    <span className="mini-bar" aria-hidden="true">
                      <span style={{ width: `${(100 * progress.done) / progress.total}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}
