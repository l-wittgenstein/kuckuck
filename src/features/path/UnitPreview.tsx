import { Link, useParams } from "react-router-dom";
import { findUnit } from "../../content";
import type { VocabItem } from "../../../content/schema";
import { it } from "../../i18n/it";

function germanLabel(v: VocabItem) {
  return v.pos === "noun" ? `${v.article} ${v.de}` : v.de;
}

export function UnitPreview() {
  const { unitId = "" } = useParams();
  const unit = findUnit(unitId);
  if (!unit) {
    return (
      <section className="screen">
        <h1>{it.notFound.title}</h1>
        <Link to="/percorso">{it.path.back}</Link>
      </section>
    );
  }

  return (
    <section className="screen">
      <Link to="/percorso" className="back-link">
        ← {it.path.back}
      </Link>
      <span className="unit-number">{it.path.unit(unit.order)}</span>
      <h1>{unit.title}</h1>
      <p className="muted">{unit.summary}</p>

      <h2>{it.path.grammar}</h2>
      <ul className="item-list">
        {unit.grammar.map((g) => (
          <li key={g.id} className="card">
            <strong>{g.title}</strong>
            <span className="muted">{g.pattern.join(" · ")}</span>
          </li>
        ))}
      </ul>

      <h2>{it.path.vocab}</h2>
      <ul className="item-list">
        {unit.vocab.map((v) => (
          <li key={v.id} className="card vocab-row">
            <span lang="de" className={`de article-${v.article ?? "none"}`}>
              {germanLabel(v)}
            </span>
            {v.pos === "noun" && (
              <span lang="de" className="muted">
                {v.plural ? `${it.path.plural}: die ${v.plural}` : it.path.noPlural}
              </span>
            )}
            <span>{v.it.join(", ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
