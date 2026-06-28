import React, { useState, useEffect } from "react";
import "./styles/app.css";
import Home from "./pages/Home.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Runner from "./pages/Runner.jsx";
import Framework from "./pages/Framework.jsx";
import { Research, About } from "./pages/ResearchAbout.jsx";
import { AppStateProvider } from "./state/AppState.jsx";

const PAGES = [
  { id: "home", label: "Home" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "runner", label: "Evaluation Runner" },
  { id: "framework", label: "Framework" },
  { id: "research", label: "Research" },
  { id: "about", label: "About" },
];

export default function App() {
  const [page, setPage] = useState("home");
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  return (
    <AppStateProvider>
      <nav className="nav">
        <div className="container nav-inner">
          <button className="brand" onClick={() => setPage("home")} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span className="brand-mark">T</span>
            <span>USC AI Trust Lab</span>
          </button>
          <div className="nav-links">
            {PAGES.map((p) => (
              <button key={p.id} className={page === p.id ? "active" : ""} onClick={() => setPage(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {page === "home" && <Home go={setPage} />}
        {page === "leaderboard" && <Leaderboard />}
        {page === "runner" && <Runner go={setPage} />}
        {page === "framework" && <Framework />}
        {page === "research" && <Research />}
        {page === "about" && <About />}
      </main>

      <footer className="footer">
        <div className="container row wrap" style={{ justifyContent: "space-between", gap: 12 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>
            USC AI Trust Lab · 8-Pillar Trust Evaluations · {new Date().getFullYear()}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>
            Live evaluation · bring your own API key
          </span>
        </div>
      </footer>

      <style>{`.footer { border-top: 1px solid var(--line); padding: 28px 0; margin-top: 20px; background: var(--paper-dim); }`}</style>
    </AppStateProvider>
  );
}
