import type { VocabItem } from "../../content/schema";

// The German headword, with the article coloured by gender for nouns.
export function GermanWord({ item }: { item: VocabItem }) {
  if (item.pos !== "noun") return <span lang="de">{item.de}</span>;
  return (
    <span lang="de">
      <span className={`article-${item.article}`}>{item.article}</span> {item.de}
    </span>
  );
}

export function germanLabel(item: VocabItem): string {
  return item.pos === "noun" ? `${item.article} ${item.de}` : item.de;
}
