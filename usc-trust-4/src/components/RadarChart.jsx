import React, { useRef } from "react";
import { PILLARS, ratingFor } from "../data/framework.js";
import { svgToPNG } from "../engine/exporters.js";

// Signature element: a precise trust-profile gauge. Renders 1–N model overlays.
export default function RadarChart({ models, size = 360, showExport = true }) {
  const svgRef = useRef(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 54;
  const axes = PILLARS;
  const n = axes.length;
  const colors = ["#990000", "#1f7a4d", "#2b6cb0", "#b88a00", "#6b21a8"];

  const pointFor = (i, value) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (value / 100) * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const axisPoint = (i, mult = 1) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + R * mult * Math.cos(angle), cy + R * mult * Math.sin(angle)];
  };

  const rings = [25, 50, 75, 100];

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: "block", margin: "0 auto" }}>
        {/* rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes.map((_, i) => pointFor(i, ring).join(",")).join(" ")}
            fill="none"
            stroke={ring === 100 ? "#b9ae9b" : "#e3ddd0"}
            strokeWidth="1"
          />
        ))}
        {/* threshold ring at 76 (Excellent) */}
        <polygon
          points={axes.map((_, i) => pointFor(i, 76).join(",")).join(" ")}
          fill="none" stroke="#1f7a4d" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
        />
        {/* spokes + labels */}
        {axes.map((p, i) => {
          const [x, y] = axisPoint(i);
          const [lx, ly] = axisPoint(i, 1.2);
          return (
            <g key={p.id}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e3ddd0" strokeWidth="1" />
              <text
                x={lx} y={ly}
                textAnchor={Math.abs(lx - cx) < 6 ? "middle" : lx > cx ? "start" : "end"}
                dominantBaseline="middle"
                fontFamily="'IBM Plex Mono', monospace" fontSize="9.5" fill="#6b6357"
                letterSpacing="0.04em"
              >
                {p.short}
              </text>
            </g>
          );
        })}
        {/* model polygons */}
        {models.map((m, mi) => {
          const pts = axes.map((p, i) => pointFor(i, m.pillars[p.id]?.score ?? 0));
          const color = colors[mi % colors.length];
          return (
            <g key={m.model}>
              <polygon
                points={pts.map((pt) => pt.join(",")).join(" ")}
                fill={color} fillOpacity={models.length > 1 ? 0.1 : 0.16}
                stroke={color} strokeWidth="2"
              />
              {pts.map((pt, i) => (
                <circle key={i} cx={pt[0]} cy={pt[1]} r="2.6" fill={color} />
              ))}
            </g>
          );
        })}
        {/* ring labels */}
        {rings.map((ring) => {
          const [, y] = pointFor(0, ring);
          return (
            <text key={ring} x={cx + 3} y={y + 3} fontFamily="'IBM Plex Mono', monospace" fontSize="8" fill="#b9ae9b">
              {ring}
            </text>
          );
        })}
      </svg>
      {models.length > 1 && (
        <div className="row wrap" style={{ justifyContent: "center", gap: 16, marginTop: 8 }}>
          {models.map((m, mi) => (
            <span key={m.model} className="row" style={{ gap: 6, fontSize: 12.5 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: colors[mi % colors.length] }} />
              {m.model}
            </span>
          ))}
        </div>
      )}
      {showExport && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => svgToPNG(svgRef.current, "trust-profile.png")}>
            Export PNG
          </button>
        </div>
      )}
    </div>
  );
}
