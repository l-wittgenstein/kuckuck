// Tunable numbers in one place.

// Days of FSRS stability needed to reach each stage.
export const STAGE_THRESHOLDS = {
  pulcino: 7,
  passerotto: 30,
  gufo: 90,
  aquila: 180, // and the card retires from reviews
} as const;

// New lessons wait while more reviews than this are due.
export const MAX_DUE_FOR_LESSONS = 40;
