import { NavLink, Route, Routes } from "react-router-dom";
import { it } from "./i18n/it";

function Screen({ title, text }: { title: string; text: string }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="muted">{text}</p>
    </section>
  );
}

export function App() {
  return (
    <div className="shell">
      <main className="content">
        <Routes>
          <Route
            path="/"
            element={<Screen title={it.home.greeting} text={it.home.comingSoon} />}
          />
          <Route
            path="/percorso"
            element={<Screen title={it.path.title} text={it.path.comingSoon} />}
          />
          <Route
            path="/impostazioni"
            element={<Screen title={it.settings.title} text={it.settings.comingSoon} />}
          />
          <Route
            path="*"
            element={
              <Screen title={it.notFound.title} text={it.notFound.back} />
            }
          />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Navigazione principale">
        <NavLink to="/" end>
          {it.nav.home}
        </NavLink>
        <NavLink to="/percorso">{it.nav.path}</NavLink>
        <NavLink to="/impostazioni">{it.nav.settings}</NavLink>
      </nav>
    </div>
  );
}
