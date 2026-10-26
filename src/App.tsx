import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { HomeScreen } from "./features/home/HomeScreen";
import { LessonScreen } from "./features/lesson/LessonScreen";
import { PathScreen } from "./features/path/PathScreen";
import { UnitScreen } from "./features/path/UnitScreen";
import { QuizScreen } from "./features/quiz/QuizScreen";
import { it } from "./i18n/it";

function Screen({ title, text }: { title: string; text: string }) {
  return (
    <section className="screen">
      <h1>{title}</h1>
      <p className="muted">{text}</p>
    </section>
  );
}

// Lessons and quizzes take the whole screen, without the tab bar.
const FOCUS_ROUTES = /^\/(lezione|quiz)\//;

export function App() {
  const { pathname } = useLocation();
  const focus = FOCUS_ROUTES.test(pathname);

  return (
    <div className="shell">
      <main className="content">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/percorso" element={<PathScreen />} />
          <Route path="/percorso/:unitId" element={<UnitScreen />} />
          <Route path="/lezione/:batchId" element={<LessonScreen />} />
          <Route path="/quiz/:batchId" element={<QuizScreen />} />
          <Route
            path="/impostazioni"
            element={<Screen title={it.settings.title} text={it.settings.comingSoon} />}
          />
          <Route path="*" element={<Screen title={it.notFound.title} text={it.notFound.back} />} />
        </Routes>
      </main>
      {!focus && (
        <nav className="tabbar" aria-label="Navigazione principale">
          <NavLink to="/" end>
            {it.nav.home}
          </NavLink>
          <NavLink to="/percorso">{it.nav.path}</NavLink>
          <NavLink to="/impostazioni">{it.nav.settings}</NavLink>
        </nav>
      )}
    </div>
  );
}
