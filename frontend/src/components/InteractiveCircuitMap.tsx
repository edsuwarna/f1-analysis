import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Types ──
interface MultiviewerData {
  circuit_key: number;
  circuit_name: string;
  x: number[];
  y: number[];
  corners: Array<{
    number: number;
    angle: number;
    x: number;
    y: number;
  }>;
  mini_sectors: number[];
  rotation: number;
}

interface InteractiveCircuitMapProps {
  /** Circuit short name (e.g. 'Sakhir', 'Melbourne', 'Monte Carlo') */
  circuitName: string;
  /** Fallback image URL when Multiviewer unavailable */
  circuitImage?: string;
  className?: string;
  year?: number;
}

// ── Cache for Multiviewer circuit list (name → key mapping) ──
let circuitKeyCache: Record<string, number> | null = null;
let circuitKeyLoading: Promise<Record<string, number>> | null = null;

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function loadCircuitKeyMap(): Promise<Record<string, number>> {
  if (circuitKeyCache) return circuitKeyCache;
  if (circuitKeyLoading) return circuitKeyLoading;

  circuitKeyLoading = (async () => {
    try {
      const res = await fetch(`${API_BASE}/circuits`);
      const data: Record<string, { name: string }> = await res.json();
      const map: Record<string, number> = {};
      for (const [keyStr, info] of Object.entries(data)) {
        map[info.name.toLowerCase()] = parseInt(keyStr);
      }
      circuitKeyCache = map;
      return map;
    } catch {
      circuitKeyCache = {};
      return {};
    }
  })();

  return circuitKeyLoading;
}

function getCircuitKey(name: string, circuitMap: Record<string, number>): number | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  // Direct match
  if (circuitMap[lower]) return circuitMap[lower];
  // Partial match (e.g. "Monte Carlo" → "monte carlo")
  for (const [key, val] of Object.entries(circuitMap)) {
    if (key.includes(lower) || lower.includes(key)) return val;
  }
  return null;
}

// ── Sector colors ──
const SECTOR_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1'];

