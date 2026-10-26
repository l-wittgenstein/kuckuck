import { findItem } from "../../content";
import { germanLabel } from "../../components/German";
import { deleteFlag, exportFlags, useFlags } from "../../db/flags";
import { it } from "../../i18n/it";

function itemLabel(itemId: string): string {
  const content = findItem(itemId);
  if (!content) return itemId;
  return content.kind === "vocab" ? germanLabel(content.item) : content.item.title;
}

export function SettingsScreen() {
  const flags = useFlags();

  return (
    <section className="screen">
      <h1>{it.settings.title}</h1>

      <h2>{it.settings.flags}</h2>
      {!flags ? null : flags.length === 0 ? (
        <p className="muted">{it.settings.noFlags}</p>
      ) : (
        <>
          <ul className="item-list">
            {flags.map((f) => (
              <li key={f.id} className="card">
                <span className="lesson-head">
                  <strong lang="de">{itemLabel(f.itemId)}</strong>
                  <button type="button" className="link-button" onClick={() => deleteFlag(f.id!)}>
                    {it.settings.resolve}
                  </button>
                </span>
                <span>{f.note}</span>
                <span className="muted">{f.at.toLocaleDateString("it-IT")}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="button wide export" onClick={() => exportFlags(flags)}>
            {it.settings.export}
          </button>
        </>
      )}

      <p className="muted settings-later">{it.settings.comingSoon}</p>
    </section>
  );
}
