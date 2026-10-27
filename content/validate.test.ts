import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { validateContent } from "./validate";

const root = fileURLToPath(new URL(".", import.meta.url));

const copies: string[] = [];
afterAll(() => copies.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

// Copies the real content and lets a test break one file.
function brokenCopy(file: string, edit: (data: any) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "kuckuck-content-"));
  copies.push(dir);
  cpSync(root, dir, { recursive: true });
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  edit(data);
  writeFileSync(path, JSON.stringify(data));
  return dir;
}

describe("validateContent", () => {
  it("accepts the shipped content", () => {
    const report = validateContent(root);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.counts.units).toBeGreaterThan(0);
  });

  it("rejects a noun without article", () => {
    const dir = brokenCopy("a1/u02/vocab.json", (v) => delete v[0].article);
    expect(validateContent(dir).errors.join("\n")).toMatch(/noun without article/);
  });

  it("rejects a lowercase noun", () => {
    const dir = brokenCopy("a1/u02/vocab.json", (v) => (v[0].de = "mann"));
    expect(validateContent(dir).errors.join("\n")).toMatch(/must be capitalised/);
  });

  it("rejects an item missing from every batch", () => {
    const dir = brokenCopy("a1/u01/unit.json", (u) => u.batches[0].itemIds.pop());
    expect(validateContent(dir).errors.join("\n")).toMatch(/not in any batch/);
  });

  it("rejects a duplicate id across units", () => {
    const dir = brokenCopy("a1/u02/vocab.json", (v) => (v[0].id = "v-a1-0001"));
    expect(validateContent(dir).errors.join("\n")).toMatch(/already used/);
  });

  it("rejects an exercise with two gaps", () => {
    const dir = brokenCopy("a1/u01/grammar.json", (g) => (g[0].exercises[0].sentence = "___ bin ___."));
    expect(validateContent(dir).errors.join("\n")).toMatch(/exactly one ___/);
  });

  it("rejects an example without final punctuation", () => {
    const dir = brokenCopy("a1/u01/vocab.json", (v) => (v[0].examples[0].de = "Hallo, ich bin Anna"));
    expect(validateContent(dir).errors.join("\n")).toMatch(/no final punctuation/);
  });

  it("warns when a noun never appears in its examples", () => {
    const dir = brokenCopy("a1/u02/vocab.json", (v) => (v[0].examples = v[1].examples));
    expect(validateContent(dir).warnings.join("\n")).toMatch(/does not appear/);
  });

  it("warns when two items share their German but not their meanings", () => {
    const dir = brokenCopy("a1/u13/vocab.json", (v) => {
      const zu = v.find((item: { de: string }) => item.de === "zu");
      zu.it = ["troppo"];
    });
    expect(validateContent(dir).warnings.join("\n")).toMatch(/same German as/);
  });

  it("warns when an article exercise uses a noun not taught yet", () => {
    const dir = brokenCopy("a1/u02/grammar.json", (g) => {
      g[0].exercises[0].sentence = "___ Katze heißt Luna.";
      g[0].exercises[0].answers = ["Die"];
    });
    expect(validateContent(dir).warnings.join("\n")).toMatch(/gender of "Katze", not taught yet/);
  });
});
