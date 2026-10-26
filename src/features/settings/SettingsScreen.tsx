import { useState } from "react";
import { speak, useVoiceStatus } from "../../audio/tts";
import { findItem } from "../../content";
import { germanLabel } from "../../components/German";
import { deleteFlag, exportFlags, useFlags } from "../../db/flags";
import { setSetting, useSettings } from "../../db/settings";
import { it } from "../../i18n/it";

function itemLabel(itemId: string): string {
  const content = findItem(itemId);
  if (!content) return itemId;
  return content.kind === "vocab" ? germanLabel(content.item) : content.item.title;
}

export function SettingsScreen() {
  const flags = useFlags();
  const settings = useSettings();
  const voice = useVoiceStatus();
  // Shown immediately; the database catches up a moment later.
  const [autoplay, setAutoplay] = useState<boolean>();

  return (
    <section className="screen">
      <h1>{it.settings.title}</h1>

      <h2>{it.audio.title}</h2>
      <div className="card audio-card">
        {voice.kind === "ready" && <span>✓ {it.audio.voice(voice.name)}</span>}
        {voice.kind === "loading" && <span className="muted">{it.audio.checking}</span>}
        {voice.kind === "unsupported" && <span>{it.audio.unsupported}</span>}
        {voice.kind === "missing" && (
          <>
            <strong>{it.audio.missing}</strong>
            <ol className="steps">
              {it.audio.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        )}
        {voice.kind !== "unsupported" && (
          <button type="button" className="button secondary" onClick={() => speak(it.audio.testText)}>
            🔊 {it.audio.test}
          </button>
        )}
        {settings && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoplay ?? settings.autoplay}
              onChange={(e) => {
                setAutoplay(e.target.checked);
                setSetting("autoplay", e.target.checked);
              }}
            />
            <span>{it.audio.autoplay}</span>
          </label>
        )}
        <span className="muted small">{it.audio.slowTip}</span>
      </div>

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
