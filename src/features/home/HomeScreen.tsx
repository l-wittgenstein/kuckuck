import { Link } from "react-router-dom";
import { allBatches } from "../../content";
import { usePassedBatches } from "../../db/lessons";
import { nextBatch } from "../../domain/progress";
import { it } from "../../i18n/it";

export function HomeScreen() {
  const passed = usePassedBatches();
  const next = passed && nextBatch(allBatches, passed);

  return (
    <section className="screen">
      <h1>{it.home.greeting}</h1>
      <p className="muted">{it.app.tagline}</p>

      {!passed ? (
        <p className="muted">{it.home.loading}</p>
      ) : next ? (
        <div className="card next-card">
          <span className="unit-number">{it.home.nextUp}</span>
          <strong>{it.home.lessonOf(next.unit.order, next.index + 1)}</strong>
          <span className="muted">{next.unit.title}</span>
          <Link to={`/lezione/${next.id}`} className="button wide">
            {it.home.start}
          </Link>
        </div>
      ) : (
        <p>{it.home.allDone}</p>
      )}
    </section>
  );
}
