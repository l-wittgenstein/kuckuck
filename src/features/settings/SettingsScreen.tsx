import { useState } from "react";
import { speak, useVoiceStatus } from "../../audio/tts";
import { findItem } from "../../content";
import { germanLabel } from "../../components/German";
import { deleteFlag, exportFlags, useFlags } from "../../db/flags";
import { setSetting, useSettings } from "../../db/settings";
import { it } from "../../i18n/it";
import { isInstalled, useInstallPrompt } from "../../pwa/install";
import { useTheme, type Theme } from "../../theme/theme";
import { BackupSection } from "./BackupSection";

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
  const { canInstall, install } = useInstallPrompt();
  const [theme, setTheme] = useTheme();

  return (
    <section className="screen">
      <h1>{it.settings.title}</h1>

      <h2>{it.pwa.installTitle}</h2>
      <div className="card audio-card">
        {isInstalled() ? (
          <span>✓ {it.pwa.installed}</span>
        ) : (
          <>
            <span>{it.pwa.installText}</span>
            {canInstall ? (
              <button type="button" className="button" onClick={install}>
                {it.pwa.install}
              </button>
            ) : (
              <span className="muted small">{it.pwa.installManual}</span>
            )}
          </>
        )}
      </div>

      <h2>{it.theme.title}</h2>
      <div className="card audio-card">
        <div className="segmented theme-choice" role="group" aria-label={it.theme.title}>
          {(["auto", "light", "dark"] as Theme[]).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {it.theme[t]}
            </button>
          ))}
        </div>
        <span className="muted small">{it.theme.autoHint}</span>
      </div>

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

      <BackupSection />

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

    </section>
  );
}
