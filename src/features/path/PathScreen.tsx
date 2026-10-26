import { Link } from "react-router-dom";
import { levels } from "../../content";
import { it } from "../../i18n/it";

export function PathScreen() {
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
            {level.unitContents.map((unit) => (
              <li key={unit.id}>
                <Link to={`/percorso/${unit.id}`} className="card unit-card">
                  <span className="unit-number">{it.path.unit(unit.order)}</span>
                  <strong>{unit.title}</strong>
                  <span className="muted">{unit.summary}</span>
                  <span className="unit-counts">
                    {it.path.counts(unit.vocab.length, unit.grammar.length)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
