// Shape of the learning content. IDs are stable and never reused:
// progress is keyed by them, so renaming one orphans her reviews.
import { z } from "zod";

const text = z.string().trim().min(1);

export const ExampleSchema = z.object({
  de: text,
  it: text,
});

export const PartOfSpeech = z.enum([
  "noun",
  "propn", // proper noun, e.g. a country: no article in use, no plural
  "verb",
  "adj",
  "adv",
  "pron",
  "prep",
  "conj",
  "num",
  "interj",
  "phrase",
]);

export const ArticleSchema = z.enum(["der", "die", "das"]);

export const VocabItemSchema = z.object({
  id: z.string().regex(/^v-[a-c][12]-\d{4}$/),
  pos: PartOfSpeech,
  de: text,
  article: ArticleSchema.optional(),
  // null = no plural in normal use (e.g. die Sonne)
  plural: text.nullable().optional(),
  // Accepted Italian meanings; the first is the one shown.
  it: z.array(text).min(1),
  // Prompt for Italian → German, disambiguated where needed.
  promptIt: text,
  // Extra accepted German answers (spelling variants).
  acceptDe: z.array(text).optional(),
  noteIt: text.optional(),
  examples: z.array(ExampleSchema).min(2).max(3),
});

export const ExerciseSchema = z.object({
  id: z.string().regex(/^g-[a-c][12]-\d{4}-e\d+$/),
  // Exactly one "___" marks the gap.
  sentence: text,
  answers: z.array(text).min(1),
  // When true, "sie" is not accepted for "Sie".
  caseSensitive: z.boolean().optional(),
  hintIt: text.optional(),
  translationIt: text,
  explanationIt: text,
});

export const MistakeSchema = z.object({
  wrong: text,
  right: text,
  explanationIt: text,
});

export const GrammarItemSchema = z.object({
  id: z.string().regex(/^g-[a-c][12]-\d{4}$/),
  title: text,
  explanationIt: z.array(text).min(1), // paragraphs
  pattern: z.array(text).min(1), // lines of the pattern table
  examples: z.array(ExampleSchema).min(2),
  commonMistakes: z.array(MistakeSchema).min(1),
  exercises: z.array(ExerciseSchema).min(3),
});

export const BatchSchema = z.object({
  id: z.string().regex(/^[a-c][12]-u\d{2}-b\d{2}$/),
  itemIds: z.array(z.string()).min(1).max(5),
});

export const UnitSchema = z.object({
  id: z.string().regex(/^[a-c][12]-u\d{2}$/),
  level: z.string(),
  order: z.number().int().positive(),
  title: text,
  summary: text,
  batches: z.array(BatchSchema).min(1),
});

export const LevelSchema = z.object({
  id: z.string().regex(/^[a-c][12]$/),
  title: text,
  subtitle: text,
  units: z.array(z.string()).min(1),
});

export const ManifestSchema = z.object({
  version: z.number().int().positive(),
  levels: z.array(z.string()).min(1),
});

export type Example = z.infer<typeof ExampleSchema>;
export type VocabItem = z.infer<typeof VocabItemSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type GrammarItem = z.infer<typeof GrammarItemSchema>;
export type Batch = z.infer<typeof BatchSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
