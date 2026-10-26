import type { Stage } from "../domain/stages";
import { it } from "../i18n/it";

export const STAGE_EMOJI: Record<Stage, string> = {
  uovo: "🥚",
  pulcino: "🐣",
  passerotto: "🐦",
  gufo: "🦉",
  aquila: "🦅",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`stage stage-${stage}`}>
      <span aria-hidden="true">{STAGE_EMOJI[stage]}</span> {it.stages[stage]}
    </span>
  );
}
