import type { VocabItem } from "../../../content/schema";
import { GermanWord, germanLabel } from "../../components/German";
import { PlayButton } from "../../components/PlayButton";
import { FlagButton } from "../../components/FlagButton";
import { it } from "../../i18n/it";

export function VocabLesson({ item }: { item: VocabItem }) {
  return (
    <article className="lesson-item">
      <div className="item-top">
        <span className="tag">{it.lesson.pos[item.pos]}</span>
        <FlagButton itemId={item.id} />
      </div>
      <h1 className="headword with-audio">
        <GermanWord item={item} />
        <PlayButton text={germanLabel(item)} size="large" />
      </h1>
      {item.pos === "noun" && (
        <p className="muted with-audio" lang="de">
          {it.lesson.plural}: {item.plural ? `die ${item.plural}` : it.lesson.noPlural}
          {item.plural && <PlayButton text={`die ${item.plural}`} />}
        </p>
      )}
      <p className="meaning">{item.it.join(", ")}</p>
      {item.noteIt && <p className="note">{item.noteIt}</p>}

      <h2>{it.lesson.examples}</h2>
      <ul className="examples">
        {item.examples.map((ex) => (
          <li key={ex.de} className="example">
            <PlayButton text={ex.de} />
            <span className="example-text">
              <span lang="de" className="example-de">{ex.de}</span>
              <span className="muted">{ex.it}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
