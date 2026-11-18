// Tunable numbers in one place.

// Days of FSRS stability needed to reach each stage.
export const STAGE_THRESHOLDS = {
  pulcino: 7,
  passerotto: 30,
  gufo: 90,
  aquila: 180, // and the card retires from reviews
} as const;

// Reviews come in rounds of this many cards, so a backlog after a break
// is a few short sessions rather than one long one.
export const REVIEW_ROUND_SIZE = 20;

// New lessons wait while more reviews than this are due, unless she has
// already done a round of reviews today.
export const MAX_DUE_FOR_LESSONS = 40;
