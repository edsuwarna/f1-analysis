import React from 'react';
import { getCircuitLayout, type CircuitLayout } from '@/data/circuit-layouts';

interface CircuitMapProps {
  /** Circuit name to look up in layout data */
  circuitName: string;
  /** Optional CSS class override */
  className?: string;
}

function renderTrackPath(layout: CircuitLayout): string {
  const { path } = layout;
  if (path.length < 2) return '';

  // Build SVG path: smooth closed curve through waypoints
  // Using Catmull-Rom-like approach with cubic bezier
  let d = `M ${path[0].x} ${path[0].y}`;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[(i + 1) % path.length];

    // Midpoint control for smooth curves
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cpy1 = prev.y + (curr.y - prev.y) * 0.5;
    const cpx2 = curr.x - (next.x - prev.x) * 0.15;
    const cpy2 = curr.y - (next.y - prev.y) * 0.15;

    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }

  // Close the path smoothly
  const last = path[path.length - 1];
  const first = path[0];
  const second = path[1];
  d += ` C ${last.x + (first.x - last.x) * 0.5} ${last.y + (first.y - last.y) * 0.5}, ${first.x - (second.x - first.x) * 0.15} ${first.y - (second.y - first.y) * 0.15}, ${first.x} ${first.y}`;

  return d;
}

export default function CircuitMap({ circuitName, className = '' }: CircuitMapProps) {
  const layout = circuitName ? getCircuitLayout(circuitName) : undefined;

  if (!layout) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] ${className}`}
        style={{ minHeight: 200 }}>
        <div className="text-center p-4">
          {/* Stylized track placeholder */}
          <svg className="mx-auto mb-2" width="80" height="60" viewBox="0 0 80 60" fill="none"
            xmlns="http://www.w3.org/2000/svg" opacity="0.4">
            {/* Abstract track oval */}
            <rect x="5" y="10" width="70" height="40" rx="20" stroke="#e11d48" strokeWidth="1.5"
              fill="none" strokeDasharray="3, 3" />
            {/* S/F line */}
            <line x1="40" y1="10" x2="40" y2="18" stroke="#fff" strokeWidth="1.5" />
            {/* Start dot */}
            <circle cx="40" cy="30" r="2" fill="#e11d48" />
          </svg>
          <p className="text-sm text-muted-foreground">Map unavailable</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{circuitName}</p>
        </div>
      </div>
    );
  }

  const trackPath = renderTrackPath(layout);

  // Compute viewBox with padding
  const padding = 15;
  const allX = layout.path.map((p) => p.x);
  const allY = layout.path.map((p) => p.y);
  const minX = Math.min(...allX) - padding;
  const minY = Math.min(...allY) - padding;
  const maxX = Math.max(...allX) + padding;
  const maxY = Math.max(...allY) + padding;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  const sf = layout.sf;
  const direction = layout.direction;

  return (
    <div className={`rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] overflow-hidden ${className}`}>
      <svg viewBox={viewBox} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg"
        role="img" aria-label={`Circuit map of ${layout.name}`}>
        {/* Track fill */}
        <path
          d={trackPath}
          fill="none"
          stroke="#2a2a4a"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Track border (outside) */}
        <path
          d={trackPath}
          fill="none"
          stroke="#3a3a5a"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
        {/* Track center line */}
        <path
          d={trackPath}
          fill="none"
          stroke="#4a4a7a"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3, 6"
          opacity="0.4"
        />

        {/* Start/Finish line */}
        <g>
          <rect
            x={sf.x - 2}
            y={sf.y - 8}
            width="4"
            height="16"
            fill="#fff"
            opacity="0.8"
            rx="1"
          />
          {/* Checkered pattern */}
          <rect
            x={sf.x - 5}
            y={sf.y - 10}
            width="10"
            height="20"
            fill="none"
            stroke="#f1f1f1"
            strokeWidth="2"
            strokeDasharray="3, 3"
            opacity="0.6"
            rx="1"
          />
          <text
            x={sf.x}
            y={sf.y + (direction === 'cw' ? -15 : 22)}
            textAnchor="middle"
            fill="#888"
            fontSize="7"
            fontFamily="monospace"
          >
            S/F
          </text>
        </g>

        {/* Corner numbers */}
        {layout.corners.map((corner, i) => (
          <g key={i}>
            <circle
              cx={corner.x}
              cy={corner.y}
              r="6"
              fill="#1a1a2e"
              stroke="#e11d48"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <text
              x={corner.x}
              y={corner.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#e11d48"
              fontSize="6"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {corner.n}
            </text>
          </g>
        ))}

        {/* Direction arrow (optional subtle indicator) */}
        {layout.path.length > 2 && (
          <g opacity="0.3">
            <path
              d={(() => {
                // Find the start/finish area
                const p0 = layout.path[0];
                const p1 = layout.path[2];
                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 1) return '';
                // Arrow at 20% along
                const t = 0.2;
                const ax = p0.x + dx * t;
                const ay = p0.y + dy * t;
                const an = Math.atan2(dy, dx);
                const size = 6;
                return `M ${ax} ${ay} L ${ax - size * Math.cos(an - 0.5)} ${ay - size * Math.sin(an - 0.5)} L ${ax - size * Math.cos(an + 0.5)} ${ay - size * Math.sin(an + 0.5)} Z`;
              })()}
              fill="#e11d48"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
