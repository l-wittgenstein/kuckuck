// Checks the content files beyond their shape: cross-references, noun
// metadata, punctuation and gaps. Errors fail the build; warnings don't.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import {
  GrammarItemSchema,
  LevelSchema,
  ManifestSchema,
  UnitSchema,
  VocabItemSchema,
  type Example,
  type GrammarItem,
  type VocabItem,
} from "./schema";

export interface Report {
  errors: string[];
  warnings: string[];
  counts: { units: number; vocab: number; grammar: number; exercises: number };
}

const GAP = "___";
const ENDS_SENTENCE = /[.!?…]$/;

export function validateContent(root: string): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts = { units: 0, vocab: 0, grammar: 0, exercises: 0 };
  const seenIds = new Map<string, string>();

  function read<T>(file: string, schema: z.ZodType<T>): T | undefined {
    const path = join(root, file);
    if (!existsSync(path)) {
      errors.push(`${file}: missing`);
      return undefined;
    }
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      errors.push(`${file}: invalid JSON (${(e as Error).message})`);
      return undefined;
    }
    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${file}: ${issue.path.join(".")}: ${issue.message}`);
      }
      return undefined;
    }
    return result.data;
  }

  function claimId(id: string, where: string) {
    const previous = seenIds.get(id);
    if (previous) errors.push(`${where}: id ${id} already used in ${previous}`);
    else seenIds.set(id, where);
  }

  function checkSentence(s: string, where: string) {
    if (s !== s.trim() || /\s{2,}/.test(s)) errors.push(`${where}: stray whitespace in "${s}"`);
    if (!ENDS_SENTENCE.test(s)) errors.push(`${where}: no final punctuation in "${s}"`);
  }

  function checkExamples(examples: Example[], where: string) {
    examples.forEach((ex, i) => {
      checkSentence(ex.de, `${where} example ${i + 1} (de)`);
      checkSentence(ex.it, `${where} example ${i + 1} (it)`);
    });
  }

  function checkVocab(v: VocabItem, where: string) {
    const isNoun = v.pos === "noun";
    if (isNoun) {
      if (!v.article) errors.push(`${where}: noun without article`);
      if (v.plural === undefined) errors.push(`${where}: noun without plural (use null if none)`);
    } else if (v.plural !== undefined) {
      errors.push(`${where}: plural on a non-noun`);
    }
    if (v.pos !== "propn" && !isNoun && v.article) {
      errors.push(`${where}: article on a non-noun`);
    }
    if (isNoun || v.pos === "propn") {
      for (const form of [v.de, v.plural ?? ""].filter(Boolean)) {
        if (form[0] !== form[0].toUpperCase()) errors.push(`${where}: noun "${form}" must be capitalised`);
      }
    }
    if (new Set(v.it).size !== v.it.length) errors.push(`${where}: duplicate Italian meanings`);
    checkExamples(v.examples, where);

    // A noun the examples never show is probably a copy-paste slip.
    if (isNoun || v.pos === "propn") {
      const forms = [v.de, v.plural].filter((f): f is string => !!f);
      const shown = v.examples.some((ex) =>
        forms.some((f) => new RegExp(`(^|[^\\p{L}])${f}($|[^\\p{L}])`, "u").test(ex.de)),
      );
      if (!shown) warnings.push(`${where}: "${v.de}" does not appear in its examples`);
    }
  }

  function checkGrammar(g: GrammarItem, where: string) {
    checkExamples(g.examples, where);
    for (const ex of g.exercises) {
      const exWhere = `${where} ${ex.id}`;
      claimId(ex.id, exWhere);
      if (!ex.id.startsWith(`${g.id}-`)) errors.push(`${exWhere}: id must start with ${g.id}-`);
      const gaps = ex.sentence.split(GAP).length - 1;
      if (gaps !== 1) errors.push(`${exWhere}: needs exactly one ${GAP}, found ${gaps}`);
      for (const answer of ex.answers) {
        checkSentence(ex.sentence.replace(GAP, answer), `${exWhere} filled with "${answer}"`);
      }
      checkSentence(ex.translationIt, `${exWhere} translation`);
      counts.exercises++;
    }
  }

  const manifest = read("manifest.json", ManifestSchema);
  if (!manifest) return { errors, warnings, counts };

  for (const levelId of manifest.levels) {
    const level = read(`${levelId}/level.json`, LevelSchema);
    if (!level) continue;
    if (level.id !== levelId) errors.push(`${levelId}/level.json: id is ${level.id}`);

    level.units.forEach((unitId, index) => {
      const dir = `${levelId}/${unitId.split("-")[1]}`;
      const unit = read(`${dir}/unit.json`, UnitSchema);
      const vocab = read(`${dir}/vocab.json`, VocabItemSchema.array()) ?? [];
      const grammar = read(`${dir}/grammar.json`, GrammarItemSchema.array()) ?? [];
      if (!unit) return;
      counts.units++;

      if (unit.id !== unitId) errors.push(`${dir}/unit.json: id is ${unit.id}, level lists ${unitId}`);
      if (unit.level !== levelId) errors.push(`${dir}/unit.json: level is ${unit.level}`);
      if (unit.order !== index + 1) errors.push(`${dir}/unit.json: order ${unit.order}, expected ${index + 1}`);

      const items = new Map<string, string>();
      for (const v of vocab) {
        const where = `${dir}/vocab.json ${v.id} (${v.de})`;
        claimId(v.id, where);
        checkVocab(v, where);
        items.set(v.id, where);
        counts.vocab++;
      }
      for (const g of grammar) {
        const where = `${dir}/grammar.json ${g.id}`;
        claimId(g.id, where);
        checkGrammar(g, where);
        items.set(g.id, where);
        counts.grammar++;
      }

      // Every item is taught in exactly one batch of its own unit.
      const placed = new Set<string>();
      unit.batches.forEach((batch, i) => {
        claimId(batch.id, `${dir}/unit.json batch ${i + 1}`);
        const expected = `${unitId}-b${String(i + 1).padStart(2, "0")}`;
        if (batch.id !== expected) errors.push(`${dir}/unit.json: batch ${i + 1} id ${batch.id}, expected ${expected}`);
        for (const itemId of batch.itemIds) {
          if (!items.has(itemId)) errors.push(`${dir}/unit.json ${batch.id}: unknown item ${itemId}`);
          if (placed.has(itemId)) errors.push(`${dir}/unit.json ${batch.id}: ${itemId} is in two batches`);
          placed.add(itemId);
        }
      });
      for (const [id, where] of items) {
        if (!placed.has(id)) errors.push(`${where}: not in any batch`);
      }
    });
  }

  return { errors, warnings, counts };
}
