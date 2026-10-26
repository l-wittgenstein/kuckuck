import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { GermanWord } from "../../components/German";
import { StageBadge } from "../../components/Stage";
import { levels, type ContentItem, type UnitContent } from "../../content";
import { groupByItem, useAllCards } from "../../db/cards";
import { itemStage, STAGES, type Stage } from "../../domain/stages";
import { it } from "../../i18n/it";

type StageFilter = "all" | "unstudied" | Stage;
type TypeFilter = "all" | "vocab" | "grammar";

interface Row {
  content: ContentItem;
  unit: UnitContent;
  stage?: Stage;
  haystack: string;
}

// Lowercase, without accents or umlaut dots, so "madchen" finds Mädchen.
function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const units = levels.flatMap((l) => l.unitContents);

export function VocabScreen() {
  const cards = useAllCards();
  const [query, setQuery] = useState("");
  const [unitId, setUnitId] = useState("all");
  const [stage, setStage] = useState<StageFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");

  const rows = useMemo<Row[]>(() => {
    const byItem = groupByItem(cards ?? []);
    return units.flatMap((unit) => [
      ...unit.vocab.map((item) => ({
        content: { kind: "vocab", item } as ContentItem,
        unit,
        stage: itemStage(byItem.get(item.id) ?? []),
        haystack: fold([item.article, item.de, item.plural, ...item.it].filter(Boolean).join(" ")),
      })),
      ...unit.grammar.map((item) => ({
        content: { kind: "grammar", item } as ContentItem,
        unit,
        stage: itemStage(byItem.get(item.id) ?? []),
        haystack: fold(`${item.title} ${item.pattern.join(" ")}`),
      })),
    ]);
  }, [cards]);

  if (!cards) return null;

  const q = fold(query.trim());
  const shown = rows.filter(
    (r) =>
      (unitId === "all" || r.unit.id === unitId) &&
      (type === "all" || r.content.kind === type) &&
      (stage === "all" || (stage === "unstudied" ? !r.stage : r.stage === stage)) &&
      (!q || r.haystack.includes(q)),
  );

  return (
    <section className="screen">
      <h1>{it.vocab.title}</h1>
      <input
        type="search"
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={it.vocab.search}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      <div className="filters">
        <select value={unitId} onChange={(e) => setUnitId(e.target.value)} aria-label={it.dashboard.units}>
          <option value="all">{it.vocab.allUnits}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {it.vocab.unitShort(u.order)}
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value as StageFilter)} aria-label={it.dashboard.progress}>
          <option value="all">{it.vocab.allStages}</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {it.stages[s]}
            </option>
          ))}
          <option value="unstudied">{it.vocab.unstudied}</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label={it.vocab.allTypes}>
          <option value="all">{it.vocab.allTypes}</option>
          <option value="vocab">{it.vocab.words}</option>
          <option value="grammar">{it.vocab.grammar}</option>
        </select>
      </div>
      <p className="muted results">{it.vocab.results(shown.length)}</p>

      {shown.length === 0 ? (
        <p className="muted">{it.vocab.none}</p>
      ) : (
        <ul className="vocab-list">
          {shown.map(({ content, stage: s }) => (
            <li key={content.item.id}>
              <Link to={`/vocabolario/${content.item.id}`} className={`vocab-item ${s ? "" : "is-unstudied"}`}>
                <span className="vocab-text">
                  {content.kind === "vocab" ? (
                    <>
                      <strong className="vocab-de">
                        <GermanWord item={content.item} />
                      </strong>
                      <span className="muted">{content.item.it.join(", ")}</span>
                    </>
                  ) : (
                    <>
                      <strong>{content.item.title}</strong>
                      <span className="muted">{it.vocab.grammar}</span>
                    </>
                  )}
                </span>
                {s ? <StageBadge stage={s} /> : <span className="muted small">{it.vocab.unstudied}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
