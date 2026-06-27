import React from "react";
import { PUBLICATIONS, LAB, TEAM } from "../data/publications.js";

export function Research() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Research & publications</div>
          <h2>Papers behind the pillars</h2>
          <p>
            The framework is grounded in the lab's own reports and a curated set of references for each
            pillar — fact-checking systems, hallucination surveys, manipulation benchmarks, and crisis-response
            methodology.
          </p>
        </div>
        <div className="pub-grid">
          {PUBLICATIONS.map((p) => (
            <article key={p.title} className="pub-card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <span className="pill">{p.pillar}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.type} · {p.year}</span>
              </div>
              <h3 style={{ fontSize: 17, lineHeight: 1.25 }}>{p.title}</h3>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--cardinal)", margin: "6px 0 10px" }}>{p.authors}</div>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>{p.abstract}</p>
            </article>
          ))}
        </div>
        <style>{pubCSS}</style>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">About the lab</div>
          <h2>{LAB.longName}</h2>
          <p>{LAB.intersection}</p>
        </div>

        <div className="card card-pad" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 16, lineHeight: 1.6, margin: 0, fontFamily: "var(--serif)" }}>{LAB.thesis}</p>
        </div>

        <h3 style={{ fontSize: 20, margin: "8px 0 16px" }}>Three pillars of the mission</h3>
        <div className="mission-grid">
          {LAB.pillars3.map((m, i) => (
            <div key={m.title} className="mission-card">
              <div className="mono" style={{ fontSize: 12, color: "var(--gold-deep)", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
              <h4 style={{ fontSize: 16, margin: "6px 0 8px" }}>{m.title}</h4>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>{m.body}</p>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 20, margin: "40px 0 16px" }}>Team</h3>
        <div className="team-grid">
          {TEAM.map((t) => (
            <div key={t.name} className="team-card">
              <div className="team-avatar mono">{t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad" style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 16 }}>Contact</h3>
          <p className="muted" style={{ fontSize: 14, margin: "6px 0 0" }}>
            {LAB.facultyLead.name}, {LAB.facultyLead.role} · {LAB.affiliation} ·{" "}
            <a href={`mailto:${LAB.facultyLead.email}`}>{LAB.facultyLead.email}</a>
          </p>
        </div>
        <style>{pubCSS}</style>
      </div>
    </section>
  );
}

const pubCSS = `
.pub-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
.pub-card { background: var(--white); border: 1px solid var(--line); border-radius: 12px; padding: 22px;
  border-left: 3px solid var(--cardinal); transition: all .18s; }
.pub-card:hover { box-shadow: 0 14px 36px -26px rgba(153,0,0,0.5); }
.mission-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mission-card { background: var(--white); border: 1px solid var(--line); border-radius: 12px; padding: 22px; }
.team-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.team-card { display: flex; gap: 12px; align-items: center; background: var(--white); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px; }
.team-avatar { width: 40px; height: 40px; border-radius: 8px; background: var(--cardinal); color: var(--gold);
  display: grid; place-items: center; font-size: 13px; font-weight: 700; flex: none; }
@media (max-width: 860px) {
  .pub-grid, .mission-grid { grid-template-columns: 1fr; }
  .team-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
