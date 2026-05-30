import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMeeting, getSessions, getSessionDrivers, getLaps, getPitStops,
  getWeather, getRaceControl, getStints, getTelemetryLap,
  getSessionSectors, getPitStrategy, getOvertakeMode, getQualifyingSummary,
  getLapDistribution, getMeetingCircuit, getPositionHistory,
  getSessionGaps, getSpeedTraps, getBrakingAnalysis,
  getCornerAnalysis, getGearAnalysis,
  type Meeting, type Session, type SessionDriver, type Lap,
  type PitStop, type Weather, type RaceControl, type Stint,
  type TelemetrySample, type SessionSectorRow,
  type PitStrategyData, type OvertakeModeData, type QualifyingSummaryData,
  type LapDistributionData, type CircuitInfoData,
  type PositionHistoryData, type GapTimelineData,
  type SpeedTrapData, type BrakingData, type CornerData, type GearData,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor, formatTime, flagEmoji } from '@/lib/formatters';
import {
  ArrowLeft, Clock, Gauge, Thermometer, Flag, Radio,
  Swords, Zap, BarChart3, Radar, TrendingUp,
  ChevronDown, CircuitBoard, Activity, GitCompare,
  Download, ExternalLink, Trophy, RefreshCw,
} from 'lucide-react';
import CircuitMap from '@/components/CircuitMap';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Constants ──
const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#e11d48', MEDIUM: '#eab308', HARD: '#6b7280',
  INTERMEDIATE: '#22c55e', WET: '#3b82f6',
};

