// The visible ladder an item climbs. Stages are derived from the
// scheduler's stability, never stored, so a lapse drops them naturally.
import { Rating, State, type Grade, type SrsState } from "../srs/scheduler";
import { STAGE_THRESHOLDS } from "./config";

export const STAGES = ["uovo", "pulcino", "passerotto", "gufo", "aquila"] as const;
export type Stage = (typeof STAGES)[number];

export interface StagedCard {
  srs: SrsState;
  retired?: boolean;
}

export function cardStage(card: StagedCard): Stage {
  if (card.retired) return "aquila";
  if (card.srs.state !== State.Review) return "uovo";
  const s = card.srs.stability;
  if (s >= STAGE_THRESHOLDS.gufo) return "gufo";
  if (s >= STAGE_THRESHOLDS.passerotto) return "passerotto";
  if (s >= STAGE_THRESHOLDS.pulcino) return "pulcino";
  return "uovo";
}

// An item is only as far along as its weakest card.
export function itemStage(cards: StagedCard[]): Stage | undefined {
  if (cards.length === 0) return undefined;
  return cards
    .map(cardStage)
    .reduce((low, s) => (STAGES.indexOf(s) < STAGES.indexOf(low) ? s : low));
}

// A card retires (Aquila) once a successful review leaves it this stable.
export function shouldRetire(srs: SrsState, grade: Grade): boolean {
  return grade !== Rating.Again && srs.state === State.Review && srs.stability >= STAGE_THRESHOLDS.aquila;
}

export function stageRank(stage: Stage): number {
  return STAGES.indexOf(stage);
}