export default function InteractiveCircuitMap({
  circuitName,
  circuitImage,
  className = '',
  year = 2026,
}: InteractiveCircuitMapProps) {
  const [data, setData] = useState<MultiviewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
  const [tooltipCorner, setTooltipCorner] = useState<MultiviewerData['corners'][0] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const fetchMap = useCallback(async () => {
    if (!circuitName) {
      setLoading(false);
      setError('No circuit name');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      // 1. Get circuit key mapping
      const keyMap = await loadCircuitKeyMap();
      const circuitKey = getCircuitKey(circuitName, keyMap);

      if (!circuitKey) {
        throw new Error('Circuit not found in Multiviewer');
      }

      // 2. Fetch track data via backend proxy
      const res = await fetch(
        `${API_BASE}/circuits/${circuitKey}/multiviewer?year=${year}`
      );

      if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'API error');

      const raw = await res.json();

      setData({
        circuit_key: raw.circuit_key,
        circuit_name: raw.circuit_name,
        x: raw.x || [],
        y: raw.y || [],
        corners: (raw.corners || [])
          .filter((c: any) => c.x != null && c.y != null)
          .map((c: any) => ({
            number: c.number,
            angle: c.angle || 0,
            x: c.x,
            y: c.y,
          })),
        mini_sectors: raw.mini_sectors || [],
        rotation: raw.rotation || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [circuitName, year]);

  useEffect(() => {
    fetchMap();
  }, [fetchMap]);

  // ── Loading ──
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] ${className}`}
        style={{ minHeight: 200 }}
      >
        <div className="text-center p-4">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading circuit map...</p>
        </div>
      </div>
    );
  }

  // ── Fallback: circuit_image ──
  if (!data || error) {
    if (circuitImage) {
      return (
        <div className={`rounded-lg border border-border bg-muted/30 overflow-hidden ${className}`}>
          <img
            src={circuitImage}
            alt={`${circuitName} circuit`}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
          {error && (
            <p className="text-xs text-muted-foreground/50 text-center pb-1">
              Interactive map unavailable — showing official track icon
            </p>
          )}
        </div>
      );
    }

    // Minimal fallback placeholder
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] ${className}`}
        style={{ minHeight: 200 }}
      >
        <div className="text-center p-4">
          <svg className="mx-auto mb-2" width="80" height="60" viewBox="0 0 80 60" fill="none" opacity="0.4">
            <rect x="5" y="10" width="70" height="40" rx="20" stroke="#e11d48" strokeWidth="1.5" fill="none" strokeDasharray="3, 3" />
            <line x1="40" y1="10" x2="40" y2="18" stroke="#fff" strokeWidth="1.5" />
            <circle cx="40" cy="30" r="2" fill="#e11d48" />
          </svg>
          <p className="text-sm text-muted-foreground">Map unavailable</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{circuitName || 'Unknown'}</p>
        </div>
      </div>
    );
  }

  // ── Render track ──
  const { x, y, corners, mini_sectors: miniSectors } = data;
  const n = x.length;
  if (n < 2) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] ${className}`} style={{ minHeight: 200 }}>
        <p className="text-sm text-muted-foreground">Insufficient track data</p>
      </div>
    );
  }

  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const trackW = maxX - minX;
  const trackH = maxY - minY;
  const viewSize = Math.max(trackW, trackH);
  const pad = 40;
  const svgSize = 420;
  const scale = (svgSize - pad * 2) / viewSize;

  const nx = (v: number) =>
    pad + (v - minX) * scale + (svgSize - trackW * scale) / 2 - pad;
  const ny = (v: number) =>
    pad + (maxY - v) * scale + (svgSize - trackH * scale) / 2 - pad;

  // Full track outline
  const pts = x.map((xi, i) => `${nx(xi)},${ny(y[i])}`);
  const fullPath = 'M ' + pts.join(' L ');

  // 3 sectors
  const s1End = Math.floor(n / 3);
  const s2End = Math.floor((n * 2) / 3);
  const sectorDefs = [
    { name: 'SECTOR 1', start: 0, end: s1End, color: SECTOR_COLORS[0] },
    { name: 'SECTOR 2', start: s1End, end: s2End, color: SECTOR_COLORS[1] },
    { name: 'SECTOR 3', start: s2End, end: n, color: SECTOR_COLORS[2] },
  ];

  // Sector boundary dots (from miniSectors)
  const boundaryDots = (miniSectors || [])
    .filter((idx: number) => idx > 0 && idx < n)
    .map((idx: number) => ({ px: nx(x[idx]), py: ny(y[idx]) }));

  // Corner positions (with filtered duplicates)
  const cornerPositions = corners
    .filter((c) => c.x != null && c.y != null)
    .map((c) => ({ ...c, px: nx(c.x), py: ny(c.y) }));

  const handleCornerClick = (num: number) => {
    setSelectedCorner(selectedCorner === num ? null : num);
  };

  const getCornerType = (angle: number) => {
    const a = Math.abs(angle);
    if (a < 60) return 'Hairpin';
    if (a < 90) return 'Tight';
    if (a < 150) return 'Medium';
    if (a < 250) return 'Sweeping';
    return 'Long';
  };

  return (
    <TooltipProvider>
      <div className={`rounded-lg border border-border bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a] overflow-hidden ${className}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Interactive circuit map of ${data.circuit_name || circuitName}`}
        >
          {/* Track background */}
          <path d={fullPath} fill="none" stroke="#1a1a3e" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <path d={fullPath} fill="none" stroke="#252545" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />

          {/* Sector paths */}
          {sectorDefs.map((s) => {
            const sp = [];
            for (let i = s.start; i < s.end && i < n; i++) sp.push(`${nx(x[i])},${ny(y[i])}`);
            if (sp.length < 2) return null;
            return (
              <path
                key={s.name}
                d={'M ' + sp.join(' L ')}
                fill="none"
                stroke={s.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            );
          })}

          {/* Sector boundary dots */}
          {boundaryDots.map((p, i) => (
            <circle key={`sb-${i}`} cx={p.px} cy={p.py} r="4" fill="#ffd93d" opacity="0.6" />
          ))}

          {/* Sector labels */}
          {sectorDefs.map((s) => {
            const mid = Math.floor((s.start + s.end) / 2);
            if (mid >= n) return null;
            return (
              <g key={`sl-${s.name}`}>
                <rect x={nx(x[mid]) - 34} y={ny(y[mid]) - 18} width="68" height="15" rx="3" fill="#0a0a1a" opacity="0.75" />
                <text
                  x={nx(x[mid])}
                  y={ny(y[mid]) - 7}
                  textAnchor="middle"
                  fill={s.color}
                  fontSize="8"
                  fontFamily="Arial, sans-serif"
                  fontWeight="bold"
                >
                  {s.name}
                </text>
              </g>
            );
          })}

          {/* Interactive corners */}
          {cornerPositions.map((c) => (
            <g key={`c-${c.number}`}>
              {/* Invisible hover/click area */}
              <circle
                cx={c.px}
                cy={c.py}
                r="15"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltipCorner(c);
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: ((c.px + 15) / svgSize) * rect.width,
                      y: ((c.py - 15) / svgSize) * rect.height,
                    });
                  }
                }}
                onMouseLeave={() => setTooltipCorner(null)}
                onClick={() => handleCornerClick(c.number)}
              />
              {/* Corner marker */}
              <circle
                cx={c.px}
                cy={c.py}
                r="8"
                fill={selectedCorner === c.number ? '#ffd93d' : '#1a1a2e'}
                stroke={selectedCorner === c.number ? '#ff6b6b' : '#ffd93d'}
                strokeWidth="1.5"
                className="transition-colors duration-150"
                style={{ cursor: 'pointer' }}
              />
              <text
                x={c.px}
                y={c.py + 3}
                textAnchor="middle"
                fill={selectedCorner === c.number ? '#1a1a2e' : '#ffd93d'}
                fontSize="7"
                fontFamily="Arial"
                fontWeight="bold"
                pointerEvents="none"
              >
                {c.number}
              </text>
            </g>
          ))}

          {/* Start/Finish */}
          <rect x={nx(x[0]) - 3} y={ny(y[0]) - 3} width="6" height="6" fill="white" rx="1" />
          <text x={nx(x[0])} y={ny(y[0]) - 10} textAnchor="middle" fill="white" fontSize="6" fontFamily="Arial" fontWeight="bold">S/F</text>

          {/* Legend */}
          <g>
            <rect x="295" y="393" width="115" height="25" rx="4" fill="#0a0a1a" opacity="0.8" />
            {SECTOR_COLORS.map((color, i) => (
              <g key={`leg-${i}`}>
                <rect x={300 + i * 36} y={398} width="9" height="9" rx="2" fill={color} />
                <text x={312 + i * 36} y={406} fill="#aaa" fontSize="8" fontFamily="Arial">S{i + 1}</text>
              </g>
            ))}
          </g>

          {/* Selected corner detail */}
          {selectedCorner && (() => {
            const c = cornerPositions.find((cp) => cp.number === selectedCorner);
            if (!c) return null;
            return (
              <g>
                <rect x="10" y="388" width="150" height="30" rx="4" fill="#0a0a1a" opacity="0.9" />
                <text x="16" y="401" fill="#ffd93d" fontSize="9" fontFamily="Arial" fontWeight="bold">T{c.number}</text>
                <text x="16" y="413" fill="#aaa" fontSize="8" fontFamily="Arial">
                  Angle: {Math.abs(c.angle).toFixed(0)}° · {getCornerType(c.angle)}
                </text>
              </g>
            );
          })()}
        </svg>

        <p className="text-center text-[10px] text-muted-foreground/50 pb-1">
          {data.circuit_name || circuitName} · {corners.length} corners · 3 sectors
        </p>
      </div>
    </TooltipProvider>
  );
}
