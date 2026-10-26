import { STAGES, type Stage } from "../domain/stages";
import { it } from "../i18n/it";
import { STAGE_EMOJI } from "./Stage";

export function StageTiles({ counts, unstudied }: { counts: Record<Stage, number>; unstudied: number }) {
  return (
    <ul className="stage-tiles">
      {STAGES.map((s) => (
        <li key={s}>
          <span className="stage-emoji" aria-hidden="true">{STAGE_EMOJI[s]}</span>
          <strong>{counts[s]}</strong>
          <span className="muted">{it.stages[s]}</span>
        </li>
      ))}
      <li className="tile-unstudied">
        <span className="stage-emoji" aria-hidden="true">📚</span>
        <strong>{unstudied}</strong>
        <span className="muted">{it.vocab.unstudied}</span>
      </li>
    </ul>
  );
}