function tyreBadgeColor(compound?: string) {
  const c = compound?.toUpperCase() || '';
  if (c.includes('SOFT')) return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (c.includes('MEDIUM')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  if (c.includes('HARD')) return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  if (c.includes('INTER')) return 'bg-green-500/10 text-green-500 border-green-500/30';
  if (c.includes('WET')) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  return '';
}

const SESSION_EMOJIS: Record<string, string> = {
  Race: '🏁', Qualifying: '⏱️', Practice: '🔧', Sprint: '🏁',
  SprintQualifying: '⏱️',
};

// ── Collapsible Card Component ──
function CardSection({ title, subtitle, summary, icon, defaultOpen = false, children, className = '' }: {
  title: string; subtitle?: string; summary?: React.ReactNode; icon?: React.ReactNode;
  defaultOpen?: boolean; children: React.ReactNode; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-center justify-between cursor-select" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 truncate">
              {title}
            </h3>
            {!open && summary ? (
              <p className="text-xs text-muted-foreground/80 truncate">{summary}</p>
            ) : subtitle ? (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  );
}

// ── Load-On-Demand Card ──
function LoadableCard({ title, subtitle, summary, icon, loading, loaded, onLoad, children, isAvailable = true }: {
  title: string; subtitle?: string; summary?: React.ReactNode; icon?: React.ReactNode;
  loading: boolean; loaded: boolean; onLoad: () => void;
  children: React.ReactNode; isAvailable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={`p-5 ${!isAvailable ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            {!open && summary ? (
              <p className="text-xs text-muted-foreground/80">{summary}</p>
            ) : subtitle ? (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="mt-4">
          {!isAvailable ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Only available for Race/Sprint sessions</p>
          ) : !loaded ? (
            <div className="text-center py-6">
              <button onClick={(e) => { e.stopPropagation(); onLoad(); }}
                className="bg-f1-red text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition flex items-center gap-2 mx-auto">
                {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Loading...</> : <><BarChart3 className="h-4 w-4" /> Load {title}</>}
              </button>
              {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
            </div>
          ) : loading ? (
            <div className="text-center py-6 text-muted-foreground text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </Card>
  );
}

// ── Simple Bar Chart Component (inline SVG bars) ──
function BarChart({ data, maxValue, color, height = 20, label }: {
  data: { key: string; value: number }[]; maxValue: number;
  color: string | ((v: number) => string); height?: number; label?: string;
}) {
  const getColor = typeof color === 'function' ? color : () => color;
  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {data.map(d => (
        <div key={d.key} className="flex items-center gap-2">
          <span className="w-16 text-xs text-right shrink-0 text-muted-foreground">{d.key}</span>
          <div className="flex-1 bg-secondary rounded-full overflow-hidden" style={{ height }}>
            <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1 text-[9px] font-bold text-white"
              style={{ width: `${Math.max((d.value / maxValue) * 100, 2)}%`, background: getColor(d.value) }}>
              {d.value > maxValue * 0.15 ? d.value : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Merge cell helpers ──
function DriverCell({ acronym, colour }: { acronym: string; colour?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(colour) }} />
      <span className="font-medium">{acronym}</span>
    </span>
  );
}

// ================================================================
// MAIN COMPONENT
// ================================================================
export default function SessionDetailPage() {
  const { meetingId, sessionId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [pits, setPits] = useState<PitStop[]>([]);
  const [weather, setWeather] = useState<Weather[]>([]);
  const [raceControl, setRaceControl] = useState<RaceControl[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [sectors, setSectors] = useState<SessionSectorRow[]>([]);
  const [pitStrategy, setPitStrategy] = useState<PitStrategyData | null>(null);
  const [overtakeMode, setOvertakeMode] = useState<OvertakeModeData | null>(null);
  const [qualifying, setQualifying] = useState<QualifyingSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetrySample[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Load-on-demand states
  const [circuitInfo, setCircuitInfo] = useState<CircuitInfoData | null>(null);
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitLoaded, setCircuitLoaded] = useState(false);

  // Driver comparison
  const [compDrv1, setCompDrv1] = useState<number>(0);
  const [compDrv2, setCompDrv2] = useState<number>(0);

  const numMeetingId = parseInt(meetingId || '0');
  const numSessionId = parseInt(sessionId || '0');

  // ── Primary data load ──
  useEffect(() => {
    async function load() {
      if (!meetingId || !sessionId) return;
      setLoading(true);
      try {
        const sessionIdNum = parseInt(sessionId);
        const meetingIdNum = parseInt(meetingId);

        const [m, sessionsList, d, l, p, w, rc, st, sec] = await Promise.all([
          getMeeting(meetingIdNum),
          getSessions(meetingIdNum),
          getSessionDrivers(sessionIdNum),
          getLaps(sessionIdNum),
          getPitStops(sessionIdNum),
          getWeather(sessionIdNum),
          getRaceControl(sessionIdNum),
          getStints(sessionIdNum),
          getSessionSectors(sessionIdNum).catch(() => [] as SessionSectorRow[]),
        ]);

        setMeeting(m);
        setSession(sessionsList.find(s => s.id === sessionIdNum) || null);
        setDrivers(d);
        setLaps(l);
        setPits(p);
        setWeather(w);
        setRaceControl(rc);
        setStints(st);
        setSectors(sec);

        // Set default driver comparison
        if (d.length >= 2) {
          setCompDrv1(d[0].driver_number);
          setCompDrv2(d[1].driver_number);
        }

        const sessType = (sessionsList.find(s => s.id === sessionIdNum)?.session_type || '').toLowerCase();
        const isRaceOrSprint = sessType.includes('race') || sessType.includes('sprint');
        const isQualifying = sessType.includes('qualify');

        const promises: Promise<any>[] = [];
        let ps: Promise<any> | null = null;
        let om: Promise<any> | null = null;
        let qs: Promise<any> | null = null;

        if (isRaceOrSprint) {
          ps = getPitStrategy(sessionIdNum).catch(() => null);
          om = getOvertakeMode(sessionIdNum).catch(() => null);
        }
        if (isQualifying) {
          qs = getQualifyingSummary(meetingIdNum).catch(() => null);
        }

        const results = await Promise.all([ps, om, qs].filter(Boolean));
        let ri = 0;
        if (isRaceOrSprint) {
          setPitStrategy(results[ri++] as PitStrategyData);
          setOvertakeMode(results[ri++] as OvertakeModeData);
        }
        if (isQualifying) {
          setQualifying(results[ri] as QualifyingSummaryData);
        }
      } catch (e) {
        console.error('Session load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId, sessionId]);

  // Telemetry on driver select
  useEffect(() => {
    if (!selectedDriver || !sessionId) return;
    setTelemetryLoading(true);
    getTelemetryLap(numSessionId, selectedDriver)
      .then(setTelemetry)
      .catch(() => setTelemetry([]))
      .finally(() => setTelemetryLoading(false));
  }, [selectedDriver, sessionId, numSessionId]);

  // ── Derived data ──
  const driverMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]));
  const sessType = (session?.session_type || '').toLowerCase();
  const isRaceSprint = sessType.includes('race') || sessType.includes('sprint');
  const isQualifying = sessType.includes('qualify');

  const stintsByDriver = useMemo(() => {
    const map: Map<number, Stint[]> = new Map();
    for (const s of stints) {
      if (!map.has(s.driver_number)) map.set(s.driver_number, []);
      map.get(s.driver_number)!.push(s);
    }
    return map;
  }, [stints]);

  const maxStintLap = useMemo(() => {
    let max = 0;
    try {
      for (const sts of stintsByDriver.values()) {
        for (const s of sts) {
          if (s.lap_end > max) max = s.lap_end;
          if (s.lap_start > max) max = s.lap_start;
        }
      }
    } catch {}
    return Math.max(max, laps.reduce((mx, l) => Math.max(mx, l.lap_number || 0), 0));
  }, [stintsByDriver, laps]);

  const qualiDrivers = qualifying?.drivers || [];
  const qualiSegments = qualifying?.segments || [];
  const pitStrategyDrivers = pitStrategy?.drivers || [];
  const undercutOpps = pitStrategy?.undercut_opportunities || [];
  const omDrivers = overtakeMode?.drivers || [];
  const topOm = [...omDrivers].sort((a, b) => b.om_percentage - a.om_percentage);

  // ── Load-on-demand handlers ──
  const [posHistory, setPosHistory] = useState<PositionHistoryData | null>(null);
  const [posLoading, setPosLoading] = useState(false);
  const [posLoaded, setPosLoaded] = useState(false);
  const loadPosHistory = useCallback(async () => {
    setPosLoading(true);
    try {
      const data = await getPositionHistory(numSessionId);
      setPosHistory(data);
      if (data?.timeline?.length) {
        const drvs: Record<string, { acronym: string; team_colour: string; driver_number: number }> = {};
        for (const e of data.timeline) {
          if (!drvs[e.driver_number]) {
            drvs[e.driver_number] = { acronym: e.acronym, team_colour: e.team_colour, driver_number: e.driver_number };
          }
        }
        setPosDrivers(drvs);
        setSelectedPosDrivers(new Set(Object.keys(drvs).map(Number)));
      }
    }
    catch { setPosHistory(null); }
    finally { setPosLoading(false); setPosLoaded(true); }
  }, [numSessionId]);

  const [gaps, setGaps] = useState<GapTimelineData | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsLoaded, setGapsLoaded] = useState(false);
  const loadGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const data = await getSessionGaps(numSessionId);
      setGaps(data);
      if (data?.timeline?.length) {
        const drvs: Record<string, { acronym: string; team_colour: string; driver_number: number }> = {};
        for (const g of data.timeline) {
          if (g.driver_number && !drvs[g.driver_number]) {
            drvs[g.driver_number] = { acronym: g.acronym || `#${g.driver_number}`, team_colour: g.team_colour || '#666', driver_number: g.driver_number };
          }
        }
        setGapDrivers(drvs);
        setSelectedGapDrivers(new Set(Object.keys(drvs).map(Number)));
      }
    }
    catch { setGaps(null); }
    finally { setGapsLoading(false); setGapsLoaded(true); }
  }, [numSessionId]);

  const [lapDist, setLapDist] = useState<LapDistributionData | null>(null);
  const [lapDistLoading, setLapDistLoading] = useState(false);
  const [lapDistLoaded, setLapDistLoaded] = useState(false);
  const loadLapDist = useCallback(async () => {
    setLapDistLoading(true);
    try { setLapDist(await getLapDistribution(numSessionId)); }
    catch { setLapDist(null); }
    finally { setLapDistLoading(false); setLapDistLoaded(true); }
  }, [numSessionId]);

  const [speeds, setSpeeds] = useState<SpeedTrapData | null>(null);
  const [speedsLoading, setSpeedsLoading] = useState(false);
  const [speedsLoaded, setSpeedsLoaded] = useState(false);
  const loadSpeeds = useCallback(async () => {
    setSpeedsLoading(true);
    try { setSpeeds(await getSpeedTraps(numSessionId)); }
    catch { setSpeeds(null); }
    finally { setSpeedsLoading(false); setSpeedsLoaded(true); }
  }, [numSessionId]);

  const [braking, setBraking] = useState<BrakingData | null>(null);
  const [brakingLoading, setBrakingLoading] = useState(false);
  const [brakingLoaded, setBrakingLoaded] = useState(false);
  const loadBraking = useCallback(async () => {
    setBrakingLoading(true);
    try { setBraking(await getBrakingAnalysis(numSessionId)); }
    catch { setBraking(null); }
    finally { setBrakingLoading(false); setBrakingLoaded(true); }
  }, [numSessionId]);

  const [corner, setCorner] = useState<CornerData | null>(null);
  const [cornerLoading, setCornerLoading] = useState(false);
  const [cornerLoaded, setCornerLoaded] = useState(false);
  const loadCorner = useCallback(async () => {
    setCornerLoading(true);
    try { setCorner(await getCornerAnalysis(numSessionId)); }
    catch { setCorner(null); }
    finally { setCornerLoading(false); setCornerLoaded(true); }
  }, [numSessionId]);

  const [gear, setGear] = useState<GearData | null>(null);
  const [gearLoading, setGearLoading] = useState(false);
  const [gearLoaded, setGearLoaded] = useState(false);
  const loadGear = useCallback(async () => {
    setGearLoading(true);
    try { setGear(await getGearAnalysis(numSessionId)); }
    catch { setGear(null); }
    finally { setGearLoading(false); setGearLoaded(true); }
  }, [numSessionId]);

  const [circuitLoadingTrigger, setCircuitLoadingTrigger] = useState(false);
  const loadCircuit = useCallback(async () => {
    setCircuitLoading(true);
    setCircuitLoadingTrigger(true);
    try {
      const data = await getMeetingCircuit(numMeetingId);
      setCircuitInfo(data);
      setCircuitLoaded(true);
    } catch { setCircuitInfo(null); }
    finally { setCircuitLoading(false); }
  }, [numMeetingId]);
  // Auto-load circuit on mount
  useEffect(() => { loadCircuit(); }, [loadCircuit]);

  // ── Position History driver toggle ──
  const [selectedPosDrivers, setSelectedPosDrivers] = useState<Set<number>>(new Set());
  const [posDrivers, setPosDrivers] = useState<Record<string, { acronym: string; team_colour: string; driver_number: number }>>({});
  // All drivers toggle helper
  const togglePosDriver = (dn: number) => {
    setSelectedPosDrivers(prev => {
      const next = new Set(prev);
      if (next.has(dn)) next.delete(dn); else next.add(dn);
      return next;
    });
  };
  const selectAllPosDrivers = () => {
    setSelectedPosDrivers(new Set(Object.keys(posDrivers).map(Number)));
  };
  const clearAllPosDrivers = () => {
    setSelectedPosDrivers(new Set());
  };

  // ── Gap Timeline driver toggle ──
  const [selectedGapDrivers, setSelectedGapDrivers] = useState<Set<number>>(new Set());
  const [gapDrivers, setGapDrivers] = useState<Record<string, { acronym: string; team_colour: string; driver_number: number }>>({});
  const toggleGapDriver = (dn: number) => {
    setSelectedGapDrivers(prev => {
      const next = new Set(prev);
      if (next.has(dn)) next.delete(dn); else next.add(dn);
      return next;
    });
  };
  const selectAllGapDrivers = () => {
    setSelectedGapDrivers(new Set(Object.keys(gapDrivers).map(Number)));
  };
  const clearAllGapDrivers = () => {
    setSelectedGapDrivers(new Set());
  };
  const [overtakeData, setOvertakeData] = useState<any>(null);
  const [overtakeLoading, setOvertakeLoading] = useState(false);
  const [overtakeLoaded, setOvertakeLoaded] = useState(false);
  const loadOvertakeAnalysis = useCallback(async () => {
    setOvertakeLoading(true);
    try {
      const data = await getPositionHistory(numSessionId);
      if (data?.timeline?.length) {
        const byDriver: Record<number, any> = {};
        const driverMeta: Record<number, any> = {};
        for (const entry of data.timeline) {
          if (!byDriver[entry.driver_number]) {
            byDriver[entry.driver_number] = [];
            driverMeta[entry.driver_number] = { acronym: entry.acronym, team_colour: entry.team_colour };
          }
          byDriver[entry.driver_number].push(entry);
        }
        const totalOvertakes: Record<number, any> = {};
        for (const [dn, entries] of Object.entries(byDriver)) {
          const sorted = (entries as any[]).sort((a, b) => a.lap - b.lap);
          let prevPos: number | null = null;
          let gained = 0, lost = 0;
          for (const e of sorted) {
            if (e.position && prevPos !== null) {
              if (e.position < prevPos) gained += prevPos - e.position;
              else if (e.position > prevPos) lost += e.position - prevPos;
            }
            if (e.position) prevPos = e.position;
          }
          totalOvertakes[parseInt(dn)] = { gained, lost, net: gained - lost, ...driverMeta[parseInt(dn)] };
        }
        setOvertakeData(totalOvertakes);
      }
    } catch { setOvertakeData(null); }
    finally { setOvertakeLoading(false); setOvertakeLoaded(true); }
  }, [numSessionId]);

  // ── Pit Stops by Driver (for window timeline) ──
  const pitsByDriver = useMemo(() => {
    const map: Record<number, PitStop[]> = {};
    for (const p of pits) {
      if (!map[p.driver_number]) map[p.driver_number] = [];
      map[p.driver_number].push(p);
    }
    return map;
  }, [pits]);
  const pitMaxLap = pits.length ? Math.max(...pits.map(p => p.lap_number)) : 1;

  // ── Compare drivers ──
  const [compResult, setCompResult] = useState<{ drv1: number; drv2: number; laps1: Lap[]; laps2: Lap[] } | null>(null);
  const doCompare = useCallback(() => {
    const l1 = laps.filter(l => l.driver_number === compDrv1 && l.lap_duration && !l.is_pit_in_lap && !l.is_pit_out_lap);
    const l2 = laps.filter(l => l.driver_number === compDrv2 && l.lap_duration && !l.is_pit_in_lap && !l.is_pit_out_lap);
    setCompResult({ drv1: compDrv1, drv2: compDrv2, laps1: l1, laps2: l2 });
  }, [compDrv1, compDrv2, laps]);

  // ── Tyre Degradation ──
  const [degDrv1, setDegDrv1] = useState(0);
  const [degDrv2, setDegDrv2] = useState(0);
  const [degData, setDegData] = useState<{
    drv1: number; drv2: number;
    points: { lap: number; drv1: number | null; drv2: number | null }[];
    stints: {
      drv1: { stintIndex: number; compound: string; laps: number; startLap: number; endLap: number; avgTime: number; degPerLap: number }[];
      drv2: { stintIndex: number; compound: string; laps: number; startLap: number; endLap: number; avgTime: number; degPerLap: number }[];
    };
  } | null>(null);
  const [degLoading, setDegLoading] = useState(false);
  const [degOpen, setDegOpen] = useState(false);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  // Read current selected driver numbers directly at call time
  function loadDegradation() {
    const d1 = degDrv1 || drivers[0]?.driver_number || 0;
    const d2 = degDrv2 || (drivers.length > 1 ? drivers[1]?.driver_number || 0 : 0);
    if (!d1 || !d2) return;
    setDegLoading(true);
    // Group laps by stint for each driver
    const processDriver = (dn: number) => {
      const driverLaps = laps
        .filter(l => l.driver_number === dn && l.lap_duration && !l.is_pit_in_lap && !l.is_pit_out_lap)
        .sort((a, b) => a.lap_number - b.lap_number);
      const stints: { stintIndex: number; compound: string; laps: { lap: number; lapTime: number; tyreAge: number }[] }[] = [];
      let currentStint: typeof stints[0] | null = null;
      for (const lap of driverLaps) {
        if (!currentStint || lap.compound !== currentStint.compound || lap.tyre_age === 0) {
          currentStint = { stintIndex: stints.length + 1, compound: lap.compound, laps: [] };
          stints.push(currentStint);
        }
        currentStint.laps.push({ lap: lap.lap_number, lapTime: lap.lap_duration, tyreAge: lap.tyre_age });
      }
      return stints;
    };
    const d1Stints = processDriver(d1);
    const d2Stints = processDriver(d2);
    // Build chart data: all lap numbers with both driver times
    const allLaps = new Set<number>();
    for (const s of [...d1Stints, ...d2Stints]) { for (const l of s.laps) allLaps.add(l.lap); }
    const points = Array.from(allLaps).sort((a, b) => a - b).map(lap => ({
      lap,
      drv1: d1Stints.flatMap(s => s.laps).find(l => l.lap === lap)?.lapTime || null,
      drv2: d2Stints.flatMap(s => s.laps).find(l => l.lap === lap)?.lapTime || null,
    }));
    const stintSummary = (stints: typeof d1Stints) => stints.map(s => {
      const times = s.laps.map(l => l.lapTime);
      const deg = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 0;
      return { stintIndex: s.stintIndex, compound: s.compound, laps: s.laps.length, startLap: s.laps[0].lap, endLap: s.laps[s.laps.length - 1].lap, avgTime: times.reduce((a, b) => a + b, 0) / times.length, degPerLap: deg };
    });
    setDegData({ drv1: d1, drv2: d2, points, stints: { drv1: stintSummary(d1Stints), drv2: stintSummary(d2Stints) } });
    setDegLoading(false);
  }

  if (loading) {
    return <div className="text-center p-12 text-muted-foreground">Loading session...</div>;
  }
  if (!session) {
    return <div className="text-center p-12 text-muted-foreground">Session not found</div>;
  }

  const csvUrl = (type: string) => `${import.meta.env.VITE_API_URL || '/api'}/api/sessions/${numSessionId}/export/csv?data_type=${type}`;
  const avgAir = weather.length ? (weather.reduce((s, w) => s + (w.air_temp || 0), 0) / weather.length).toFixed(1) : '—';
  const avgTrack = weather.length ? (weather.reduce((s, w) => s + (w.track_temp || 0), 0) / weather.length).toFixed(1) : '—';

  return (
    <div className="space-y-4">
      {/* ═══ STICKY HEADER ═══ */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border pb-4 -mx-4 px-4">
        <div className="flex items-center gap-3 mb-2">
          <a href="/#/races" onClick={e => { e.preventDefault(); window.history.back(); }}
            className="p-2 rounded-md hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{meeting?.name || 'Session'}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline">{session.session_name || session.session_type}</Badge>
              <span>{flagEmoji(meeting?.country_code)} {meeting?.circuit_name}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>👨‍👩‍👧‍👦 {drivers.length} drivers</span>
          <span>🏁 {session.session_type}</span>
          {sectors.length > 0 && <span>⏱️ {sectors[0]?.total_laps || '?'} laps</span>}
          {pits.length > 0 && <span>⛽ {pits.length} pit stops</span>}
          {stints.length > 0 && <span>🛞 {[...new Set(stints.map(s => s.compound))].filter(Boolean).length} compounds</span>}
          {weather.length > 0 && <span>🌡️ {avgTrack}°C track</span>}
        </div>

        {/* CSV Exports */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['laps', 'telemetry', 'stints', 'pit-stops', 'weather'].map(type => (
            <a key={type} href={csvUrl(type)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-3 w-3" /> {type}
            </a>
          ))}
        </div>
      </div>

      {/* ═══ DRIVER GRID ═══ */}
      <CardSection title="Drivers" subtitle={`${drivers.length} drivers — sorted by driver # — tap to view telemetry`} icon={<Activity className="h-4 w-4 text-blue-500" />}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {(showAllDrivers ? drivers : drivers.slice(0, 10)).map(d => (
            <Card key={d.driver_number} className={`p-2.5 text-center cursor-pointer transition-colors ${selectedDriver === d.driver_number ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setSelectedDriver(d.driver_number === selectedDriver ? null : d.driver_number)}>
              <div className="flex justify-center gap-1 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: teamColor(d.team_colour) }} />
              </div>
              {d.headshot_url ? (
                <img src={d.headshot_url} alt={d.name_acronym} className="w-8 h-8 rounded-full mx-auto mb-0.5 object-cover" loading="lazy" onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="font-bold text-xs" style="color:${teamColor(d.team_colour)}">${d.name_acronym?.[0] || '?'}</span>`;
                }} />
              ) : (
                <div className="w-8 h-8 rounded-full mx-auto mb-0.5 bg-muted flex items-center justify-center">
                  <span className="font-bold text-xs" style={{ color: teamColor(d.team_colour) }}>{d.name_acronym?.[0] || '?'}</span>
                </div>
              )}
              <p className="font-bold text-xs">{d.name_acronym}</p>
              <p className="text-[10px] text-muted-foreground truncate">{d.team_name}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">#{d.driver_number}</p>
            </Card>
          ))}
        </div>
        {drivers.length > 10 && (
          <button onClick={() => setShowAllDrivers(!showAllDrivers)}
            className="mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border">
            {showAllDrivers ? 'Show Less' : `Show All ${drivers.length} Drivers`}
          </button>
        )}
      </CardSection>

      {/* ═══ CIRCUIT DETAIL ═══ */}
      <CardSection title="Circuit Detail" subtitle="Track info, specs & fun facts"
        summary={circuitInfo?.circuit_name ? `${circuitInfo.length_km ? circuitInfo.length_km + 'km' : ''}${circuitInfo.length_km && circuitInfo.turns ? ' · ' : ''}${circuitInfo.turns ? circuitInfo.turns + ' turns' : ''}` : undefined}
        icon={<CircuitBoard className="h-4 w-4 text-blue-500" />}>
        {circuitLoading && circuitLoadingTrigger && !circuitLoaded ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Loading circuit info...</div>
        ) : circuitInfo?.circuit_name ? (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-shrink-0 w-full max-w-[400px]">
              {circuitInfo.circuit_image ? (
                <img
                  src={circuitInfo.circuit_image}
                  alt={`${circuitInfo.circuit_name} circuit`}
                  className="w-full h-auto rounded-md border border-border/50 bg-muted/30 object-contain"
                  loading="lazy"
                />
              ) : (
                <CircuitMap circuitName={circuitInfo.circuit_name || ''} className="w-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base mb-1">{circuitInfo.circuit_name}</h4>
              {circuitInfo.description && <p className="text-sm text-muted-foreground mb-3">{circuitInfo.description}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {circuitInfo.length_km != null && <SpecBox label="Length (km)" value={circuitInfo.length_km.toString()} />}
                {circuitInfo.turns != null && <SpecBox label="Turns" value={circuitInfo.turns.toString()} />}
                {circuitInfo.drs_zones != null && <SpecBox label="DRS Zones" value={circuitInfo.drs_zones.toString()} />}
                {circuitInfo.opened != null && <SpecBox label="Opened" value={circuitInfo.opened.toString()} />}
                {circuitInfo.lap_record && <SpecBox label={`Lap Record${circuitInfo.lap_record_driver ? ' (' + circuitInfo.lap_record_driver + ')' : ''}`} value={circuitInfo.lap_record} className="col-span-2 sm:col-span-1" />}
              </div>
              {circuitInfo.fun_fact && (
                <div className="mt-3 p-3 rounded text-xs bg-red-500/5 border border-red-500/20">
                  <span className="font-semibold text-red-500">💡 Did You Know?</span>
                  <p className="mt-1 text-muted-foreground">{circuitInfo.fun_fact}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center py-4 text-muted-foreground text-sm">No circuit data available</p>
        )}
      </CardSection>

      {/* ═══ BEST SECTOR TIMES ═══ */}
      <CardSection title="Best Sector Times" subtitle="Fastest sector 1/2/3 & lap times per driver"
        summary={(() => {
          const sorted = [...sectors].filter(s => s.best_lap).sort((a, b) => (a.best_lap || 999) - (b.best_lap || 999));
          return sorted.length > 0 ? `${sorted[0].acronym} · ${formatTime(sorted[0].best_lap)}` : undefined;
        })()}
        icon={<Radar className="h-4 w-4 text-purple-500" />}>
        <div className="flex gap-3 mb-2 text-[10px] text-muted-foreground flex-wrap">
          <span><span className="text-purple-400 font-bold">🟣</span> Fastest overall</span>
          <span><span className="text-green-400 font-bold">🟢</span> Top 3</span>
          <span><span className="text-yellow-400 font-bold">🟡</span> Outside Top 3</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">#</th>
                <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground">S1</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground">S2</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground">S3</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground">Best Lap</th>
                <th className="text-right p-2 text-xs font-medium text-muted-foreground">Laps</th>
              </tr>
            </thead>
            <tbody>
              {sectors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No sector data available</td></tr>
              ) : sectors.sort((a, b) => (a.best_lap || 999) - (b.best_lap || 999)).map((s, i) => {
                const top3S1 = [...sectors].filter(x => x.best_sector_1).sort((a, b) => a.best_sector_1 - b.best_sector_1).slice(0, 3);
                const top3S2 = [...sectors].filter(x => x.best_sector_2).sort((a, b) => a.best_sector_2 - b.best_sector_2).slice(0, 3);
                const top3S3 = [...sectors].filter(x => x.best_sector_3).sort((a, b) => a.best_sector_3 - b.best_sector_3).slice(0, 3);
                const isFastest = i === 0;
                const bestS1 = s.best_sector_1 === Math.min(...sectors.filter(x => x.best_sector_1).map(x => x.best_sector_1));
                const bestS2 = s.best_sector_2 === Math.min(...sectors.filter(x => x.best_sector_2).map(x => x.best_sector_2));
                const bestS3 = s.best_sector_3 === Math.min(...sectors.filter(x => x.best_sector_3).map(x => x.best_sector_3));
                const secColor = (v: number, arr: number[], best: boolean) => best ? 'text-purple-400' : (arr.includes(v) ? 'text-green-400' : (v ? 'text-yellow-400' : ''));
                const secBold = (best: boolean) => best ? 'font-bold' : '';
                return (
                  <tr key={s.driver_number} className={`border-b border-border text-sm ${isFastest ? 'bg-green-500/5' : 'hover:bg-muted/30'}`}>
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2"><DriverCell acronym={s.acronym} colour={s.team_colour} /></td>
                    <td className={`p-2 text-right font-mono ${secColor(s.best_sector_1, top3S1.map(x => x.best_sector_1), bestS1)} ${secBold(bestS1)}`}>{formatTime(s.best_sector_1)}</td>
                    <td className={`p-2 text-right font-mono ${secColor(s.best_sector_2, top3S2.map(x => x.best_sector_2), bestS2)} ${secBold(bestS2)}`}>{formatTime(s.best_sector_2)}</td>
                    <td className={`p-2 text-right font-mono ${secColor(s.best_sector_3, top3S3.map(x => x.best_sector_3), bestS3)} ${secBold(bestS3)}`}>{formatTime(s.best_sector_3)}</td>
                    <td className={`p-2 text-right font-mono font-bold ${isFastest ? 'text-purple-400' : ''}`}>{formatTime(s.best_lap)}</td>
                    <td className="p-2 text-right text-muted-foreground">{s.total_laps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardSection>

      {/* ═══ TYRE STRATEGY TIMELINE ═══ */}
      <CardSection title="Tyre Strategy Timeline" subtitle="Compound usage & stint length per driver"
        summary={(() => {
          const compounds = [...new Set(stints.map(s => s.compound).filter(Boolean))];
          return compounds.length > 0 ? `${compounds.length} compound${compounds.length > 1 ? 's' : ''} · ${stints.length} stint${stints.length !== 1 ? 's' : ''}` : undefined;
        })()}
        icon={<TrendingUp className="h-4 w-4 text-green-500" />}>
        {stintsByDriver.size === 0 ? (
          <p className="text-center py-4 text-muted-foreground text-sm">No stint data available</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-1.5 min-w-[500px]">
              {Array.from(stintsByDriver.entries()).map(([dn, driverStints]: [number, Stint[]]) => {
                const drv = driverMap[dn];
                return (
                  <div key={dn} className="flex items-center gap-2">
                    <div className="w-16 shrink-0 text-right">
                      <span className="text-[11px] font-medium" style={{ color: drv ? teamColor(drv.team_colour) : undefined }}>
                        {drv?.name_acronym || dn}
                      </span>
                    </div>
                    <div className="flex-1 flex h-6 rounded-md overflow-hidden">
                      {driverStints.map((stint: Stint, si: number) => {
                        const width = maxStintLap > 0 ? ((stint.lap_end - stint.lap_start + 1) / maxStintLap) * 100 : 0;
                        const color = COMPOUND_COLORS[stint.compound?.toUpperCase()] || '#6b7280';
                        const isFresh = stint.tyre_age_at_start === 0;
                        return (
                          <div key={si}
                            className="relative flex items-center justify-center text-[8px] font-bold text-white truncate px-0.5 border-r border-background cursor-default"
                            style={{ width: `${Math.max(width, 3)}%`, background: color, opacity: isFresh ? 1 : 0.7 }}
                            title={`${stint.compound}${isFresh ? ' (fresh)' : ` (used ${stint.tyre_age_at_start})`} L${stint.lap_start}-L${stint.lap_end}`}>
                            {width > 8 && stint.compound?.substring(0, 4)}
                          </div>
                        );
                      })}
                    </div>
                    <div className="w-12 shrink-0 flex gap-0.5">
                      {Array.from(new Set(driverStints.map(s => s.compound).filter(Boolean))).map(comp => (
                        <span key={comp as string} className="inline-block w-2 h-2 rounded-full"
                          style={{ background: COMPOUND_COLORS[(comp as string)?.toUpperCase()] || '#6b7280' }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3 text-[10px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#e11d48' }} /> Soft</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#eab308' }} /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#6b7280' }} /> Hard</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#22c55e' }} /> Intermediate</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded" style={{ background: '#3b82f6' }} /> Wet</span>
            </div>
            {/* Stint detail table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-1.5 text-muted-foreground">Driver</th>
                    <th className="text-left p-1.5 text-muted-foreground" colSpan={6}>Stint Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(stintsByDriver.entries()).map(([dn, sts]: [number, Stint[]]) => {
                    const drv = driverMap[parseInt(dn.toString())];
                    return (
                      <tr key={dn} className="border-b border-border">
                        <td className="p-1.5 font-medium"><DriverCell acronym={drv?.name_acronym || dn.toString()} colour={drv?.team_colour} /></td>
                        <td className="p-1.5" colSpan={6}>
                          {sts.map((s: Stint, si: number) => (
                            <span key={si} className="inline-flex items-center gap-1 mr-3 text-[10px]">
                              <span className={`inline-block w-2 h-2 rounded-full`} style={{ background: COMPOUND_COLORS[s.compound?.toUpperCase()] || '#6b7280' }} />
                              <span>{s.compound?.substring(0, 4)}</span>
                              <span className="text-muted-foreground">L{s.lap_start}-{s.lap_end}</span>
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardSection>

      {/* ═══ PIT STOP ANALYSIS ═══ */}
      <CardSection title="Pit Stop Analysis" subtitle="Stop times, compound changes & crew performance"
        summary={pits.length > 0 ? `${pits.length} stop${pits.length !== 1 ? 's' : ''}` : undefined}
        icon={<Gauge className="h-4 w-4 text-orange-500" />}>
        {pits.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground text-sm">No pit stop data available</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
              <SummaryCard label="Total Stops" value={pits.length.toString()} />
              <SummaryCard label="Drivers" value={Object.keys(pitsByDriver).length.toString()} />
              <SummaryCard label="Fastest Stop" value={`${pits.reduce((fastest, p) => (p.pit_duration || 999) < (fastest?.pit_duration || 999) ? p : fastest, pits[0]).pit_duration?.toFixed(1) || '?'}s`} />
              <SummaryCard label="Slowest Stop" value={`${pits.reduce((slowest, p) => (p.pit_duration || 0) > (slowest?.pit_duration || 0) ? p : slowest, pits[0]).pit_duration?.toFixed(1) || '?'}s`} />
            </div>

            {/* Pit Window Timeline */}
            <div className="overflow-x-auto mb-3">
              <div style={{ minWidth: 500 }}>
                <div className="flex text-[10px] mb-1 text-muted-foreground">
                  <div style={{ width: 44 }}></div>
                  <div className="flex-1 flex">
                    {Array.from({ length: Math.ceil(pitMaxLap / 10) + 1 }, (_, i) => i * 10).filter(l => l <= pitMaxLap && l > 0).map(l => (
                      <span key={l} style={{ width: `${(10 / pitMaxLap) * 100}%`, textAlign: 'center' }}>L{l}</span>
                    ))}
                  </div>
                </div>
                {Object.entries(pitsByDriver).sort((a, b) => Math.min(...a[1].map(x => x.lap_number)) - Math.min(...b[1].map(x => x.lap_number))).map(([dn, stops]) => {
                  const drv = driverMap[parseInt(dn)];
                  const label = drv?.name_acronym || dn;
                  return (
                    <div key={dn} className="flex items-center" style={{ height: 18, marginBottom: 1 }}>
                      <div className="w-11 shrink-0 text-[9px] font-bold text-right pr-1 truncate" style={{ color: drv ? teamColor(drv.team_colour) : '#666' }}>{label}</div>
                      <div className="flex-1 relative" style={{ height: 14, background: 'var(--secondary)', borderRadius: 3 }}>
                        {stops.map((s, si) => {
                          const pct = ((s.lap_number - 1) / Math.max(pitMaxLap - 1, 1)) * 100;
                          const isFast = (s.pit_duration || 25) <= 22;
                          return (
                            <div key={si} style={{
                              position: 'absolute', left: `${pct}%`, top: 1,
                              width: 10, height: 10, borderRadius: '50%',
                              background: isFast ? '#16a34a' : '#e10600',
                              border: '1px solid var(--background)',
                            }} title={`#${dn} L${s.lap_number} · ${s.pit_duration?.toFixed(1)}s${isFast ? ' ⚡' : ''}`} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pit stops table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-1.5 text-muted-foreground">Driver</th>
                    <th className="text-right p-1.5 text-muted-foreground">Stops</th>
                    <th className="text-right p-1.5 text-muted-foreground">Avg Stop</th>
                    <th className="text-right p-1.5 text-muted-foreground">Fastest</th>
                    <th className="text-right p-1.5 text-muted-foreground">Laps</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pitsByDriver).sort((a, b) => b[1].length - a[1].length).map(([dn, stops]) => {
                    const drv = driverMap[parseInt(dn)];
                    const avg = stops.reduce((s, p) => s + (p.pit_duration || 0), 0) / stops.length;
                    const fastest = Math.min(...stops.map(p => p.pit_duration || 999));
                    const lapsStr = stops.map(p => `L${p.lap_number}`).join(', ');
                    return (
                      <tr key={dn} className="border-b border-border hover:bg-muted/30">
                        <td className="p-1.5 font-medium"><DriverCell acronym={drv?.name_acronym || dn} colour={drv?.team_colour} /></td>
                        <td className="p-1.5 text-right">{stops.length}</td>
                        <td className="p-1.5 text-right font-mono">{avg.toFixed(1)}s</td>
                        <td className="p-1.5 text-right font-mono text-green-400">{fastest.toFixed(1)}s</td>
                        <td className="p-1.5 text-right text-muted-foreground" style={{ fontSize: 10 }}>{lapsStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardSection>

      {/* ═══ QUALIFYING EVOLUTION ═══ */}
      {isQualifying && qualiDrivers.length > 0 && (
        <CardSection title="Qualifying Evolution" subtitle="Q1→Q2→Q3 best lap progression" icon={<BarChart3 className="h-4 w-4 text-orange-500" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Pos</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                  {qualiSegments.map(seg => (
                    <th key={seg} className="text-right p-2 text-xs font-medium text-muted-foreground">{seg}</th>
                  ))}
                  <th className="text-right p-2 text-xs font-medium text-muted-foreground">Δ</th>
                </tr>
              </thead>
              <tbody>
                {qualiDrivers.sort((a, b) => (a.best_laps[qualiSegments[qualiSegments.length - 1]] || 999) - (b.best_laps[qualiSegments[qualiSegments.length - 1]] || 999)).map((d, i) => (
                  <tr key={d.driver_number} className="border-b border-border hover:bg-muted/30 text-sm">
                    <td className="p-2 font-bold text-muted-foreground">#{i + 1}</td>
                    <td className="p-2"><DriverCell acronym={d.acronym} colour={d.team_colour} /></td>
                    {qualiSegments.map(seg => (
                      <td key={seg} className="p-2 text-right font-mono">{d.best_laps[seg] ? formatTime(d.best_laps[seg]) : '-'}</td>
                    ))}
                    <td className={`p-2 text-right font-mono ${(d.total_improvement || 0) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {d.total_improvement ? `${d.total_improvement.toFixed(3)}s` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>
      )}

      {/* ═══ PIT STRATEGY BATTLE ═══ */}
      {isRaceSprint && pitStrategyDrivers.length > 0 && (
        <CardSection title="Pit Strategy Battle" subtitle="Undercut analysis & pit stop impact" icon={<Swords className="h-4 w-4 text-red-500" />}>
          {/* Undercut Opportunities */}
          {undercutOpps.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Undercut Opportunities</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-1.5 text-muted-foreground">Defender</th>
                      <th className="text-left p-1.5 text-muted-foreground">Attacker</th>
                      <th className="text-right p-1.5 text-muted-foreground">Pit Lap</th>
                      <th className="text-right p-1.5 text-muted-foreground">Delta</th>
                      <th className="text-center p-1.5 text-muted-foreground">Pos Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {undercutOpps.map((uo, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/30">
                        <td className="p-1.5 font-medium">{uo.defending_driver}</td>
                        <td className="p-1.5 font-medium text-green-400">{uo.attacking_driver}</td>
                        <td className="p-1.5 text-right">L{uo.pit_lap}</td>
                        <td className={`p-1.5 text-right font-mono ${(uo.undercut_delta || 0) < -1 ? 'text-green-400' : 'text-red-400'}`}>{uo.undercut_delta?.toFixed(2)}s</td>
                        <td className="p-1.5 text-center">
                          {uo.position_changed
                            ? <Badge className="bg-green-500/10 text-green-500 border-green-500/30 text-[10px]">✅ Overtook</Badge>
                            : <Badge variant="outline" className="text-[10px] text-muted-foreground">—</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Per-driver pit analysis */}
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Per-Driver Pit Stops</h4>
          <div className="space-y-3">
            {pitStrategyDrivers.map(d => (
              <div key={d.driver_number} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                    <span className="font-semibold text-sm">{d.acronym}</span>
                    <span className="text-xs text-muted-foreground">{d.team_name}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Avg pit: <span className="font-mono font-medium text-foreground">{(d.avg_pit_duration || 0).toFixed(1)}s</span></span>
                    <span>Total: <span className="font-mono font-medium text-foreground">{(d.total_pit_time || 0).toFixed(0)}s</span></span>
                  </div>
                </div>
                {d.strategy_summary && <p className="text-xs text-muted-foreground mb-2 italic">{d.strategy_summary}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-1 text-muted-foreground">Lap</th>
                        <th className="text-right p-1 text-muted-foreground">In Lap</th>
                        <th className="text-right p-1 text-muted-foreground">Out Lap</th>
                        <th className="text-right p-1 text-muted-foreground">Prev Lap</th>
                        <th className="text-right p-1 text-muted-foreground">Avg Before</th>
                        <th className="text-right p-1 text-muted-foreground">Avg After</th>
                        <th className="text-center p-1 text-muted-foreground">Pos Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.pit_analysis.map((pa, j) => (
                        <tr key={j} className="border-b border-border hover:bg-muted/30">
                          <td className="p-1 font-medium">L{pa.lap_number}</td>
                          <td className="p-1 text-right font-mono">{(pa.in_lap_time || 0).toFixed(1)}</td>
                          <td className="p-1 text-right font-mono">{(pa.out_lap_time || 0).toFixed(1)}</td>
                          <td className="p-1 text-right font-mono">{(pa.prev_lap_time || 0).toFixed(1)}</td>
                          <td className="p-1 text-right font-mono">{(pa.avg_before || 0).toFixed(1)}</td>
                          <td className="p-1 text-right font-mono">{(pa.avg_after || 0).toFixed(1)}</td>
                          <td className={`p-1 text-center font-mono ${(pa.position_change || 0) > 0 ? 'text-green-400' : pa.position_change < 0 ? 'text-red-400' : ''}`}>
                            {pa.position_change > 0 ? `+${pa.position_change}` : pa.position_change || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </CardSection>
      )}

      {/* ═══ RACE ANALYSIS CHARTS (load-on-demand) ═══ */}
      <CardSection title="Race Analysis" subtitle="Position history, gaps, overtakes & more" icon={<Activity className="h-4 w-4 text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Position History */}
          <LoadableCard title="Position History" subtitle="Lap-by-lap position changes" icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
            loading={posLoading} loaded={posLoaded} onLoad={loadPosHistory} isAvailable={isRaceSprint}>
            {posHistory?.timeline?.length ? (() => {
              const byDriver: Record<string, { acronym: string; team_colour: string }> = {};
              const lapSet = new Set<number>();
              for (const e of posHistory.timeline) {
                if (!byDriver[e.driver_number]) byDriver[e.driver_number] = { acronym: e.acronym, team_colour: e.team_colour };
                lapSet.add(e.lap);
              }
              const allLaps = Array.from(lapSet).sort((a, b) => a - b);
              const chartData = allLaps.map(lap => {
                const atLap = posHistory.timeline.filter(e => e.lap === lap);
                const pt: Record<string, any> = { lap };
                for (const e of atLap) {
                  pt[`p_${e.driver_number}`] = e.position;
                }
                return pt;
              });
              const driverEntries = Object.entries(byDriver);
              const filteredEntries = driverEntries.filter(([dn]) => selectedPosDrivers.has(parseInt(dn)));
              return (
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 500 }}>
                    <ResponsiveContainer key={[...selectedPosDrivers].sort().join(',')} width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="lap" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                        <YAxis reversed tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" domain={[1, 'auto']} label={{ value: 'Position', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                        <Tooltip
                          contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                          formatter={(value: any, name: any) => [`P${value}`, String(name).replace('p_', '')]} />
                        {filteredEntries.map(([dn, info]) => (
                          <Line key={dn} type="monotone" dataKey={`p_${dn}`} name={info.acronym}
                            stroke={teamColor(info.team_colour)} strokeWidth={1.5} dot={false} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    {filteredEntries.length === 0 && (
                      <p className="text-center py-3 text-muted-foreground text-xs">Select at least one driver to display</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {driverEntries.slice(0, 44).map(([dn, info]) => {
                        const numDn = parseInt(dn);
                        const isSelected = selectedPosDrivers.has(numDn);
                        return (
                          <button key={dn} onClick={() => togglePosDriver(numDn)}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              isSelected
                                ? 'border-foreground/30 bg-foreground/5 text-foreground'
                                : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: teamColor(info.team_colour), opacity: isSelected ? 1 : 0.3 }} />
                            {info.acronym}
                          </button>
                        );
                      })}
                      {driverEntries.length > 44 && <span className="text-[10px] text-muted-foreground">+{driverEntries.length - 44} more</span>}
                      <button onClick={selectAllPosDrivers} className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline">
                        Select all
                      </button>
                      <button onClick={clearAllPosDrivers} className="text-[10px] text-muted-foreground hover:text-foreground ml-2 underline">
                        Clear all
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p className="text-center py-4 text-muted-foreground text-sm">No position data available</p>
            )}
          </LoadableCard>

          {/* Lap Distribution */}
          <LoadableCard title="Lap Distribution" subtitle="Pace vs consistency scatter" icon={<Activity className="h-4 w-4 text-cyan-500" />}
            loading={lapDistLoading} loaded={lapDistLoaded} onLoad={loadLapDist}>
                {lapDist?.drivers?.length ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {lapDist.drivers.sort((a, b) => (a.avg_lap_time || 999) - (b.avg_lap_time || 999)).map(d => (
                  <div key={d.driver_number} className="text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                      <span className="font-medium">{d.acronym}</span>
                      <span className="text-muted-foreground">{d.total_laps} laps</span>
                      <span className="text-muted-foreground">· avg {formatTime(d.avg_lap_time)}</span>
                      <span className={d.consistency >= 80 ? 'text-green-400' : d.consistency >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                        · {d.consistency?.toFixed(0)}% consistency
                      </span>
                    </div>
                    {/* Mini sparkline of lap times */}
                    {d.lap_times?.length > 0 && (
                      <div className="flex items-end gap-px h-8 mb-2">
                        {d.lap_times.filter((_, i) => i % Math.max(1, Math.floor(d.lap_times.length / 60)) === 0).slice(0, 60).map((lt, li) => {
                          const min = Math.min(...d.lap_times);
                          const max = Math.max(...d.lap_times);
                          const range = max - min || 1;
                          const pct = ((lt - min) / range) * 100;
                          return (
                            <div key={li} className="flex-1 rounded-t transition-all"
                              style={{ height: `${100 - pct}%`, background: pct < 30 ? '#22c55e' : pct < 60 ? '#eab308' : '#e11d48', minHeight: 1 }} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No lap distribution data available</p>
            )}
          </LoadableCard>

          {/* Overtake Analysis */}
          <LoadableCard title="Overtake Analysis" subtitle="Positions gained & lost" icon={<Swords className="h-4 w-4 text-red-500" />}
            loading={overtakeLoading} loaded={overtakeLoaded} onLoad={loadOvertakeAnalysis} isAvailable={isRaceSprint}>
            {overtakeData && Object.keys(overtakeData).length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3 text-xs">
                  <SummaryCard label="Total Gained" value={Object.values(overtakeData).reduce((s: number, d: any) => s + d.gained, 0).toString()} />
                  <SummaryCard label="Total Lost" value={Object.values(overtakeData).reduce((s: number, d: any) => s + d.lost, 0).toString()} />
                  <SummaryCard label="Net" value={`+${Object.values(overtakeData).reduce((s: number, d: any) => s + d.net, 0)}`} />
                </div>
                <BarChart
                  data={Object.entries(overtakeData)
                    .sort((a: any, b: any) => b[1].net - a[1].net)
                    .map(([dn, d]: any) => ({ key: d.acronym, value: Math.max(d.net, 0) }))}
                  maxValue={Math.max(...Object.values(overtakeData).map((d: any) => d.net), 1)}
                  color={(v) => v > 0 ? '#22c55e' : '#e11d48'} height={22}
                  label="Net overtakes (top 10)" />
              </>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No overtake data</p>
            )}
          </LoadableCard>

          {/* Gap Timeline */}
          <LoadableCard title="Gap Timeline" subtitle="Cumulative gap to leader" icon={<Activity className="h-4 w-4 text-blue-500" />}
            loading={gapsLoading} loaded={gapsLoaded} onLoad={loadGaps} isAvailable={isRaceSprint}>
            {gaps?.timeline?.length ? (() => {
              const byLap: Record<number, any[]> = {};
              const drvMap: Record<string, { acronym: string; team_colour: string }> = {};
              for (const g of gaps.timeline) {
                if (!byLap[g.lap]) byLap[g.lap] = [];
                byLap[g.lap].push(g);
                if (g.driver_number && !drvMap[g.driver_number]) {
                  drvMap[g.driver_number] = { acronym: g.acronym || `#${g.driver_number}`, team_colour: g.team_colour || '#666' };
                }
              }
              const lapKeys = Object.keys(byLap).map(Number).sort((a, b) => a - b);
              // Sample to ~100 data points max for readability
              const sampleStep = Math.max(1, Math.floor(lapKeys.length / 100));
              const sampledLaps = lapKeys.filter((_, i) => i % sampleStep === 0);
              // Build chart data
              const drvEntries = gaps.leader
                ? [[gaps.leader.driver_number.toString(), { acronym: gaps.leader.acronym, team_colour: gaps.leader.team_colour }] as const, ...Object.entries(drvMap).filter(([k]) => k !== gaps.leader!.driver_number.toString())]
                : Object.entries(drvMap);
              const gapFilteredEntries = drvEntries.filter(([dn]) => selectedGapDrivers.has(parseInt(dn)));
              const chartData = sampledLaps.map(lap => {
                const entries = byLap[lap] || [];
                const pt: Record<string, any> = { lap };
                for (const e of entries) {
                  pt[`g_${e.driver_number}`] = e.gap_to_leader || 0;
                }
                return pt;
              });
              const maxGap = Math.max(...gaps.timeline.map(g => g.gap_to_leader || 0), 1);
              return (
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 500 }}>
                    <ResponsiveContainer key={[...selectedGapDrivers].sort().join(',')} width="100%" height={280}>
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="lap" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                        <YAxis tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" label={{ value: 'Gap (s)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                        <Tooltip
                          contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                          formatter={(value: any, name: any) => [`${value.toFixed(2)}s`, String(name).replace('g_', '')]} />
                        {gapFilteredEntries.map(([dn, info]) => (
                          <Line key={dn} type="monotone" dataKey={`g_${dn}`} name={info.acronym}
                            stroke={teamColor(info.team_colour)} strokeWidth={1.5} dot={false} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    {gapFilteredEntries.length === 0 && (
                      <p className="text-center py-3 text-muted-foreground text-xs">Select at least one driver to display</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {drvEntries.slice(0, 44).map(([dn, info]) => {
                        const numDn = parseInt(dn);
                        const isSelected = selectedGapDrivers.has(numDn);
                        return (
                          <button key={dn} onClick={() => toggleGapDriver(numDn)}
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              isSelected
                                ? 'border-foreground/30 bg-foreground/5 text-foreground'
                                : 'border-transparent text-muted-foreground/50 hover:text-muted-foreground'
                            }`}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: teamColor(info.team_colour), opacity: isSelected ? 1 : 0.3 }} />
                            {info.acronym}
                          </button>
                        );
                      })}
                      {drvEntries.length > 44 && <span className="text-[10px] text-muted-foreground">+{drvEntries.length - 44} more</span>}
                      <button onClick={selectAllGapDrivers} className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline">
                        Select all
                      </button>
                      <button onClick={clearAllGapDrivers} className="text-[10px] text-muted-foreground hover:text-foreground ml-2 underline">
                        Clear all
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p className="text-center py-4 text-muted-foreground text-sm">No gap data available</p>
            )}
          </LoadableCard>
        </div>
      </CardSection>

      {/* ═══ TELEMETRY ANALYSIS CHARTS (load-on-demand) ═══ */}
      <CardSection title="Telemetry Analysis" subtitle="Tyre deg, speed, braking, gear & more" icon={<Gauge className="h-4 w-4 text-blue-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tyre Degradation */}
          <Card className="p-5 border border-border">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setDegOpen(!degOpen)}>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm">Tyre Degradation</h3>
                  <p className="text-xs text-muted-foreground">Lap time progression per stint (select 2 drivers)</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${degOpen ? 'rotate-180' : ''}`} />
            </div>
            {degOpen && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <select className="bg-secondary text-foreground border border-border rounded px-2 py-1 text-xs" value={degDrv1 || drivers[0]?.driver_number || 0}
                    onChange={e => { setDegDrv1(parseInt(e.target.value)); }}>
                    {drivers.map(d => <option key={d.driver_number} value={d.driver_number}>{d.name_acronym}</option>)}
                  </select>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <select className="bg-secondary text-foreground border border-border rounded px-2 py-1 text-xs" value={degDrv2 || (drivers.length > 1 ? drivers[1]?.driver_number || 0 : 0)}
                    onChange={e => { setDegDrv2(parseInt(e.target.value)); }}>
                    {drivers.map(d => <option key={d.driver_number} value={d.driver_number}>{d.name_acronym}</option>)}
                  </select>
                  <button onClick={loadDegradation} className="bg-f1-red text-white px-3 py-1 rounded text-xs font-medium hover:opacity-90">
                    {degLoading ? <><RefreshCw className="h-3 w-3 inline animate-spin" /> Plotting...</> : 'Compare'}
                  </button>
                </div>
                {degData?.points?.length ? (
                  <>
                    {/* Chart */}
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: 500 }}>
                        <ResponsiveContainer key={`deg-${degData.drv1}-${degData.drv2}`} width="100%" height={280}>
                          <LineChart data={degData.points} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="lap" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)"
                              label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                            <YAxis tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" domain={['auto', 'auto']}
                              label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                            <Tooltip
                              contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(value: any, name: any) => [`${value?.toFixed(3)}s`, name]} />
                            <Line type="monotone" dataKey="drv1"
                              name={driverMap[degData.drv1]?.name_acronym || `#${degData.drv1}`}
                              stroke={teamColor(driverMap[degData.drv1]?.team_colour)} strokeWidth={2}
                              dot={false} connectNulls />
                            <Line type="monotone" dataKey="drv2"
                              name={driverMap[degData.drv2]?.name_acronym || `#${degData.drv2}`}
                              stroke={teamColor(driverMap[degData.drv2]?.team_colour)} strokeWidth={2}
                              strokeDasharray="4 3" dot={false} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {/* Stint Summary Table */}
                    <div className="overflow-x-auto">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Stint Comparison</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-1.5 text-muted-foreground">Driver</th>
                            <th className="text-center p-1.5 text-muted-foreground">Stint</th>
                            <th className="text-center p-1.5 text-muted-foreground">Compound</th>
                            <th className="text-center p-1.5 text-muted-foreground">Laps</th>
                            <th className="text-center p-1.5 text-muted-foreground">Range</th>
                            <th className="text-right p-1.5 text-muted-foreground">Avg Time</th>
                            <th className="text-right p-1.5 text-muted-foreground">Deg/Lap</th>
                          </tr>
                        </thead>
                        <tbody>
                          {degData.stints.drv1.map((s, i) => (
                            <tr key={`d1-${i}`} className="border-b border-border hover:bg-muted/30">
                              <td className="p-1.5 font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: teamColor(driverMap[degData.drv1]?.team_colour) }} />
                                  {driverMap[degData.drv1]?.name_acronym}
                                </span>
                              </td>
                              <td className="p-1.5 text-center">{s.stintIndex}</td>
                              <td className="p-1.5 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tyreBadgeColor(s.compound)}`}>
                                  {s.compound?.substring(0, 4)}
                                </span>
                              </td>
                              <td className="p-1.5 text-center">{s.laps}</td>
                              <td className="p-1.5 text-center text-muted-foreground">L{s.startLap}–{s.endLap}</td>
                              <td className="p-1.5 text-right font-mono">{formatTime(s.avgTime)}</td>
                              <td className={`p-1.5 text-right font-mono ${s.degPerLap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {s.degPerLap > 0 ? `+${s.degPerLap.toFixed(3)}` : s.degPerLap.toFixed(3)}
                              </td>
                            </tr>
                          ))}
                          {degData.stints.drv2.map((s, i) => (
                            <tr key={`d2-${i}`} className="border-b border-border hover:bg-muted/30">
                              <td className="p-1.5 font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ background: teamColor(driverMap[degData.drv2]?.team_colour) }} />
                                  {driverMap[degData.drv2]?.name_acronym}
                                </span>
                              </td>
                              <td className="p-1.5 text-center">{s.stintIndex}</td>
                              <td className="p-1.5 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${tyreBadgeColor(s.compound)}`}>
                                  {s.compound?.substring(0, 4)}
                                </span>
                              </td>
                              <td className="p-1.5 text-center">{s.laps}</td>
                              <td className="p-1.5 text-center text-muted-foreground">L{s.startLap}–{s.endLap}</td>
                              <td className="p-1.5 text-right font-mono">{formatTime(s.avgTime)}</td>
                              <td className={`p-1.5 text-right font-mono ${s.degPerLap > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {s.degPerLap > 0 ? `+${s.degPerLap.toFixed(3)}` : s.degPerLap.toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Legend */}
                    <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 inline-block rounded" style={{ background: teamColor(driverMap[degData.drv1]?.team_colour) }} />
                        {driverMap[degData.drv1]?.name_acronym}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-px inline-block border-t-2 border-dashed" style={{ borderColor: teamColor(driverMap[degData.drv2]?.team_colour) }} />
                        {driverMap[degData.drv2]?.name_acronym}
                      </span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#e11d48' }} /> Soft</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#eab308' }} /> Medium</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#6b7280' }} /> Hard</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#22c55e' }} /> Inter</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded" style={{ background: '#3b82f6' }} /> Wet</span>
                    </div>
                  </>
                ) : degData && !degData?.points?.length ? (
                  <p className="text-center py-4 text-muted-foreground text-sm">No degradation data for selected drivers</p>
                ) : null}
              </div>
            )}
          </Card>

          {/* Speed Traps */}
          <LoadableCard title="Speed Trap" subtitle="Top speed & average speed per driver" icon={<Zap className="h-4 w-4 text-yellow-500" />}
            loading={speedsLoading} loaded={speedsLoaded} onLoad={loadSpeeds}>
            {speeds?.drivers?.length ? (
              <BarChart
                data={speeds.drivers.map(d => ({ key: d.acronym, value: Math.round(d.max_speed) }))}
                maxValue={Math.max(...speeds.drivers.map(d => d.max_speed), 1)}
                color={(v) => v > 330 ? '#22c55e' : v > 310 ? '#eab308' : '#e11d48'}
                height={22}
                label="Max Speed (km/h)" />
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No speed trap data</p>
            )}
          </LoadableCard>

          {/* Braking Analysis */}
          <LoadableCard title="Braking Analysis" subtitle="Late braking index & aggression" icon={<Gauge className="h-4 w-4 text-red-500" />}
            loading={brakingLoading} loaded={brakingLoaded} onLoad={loadBraking}>
            {braking?.drivers?.length ? (
              <div className="max-h-[400px] overflow-y-auto">
              <BarChart
                data={braking.drivers.map(d => ({ key: d.acronym, value: Math.round(d.late_braking_index) }))}
                maxValue={Math.max(...braking.drivers.map(d => d.late_braking_index), 1)}
                color={(v) => v > 70 ? '#e11d48' : v > 40 ? '#eab308' : '#22c55e'}
                height={20}
                label="Late Braking Index (higher = later braking)" />
                </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No braking data</p>
            )}
          </LoadableCard>

          {/* Corner Performance */}
          <LoadableCard title="Corner Performance" subtitle="Min corner & exit speeds" icon={<Radar className="h-4 w-4 text-purple-500" />}
            loading={cornerLoading} loaded={cornerLoaded} onLoad={loadCorner}>
            {corner?.drivers?.length ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <BarChart
                  data={corner.drivers.map(d => ({ key: d.acronym, value: Math.round(d.avg_min_speed) }))}
                  maxValue={Math.max(...corner.drivers.map(d => d.avg_min_speed), 1)}
                  color={(v) => v > 160 ? '#22c55e' : v > 130 ? '#eab308' : '#e11d48'}
                  height={20}
                  label="Avg Min Corner Speed (km/h)" />
                <div className="text-xs text-muted-foreground">
                  <span>Best min speed: </span>
                  {corner.drivers.filter(d => d.best_corner_min_speed > 0).sort((a, b) => b.best_corner_min_speed - a.best_corner_min_speed).slice(0, 1).map(d => (
                    <span key={d.driver_number} className="font-medium text-foreground">{d.acronym} ({d.best_corner_min_speed.toFixed(0)} km/h)</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No corner data</p>
            )}
          </LoadableCard>

          {/* Gear & RPM Analysis */}
          <LoadableCard title="Gear & RPM" subtitle="Gear distribution & RPM patterns" icon={<Activity className="h-4 w-4 text-blue-500" />}
            loading={gearLoading} loaded={gearLoaded} onLoad={loadGear}>
            {gear?.drivers?.length ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {/* RPM bar chart */}
                <BarChart
                  data={gear.drivers.map(d => ({ key: d.acronym, value: Math.round(d.avg_rpm) }))}
                  maxValue={Math.max(...gear.drivers.map(d => d.avg_rpm), 1)}
                  color={(v) => v > 10000 ? '#e11d48' : v > 8000 ? '#eab308' : '#22c55e'}
                  height={20}
                  label="Avg RPM" />
                {/* High RPM % bar chart */}
                <BarChart
                  data={gear.drivers.map(d => ({ key: d.acronym, value: Math.round(d.high_rpm_percentage || d.high_rpm_pct) }))}
                  maxValue={100}
                  color={(v) => v > 60 ? '#e11d48' : v > 30 ? '#eab308' : '#22c55e'}
                  height={18}
                  label="High RPM % (>10k RPM)" />
                {/* Max RPM + Stats */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Max RPM: </span>
                  {gear.drivers.sort((a, b) => b.max_rpm - a.max_rpm).slice(0, 3).map(d => (
                    <span key={d.driver_number} className="font-medium text-foreground mr-2">{d.acronym} {d.max_rpm.toFixed(0)}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground text-sm">No gear data</p>
            )}
          </LoadableCard>

          {/* Overtake Mode (already loaded) */}
          {isRaceSprint && omDrivers.length > 0 && (
            <Card className="p-4 border border-border">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-3">
                <Zap className="h-3.5 w-3.5 text-yellow-500" />
                Overtake Mode (2026)
              </h4>
              <p className="text-[10px] text-muted-foreground mb-3">{overtakeMode?.note || 'ERS boost'}</p>
              <div className="max-h-[400px] overflow-y-auto">
                <BarChart
                  data={topOm.map(d => ({ key: d.acronym, value: Math.round(d.om_percentage) }))}
                maxValue={100}
                color={(v) => v > 50 ? '#22c55e' : v > 20 ? '#eab308' : '#3b82f6'}
                height={18}
                label="OM Activation %" />
                </div>
            </Card>
          )}
        </div>
      </CardSection>

      {/* ═══ DRIVER COMPARISON ═══ */}
      <CardSection title="Driver Comparison" subtitle="Head-to-head lap time comparison"
        summary={compDrv1 && compDrv2 ? `${driverMap[compDrv1]?.name_acronym || '#'+compDrv1} vs ${driverMap[compDrv2]?.name_acronym || '#'+compDrv2}` : undefined}
        icon={<GitCompare className="h-4 w-4 text-blue-500" />}>
        <div className="space-y-4">
          {/* Select + Compare */}
          <div className="flex flex-wrap gap-2 items-center">
            <select className="bg-secondary text-foreground border border-border rounded px-2 py-1.5 text-xs" value={compDrv1}
              onChange={e => setCompDrv1(parseInt(e.target.value))}>
              {drivers.map(d => <option key={d.driver_number} value={d.driver_number}>{d.full_name} ({d.name_acronym})</option>)}
            </select>
            <span className="text-muted-foreground text-xs">vs</span>
            <select className="bg-secondary text-foreground border border-border rounded px-2 py-1.5 text-xs" value={compDrv2}
              onChange={e => setCompDrv2(parseInt(e.target.value))}>
              {drivers.map(d => <option key={d.driver_number} value={d.driver_number}>{d.full_name} ({d.name_acronym})</option>)}
            </select>
            <button onClick={doCompare} className="bg-f1-red text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">Compare</button>
          </div>

          {/* Results */}
          {compResult && (
            <div className="space-y-3">
              {/* Lap time comparison chart */}
              <div className="bg-card/30 rounded-lg p-3">
                <h4 className="text-xs font-medium mb-2">Lap Time Comparison</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={(() => {
                    const l1Map = new Map(compResult.laps1.map(l => [l.lap_number, l]));
                    const l2Map = new Map(compResult.laps2.map(l => [l.lap_number, l]));
                    const all = [...new Set([...l1Map.keys(), ...l2Map.keys()])].sort((a, b) => a - b);
                    return all.map(lap => ({
                      lap,
                      d1: l1Map.get(lap)?.lap_duration || null,
                      d2: l2Map.get(lap)?.lap_duration || null,
                    }));
                  })()} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="lap" tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" label={{ value: 'Lap', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                    <YAxis tick={{ fontSize: 9 }} stroke="rgba(255,255,255,0.25)" domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'rgba(255,255,255,0.3)' } }} />
                    <Tooltip
                      contentStyle={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                      formatter={(value: any) => value?.toFixed(3) + 's'} />
                    <Line type="monotone" dataKey="d1" name={driverMap[compResult.drv1]?.name_acronym || 'Driver 1'}
                      stroke={teamColor(driverMap[compResult.drv1]?.team_colour)} strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="d2" name={driverMap[compResult.drv2]?.name_acronym || 'Driver 2'}
                      stroke={teamColor(driverMap[compResult.drv2]?.team_colour)} strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-1.5 text-muted-foreground">Lap</th>
                    <th className="text-right p-1.5 text-muted-foreground" style={{ color: teamColor(driverMap[compResult.drv1]?.team_colour) }}>
                      {driverMap[compResult.drv1]?.name_acronym}
                    </th>
                    <th className="text-center p-1.5 text-muted-foreground">Δ</th>
                    <th className="text-right p-1.5 text-muted-foreground" style={{ color: teamColor(driverMap[compResult.drv2]?.team_colour) }}>
                      {driverMap[compResult.drv2]?.name_acronym}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const l1Map: Map<number, Lap> = new Map(compResult.laps1.map(l => [l.lap_number, l] as [number, Lap]));
                    const l2Map: Map<number, Lap> = new Map(compResult.laps2.map(l => [l.lap_number, l] as [number, Lap]));
                    const allLaps = [...new Set([...l1Map.keys(), ...l2Map.keys()])].sort((a, b) => a - b);
                    // Compute stats
                    const d1Avg = compResult.laps1.reduce((s, l) => s + (l.lap_duration || 0), 0) / compResult.laps1.length;
                    const d2Avg = compResult.laps2.reduce((s, l) => s + (l.lap_duration || 0), 0) / compResult.laps2.length;
                    const d1Best = Math.min(...compResult.laps1.map(l => l.lap_duration || 999));
                    const d2Best = Math.min(...compResult.laps2.map(l => l.lap_duration || 999));
                    return (
                      <>
                        {/* Summary row */}
                        <tr className="border-b border-border font-medium">
                          <td className="p-1.5 text-muted-foreground">Average</td>
                          <td className="p-1.5 text-right font-mono">{formatTime(d1Avg)}</td>
                          <td className={`p-1.5 text-center font-mono ${d1Avg < d2Avg ? 'text-green-400' : 'text-red-400'}`}>
                            {((d1Avg - d2Avg) * (d1Avg < d2Avg ? -1 : 1)).toFixed(3)}s
                          </td>
                          <td className="p-1.5 text-right font-mono">{formatTime(d2Avg)}</td>
                        </tr>
                        <tr className="border-b border-border font-medium">
                          <td className="p-1.5 text-muted-foreground">Best</td>
                          <td className="p-1.5 text-right font-mono">{formatTime(d1Best)}</td>
                          <td className={`p-1.5 text-center font-mono ${d1Best < d2Best ? 'text-green-400' : 'text-red-400'}`}>
                            {Math.abs(d1Best - d2Best).toFixed(3)}s
                          </td>
                          <td className="p-1.5 text-right font-mono">{formatTime(d2Best)}</td>
                        </tr>
                        {allLaps.slice(0, 50).map(lap => {
                          const l1 = l1Map.get(lap);
                          const l2 = l2Map.get(lap);
                          if (!l1 && !l2) return null;
                          const t1 = l1?.lap_duration;
                          const t2 = l2?.lap_duration;
                          const delta = t1 && t2 ? t1 - t2 : null;
                          return (
                            <tr key={lap} className="border-b border-border hover:bg-muted/30">
                              <td className="p-1.5 text-muted-foreground">L{lap}</td>
                              <td className={`p-1.5 text-right font-mono ${l1?.is_pit_in_lap || l1?.is_pit_out_lap ? 'text-muted-foreground' : ''}`}>
                                {t1 ? formatTime(t1) : '-'}
                              </td>
                              <td className={`p-1.5 text-center font-mono ${delta ? (delta < 0 ? 'text-green-400' : 'text-red-400') : ''}`}>
                                {delta !== null ? (delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3)) : '-'}
                              </td>
                              <td className={`p-1.5 text-right font-mono ${l2?.is_pit_in_lap || l2?.is_pit_out_lap ? 'text-muted-foreground' : ''}`}>
                                {t2 ? formatTime(t2) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </CardSection>

      {/* ═══ WEATHER ═══ */}
      {weather.length > 0 && (
        <CardSection title="Weather Impact" subtitle="Track & air conditions during session"
          summary={weather.length > 0 ? `${avgAir}°C air · ${avgTrack}°C track` : undefined}
          icon={<Thermometer className="h-4 w-4 text-orange-500" />}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs">
            <SummaryCard label="Air Temp Range" value={`${Math.min(...weather.filter(w => w.air_temp != null).map(w => w.air_temp)).toFixed(1)}° - ${Math.max(...weather.filter(w => w.air_temp != null).map(w => w.air_temp)).toFixed(1)}°`} />
            <SummaryCard label="Track Temp Range" value={`${Math.min(...weather.filter(w => w.track_temp != null).map(w => w.track_temp)).toFixed(1)}° - ${Math.max(...weather.filter(w => w.track_temp != null).map(w => w.track_temp)).toFixed(1)}°`} />
            <SummaryCard label="Average Air/Track" value={`${avgAir}° / ${avgTrack}°`} />
            <SummaryCard label={`${weather[0]?.rainfall ? '🌧️' : '☀️'} Condition`} value={weather.some(w => w.rainfall) ? 'Rain' : 'Dry'} />
          </div>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1.5 text-muted-foreground">Time</th>
                  <th className="text-right p-1.5 text-muted-foreground">Air</th>
                  <th className="text-right p-1.5 text-muted-foreground">Track</th>
                  <th className="text-right p-1.5 text-muted-foreground">Humidity</th>
                  <th className="text-center p-1.5 text-muted-foreground">Rain</th>
                </tr>
              </thead>
              <tbody>
                {weather.slice(0, 30).map((w, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-1.5 text-muted-foreground font-mono text-[10px]">{w.timestamp ? new Date(w.timestamp).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' }) : `#${i + 1}`}</td>
                    <td className="p-1.5 text-right">{w.air_temp?.toFixed(1)}°</td>
                    <td className="p-1.5 text-right">{w.track_temp?.toFixed(1)}°</td>
                    <td className="p-1.5 text-right">{w.humidity != null ? `${w.humidity}%` : '-'}</td>
                    <td className="p-1.5 text-center">{w.rainfall ? '🌧️' : '☀️'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>
      )}

      {/* ═══ RACE DIRECTOR ═══ */}
      {raceControl.length > 0 && (
        <CardSection title="Race Director Timeline" subtitle="Flags, SC, VSC, penalties & incidents"
          summary={raceControl.length > 0 ? `${raceControl.length} entr${raceControl.length !== 1 ? 'ies' : 'y'}` : undefined}
          icon={<Flag className="h-4 w-4 text-red-500" />}>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border sticky top-0 bg-card z-10">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Lap</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Flag</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Message</th>
                </tr>
              </thead>
              <tbody>
                {raceControl.slice(0, 50).map((rc, i) => (
                  <tr key={i} className="border-b border-border text-sm">
                    <td className="p-2 text-muted-foreground">{rc.lap_number ? `L${rc.lap_number}` : '-'}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={`text-xs ${
                        rc.flag === 'GREEN' ? 'bg-green-500/10 text-green-500' :
                        rc.flag === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-500' :
                        rc.flag === 'RED' ? 'bg-red-500/10 text-red-500' :
                        rc.flag === 'CHEQUERED' ? 'bg-purple-500/10 text-purple-500' :
                        rc.flag === 'SC' ? 'bg-orange-500/10 text-orange-500' :
                        rc.flag === 'VSC' ? 'bg-blue-500/10 text-blue-500' : ''
                      }`}>{rc.flag}</Badge>
                    </td>
                    <td className="p-2">{rc.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardSection>
      )}

      {/* ═══ TELEMETRY (when driver selected) ═══ */}
      {selectedDriver && (
        <CardSection title={`Telemetry — ${driverMap[selectedDriver]?.name_acronym || `#${selectedDriver}`}`}
          subtitle="Click a driver card above to change" icon={<Gauge className="h-4 w-4 text-blue-500" />}>
          {telemetryLoading ? (
            <p className="text-center py-4 text-muted-foreground text-sm">Loading telemetry...</p>
          ) : telemetry.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">No telemetry available</p>
          ) : (
            <>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border sticky top-0 bg-card z-10">
                      <th className="text-left p-1.5 text-muted-foreground">Time</th>
                      <th className="text-right p-1.5 text-muted-foreground">Speed</th>
                      <th className="text-right p-1.5 text-muted-foreground">RPM</th>
                      <th className="text-right p-1.5 text-muted-foreground">Throttle</th>
                      <th className="text-right p-1.5 text-muted-foreground">Brake</th>
                      <th className="text-center p-1.5 text-muted-foreground">DRS</th>
                      <th className="text-center p-1.5 text-muted-foreground">Gear</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry.filter((_, i) => i % 50 === 0).slice(0, 100).map((t, i) => (
                      <tr key={i} className="border-b border-border font-mono">
                        <td className="p-1.5 text-muted-foreground">{(t.timestamp || '').toString().slice(-8)}</td>
                        <td className="p-1.5 text-right">{t.speed?.toFixed(0)}</td>
                        <td className="p-1.5 text-right">{t.rpm}</td>
                        <td className={`p-1.5 text-right ${(t.throttle || 0) > 80 ? 'text-green-400' : ''}`}>{t.throttle?.toFixed(0)}%</td>
                        <td className={`p-1.5 text-right ${(t.brake || 0) > 0 ? 'text-red-400' : ''}`}>{t.brake?.toFixed(0)}%</td>
                        <td className="p-1.5 text-center">{t.drs ? '✅' : '—'}</td>
                        <td className="p-1.5 text-center">{t.gear || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Speed bar */}
              <div className="mt-3">
                <h4 className="text-xs text-muted-foreground mb-1">Speed Distribution</h4>
                <div className="flex items-end gap-px h-20">
                  {Array.from({ length: Math.min(60, Math.floor(telemetry.length / 100)) }).map((_, i) => {
                    const sample = telemetry[i * 100];
                    const maxSpeed = Math.max(...telemetry.map(t => t.speed || 0), 1);
                    const pct = (sample?.speed || 0) / maxSpeed * 100;
                    return (
                      <div key={i} className="flex-1 rounded-t transition-all duration-100"
                        style={{ height: `${pct}%`, background: pct > 80 ? '#e11d48' : pct > 50 ? '#eab308' : '#3b82f6' }}
                        title={`${sample?.speed?.toFixed(0)} km/h`} />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardSection>
      )}
    </div>
  );
}

// ── Helper Components ──
function SpecBox({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`text-center p-2 rounded bg-secondary/50 border border-border ${className}`}>
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 bg-secondary/50 border border-border rounded">
      <div className="text-sm font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
