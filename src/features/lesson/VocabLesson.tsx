import type { VocabItem } from "../../../content/schema";
import { GermanWord } from "../../components/German";
import { it } from "../../i18n/it";

export function VocabLesson({ item }: { item: VocabItem }) {
  return (
    <article className="lesson-item">
      <span className="tag">{it.lesson.pos[item.pos]}</span>
      <h1 className="headword">
        <GermanWord item={item} />
      </h1>
      {item.pos === "noun" && (
        <p className="muted" lang="de">
          {it.lesson.plural}: {item.plural ? `die ${item.plural}` : it.lesson.noPlural}
        </p>
      )}
      <p className="meaning">{item.it.join(", ")}</p>
      {item.noteIt && <p className="note">{item.noteIt}</p>}

      <h2>{it.lesson.examples}</h2>
      <ul className="examples">
        {item.examples.map((ex) => (
          <li key={ex.de}>
            <span lang="de" className="example-de">{ex.de}</span>
            <span className="muted">{ex.it}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
