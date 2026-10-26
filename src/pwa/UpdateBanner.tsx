import { useRegisterSW } from "virtual:pwa-register/react";
import { it } from "../i18n/it";

// Offline support, and a quiet offer to update when a new version is out.
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Look for updates every hour while the app stays open.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>{it.pwa.updateReady}</span>
      <button type="button" className="link-button" onClick={() => setNeedRefresh(false)}>
        {it.pwa.later}
      </button>
      <button type="button" className="button" onClick={() => updateServiceWorker(true)}>
        {it.pwa.update}
      </button>
    </div>
  );
}
