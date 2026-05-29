import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMeeting, getSessions, getSessionDrivers, getLaps, getPitStops,
  getWeather, getRaceControl, getStints, getTelemetryLap,
  getSessionSectors, getPitStrategy, getOvertakeMode, getQualifyingSummary,
  type Meeting, type Session, type SessionDriver, type Lap,
  type PitStop, type Weather, type RaceControl, type Stint,
  type TelemetrySample, type SessionSectorRow,
  type PitStrategyData, type OvertakeModeData, type QualifyingSummaryData,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, formatTime, flagEmoji } from '@/lib/formatters';
import {
  ArrowLeft, Clock, Gauge, Thermometer, Flag, Radio,
  Swords, Zap, BarChart3, Radar, TrendingUp,
} from 'lucide-react';

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

  const numMeetingId = parseInt(meetingId || '0');
  const numSessionId = parseInt(sessionId || '0');

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

        // Load optional analytics in parallel
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
        if (isRaceOrSprint) {
          setPitStrategy(results[0] as PitStrategyData);
          setOvertakeMode(results[1] as OvertakeModeData);
        }
        if (isQualifying) {
          setQualifying(results[isRaceOrSprint ? 2 : 0] as QualifyingSummaryData);
        }
      } catch (e) {
        console.error('Session load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId, sessionId]);

  // Load telemetry when driver selected
  useEffect(() => {
    if (!selectedDriver || !sessionId) return;
    setTelemetryLoading(true);
    getTelemetryLap(numSessionId, selectedDriver)
      .then(setTelemetry)
      .catch(() => setTelemetry([]))
      .finally(() => setTelemetryLoading(false));
  }, [selectedDriver, sessionId, numSessionId]);

  if (loading) {
    return <div className="text-center p-12 text-muted-foreground">Loading session...</div>;
  }

  if (!session) {
    return <div className="text-center p-12 text-muted-foreground">Session not found</div>;
  }

  const driverMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]));
  const sessType = (session.session_type || '').toLowerCase();
  const isRaceSprint = sessType.includes('race') || sessType.includes('sprint');
  const isQualifying = sessType.includes('qualify');

  // ─── Tyre Strategy: Group stints by driver ───
  const stintsByDriver = useMemo(() => {
    const map = new Map<number, Stint[]>();
    for (const s of stints) {
      if (!map.has(s.driver_number)) map.set(s.driver_number, []);
      map.get(s.driver_number)!.push(s);
    }
    return map;
  }, [stints]);

  const maxStintLap = useMemo(() => {
    let max = 0;
    for (const sts of stintsByDriver.values()) {
      for (const s of sts) {
        if (s.lap_end > max) max = s.lap_end;
        if (s.lap_start > max) max = s.lap_start;
      }
    }
    return Math.max(max, laps.reduce((mx, l) => Math.max(mx, l.lap_number || 0), 0));
  }, [stintsByDriver, laps]);

  // ─── Qualifying Evolution data ───
  const qualiDrivers = qualifying?.drivers || [];
  const qualiSegments = qualifying?.segments || [];

  // ─── Pit Strategy ───
  const pitStrategyDrivers = pitStrategy?.drivers || [];
  const undercutOpps = pitStrategy?.undercut_opportunities || [];

  // ─── Overtake Mode ───
  const omDrivers = overtakeMode?.drivers || [];
  const topOm = [...omDrivers].sort((a, b) => b.om_percentage - a.om_percentage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/#/races"
          className="p-2 rounded-md hover:bg-muted transition-colors"
          onClick={e => { e.preventDefault(); window.history.back(); }}
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">{meeting?.name || 'Session'}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{session.session_name || session.session_type}</Badge>
            <span>{flagEmoji(meeting?.country_code)} {meeting?.circuit_name}</span>
          </div>
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {drivers.slice(0, 10).map(d => (
          <Card key={d.driver_number} className="p-3 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => setSelectedDriver(d.driver_number)}>
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: teamColor(d.team_colour) }} />
            <p className="font-bold text-sm">{d.name_acronym}</p>
            <p className="text-xs text-muted-foreground truncate">{d.team_name}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="laps">
        <TabsList className="flex-wrap">
          <TabsTrigger value="laps">Lap Times</TabsTrigger>
          <TabsTrigger value="tyres">Tyre Strategy</TabsTrigger>
          {sectors.length > 0 && <TabsTrigger value="sectors">Best Sectors</TabsTrigger>}
          {isQualifying && qualiDrivers.length > 0 && <TabsTrigger value="quali">Qualifying</TabsTrigger>}
          {isRaceSprint && pitStrategyDrivers.length > 0 && <TabsTrigger value="pit-strategy">Pit Strategy</TabsTrigger>}
          {isRaceSprint && omDrivers.length > 0 && <TabsTrigger value="overtake-mode">Overtake Mode</TabsTrigger>}
          <TabsTrigger value="pits">Pit Stops</TabsTrigger>
          {weather.length > 0 && <TabsTrigger value="weather">Weather</TabsTrigger>}
          {raceControl.length > 0 && <TabsTrigger value="flags">Race Director</TabsTrigger>}
          {selectedDriver && <TabsTrigger value="telemetry">Telemetry</TabsTrigger>}
        </TabsList>

        {/* ── Lap Times ── */}
        <TabsContent value="laps" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Lap Time</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S1</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S2</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S3</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Tyre</th>
                  </tr>
                </thead>
                <tbody>
                  {laps.filter(l => !l.is_pit_out_lap && !l.is_pit_in_lap).slice(0, 200).map((lap, i) => {
                    const drv = driverMap[lap.driver_number];
                    const prevLaps = laps.filter(l => l.driver_number === lap.driver_number && l.lap_number < lap.lap_number && l.lap_duration);
                    const isPB = lap.lap_duration ? lap.lap_duration <= Math.min(...prevLaps.map(l => l.lap_duration || 999)) : false;
                    return (
                      <tr key={`${lap.driver_number}-${lap.lap_number}`} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                        <td className="p-2 text-muted-foreground">{lap.lap_number}</td>
                        <td className="p-2">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: teamColor(drv?.team_colour) }} />
                            <span className="font-medium">{drv?.name_acronym || lap.driver_number}</span>
                          </span>
                        </td>
                        <td className={`p-2 text-right font-mono ${isPB ? 'text-green-400 font-bold' : ''}`}>
                          {formatTime(lap.lap_duration)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_1)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_2)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_3)}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className={`text-[10px] ${tyreBadgeColor(lap.compound)}`}>
                            {lap.compound?.substring(0, 4)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tyre Strategy (Stint Timeline) ── */}
        <TabsContent value="tyres" className="mt-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Stint Timeline — Tyre Compounds
            </h3>
            {stintsByDriver.size === 0 ? (
              <p className="text-center text-muted-foreground py-6">No stint data available</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="space-y-2 min-w-[500px]">
                  {Array.from(stintsByDriver.entries()).map(([dn, driverStints]) => {
                    const drv = driverMap[dn];
                    return (
                      <div key={dn} className="flex items-center gap-3">
                        <div className="w-20 shrink-0 text-right">
                          <span className="text-xs font-medium" style={{ color: drv ? teamColor(drv.team_colour) : undefined }}>
                            {drv?.name_acronym || dn}
                          </span>
                        </div>
                        <div className="flex-1 flex h-7 rounded-md overflow-hidden">
                          {driverStints.map((stint, si) => {
                            const width = maxStintLap > 0 ? ((stint.lap_end - stint.lap_start + 1) / maxStintLap) * 100 : 0;
                            const color = COMPOUND_COLORS[stint.compound?.toUpperCase()] || '#6b7280';
                            const isFresh = stint.fresh_tyre || stint.tyre_age_at_start === 0;
                            return (
                              <div
                                key={si}
                                className="relative flex items-center justify-center text-[9px] font-bold text-white truncate px-0.5 border-r border-background"
                                style={{ width: `${Math.max(width, 3)}%`, background: color, opacity: isFresh ? 1 : 0.7 }}
                                title={`${stint.compound}${isFresh ? ' (fresh)' : ` (used ${stint.tyre_age_at_start})`} L${stint.lap_start}-L${stint.lap_end}`}
                              >
                                {width > 8 && stint.compound?.substring(0, 4)}
                              </div>
                            );
                          })}
                        </div>
                        <div className="w-16 shrink-0 flex gap-1">
                          {Array.from(new Set(driverStints.map(s => s.compound))).map(comp => (
                            <span key={comp} className="inline-block w-2.5 h-2.5 rounded-full"
                              style={{ background: COMPOUND_COLORS[comp?.toUpperCase()] || '#6b7280' }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#e11d48' }} /> Soft</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#eab308' }} /> Medium</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#6b7280' }} /> Hard</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#22c55e' }} /> Intermediate</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} /> Wet</span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Best Sectors per Session ── */}
        {sectors.length > 0 && (
          <TabsContent value="sectors" className="mt-4">
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Radar className="h-4 w-4 text-purple-500" />
                  Best Sector Times
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">S1</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">S2</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">S3</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Best Lap</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Laps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectors.sort((a, b) => (a.best_lap || 999) - (b.best_lap || 999)).map((s, i) => {
                      const isFastest = i === 0;
                      return (
                        <tr key={s.driver_number} className={`border-b border-border text-sm ${isFastest ? 'bg-green-500/5' : 'hover:bg-muted/30'}`}>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(s.team_colour) }} />
                              <span className="font-medium">{s.acronym}</span>
                              {isFastest && <span className="text-[10px] text-green-500 font-medium">FASTEST</span>}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-mono ${s.best_sector_1 === Math.min(...sectors.map(x => x.best_sector_1 || 999)) ? 'text-green-400' : ''}`}>
                            {formatTime(s.best_sector_1)}
                          </td>
                          <td className={`p-3 text-right font-mono ${s.best_sector_2 === Math.min(...sectors.map(x => x.best_sector_2 || 999)) ? 'text-green-400' : ''}`}>
                            {formatTime(s.best_sector_2)}
                          </td>
                          <td className={`p-3 text-right font-mono ${s.best_sector_3 === Math.min(...sectors.map(x => x.best_sector_3 || 999)) ? 'text-green-400' : ''}`}>
                            {formatTime(s.best_sector_3)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{formatTime(s.best_lap)}</td>
                          <td className="p-3 text-right text-muted-foreground">{s.total_laps}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ── Qualifying Evolution ── */}
        {isQualifying && qualiDrivers.length > 0 && (
          <TabsContent value="quali" className="mt-4">
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  Qualifying Evolution — {qualiSegments.join(' → ')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pos</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      {qualiSegments.map(seg => (
                        <th key={seg} className="text-right p-3 text-xs font-medium text-muted-foreground">{seg}</th>
                      ))}
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualiDrivers
                      .sort((a, b) => (a.best_laps[qualiSegments[qualiSegments.length - 1]] || 999) - (b.best_laps[qualiSegments[qualiSegments.length - 1]] || 999))
                      .map((d, i) => (
                        <tr key={d.driver_number} className="border-b border-border hover:bg-muted/30 text-sm">
                          <td className="p-3 font-bold text-muted-foreground">#{i + 1}</td>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                              <span className="font-medium">{d.acronym}</span>
                              <span className="text-xs text-muted-foreground">{d.team_name}</span>
                            </span>
                          </td>
                          {qualiSegments.map(seg => (
                            <td key={seg} className="p-3 text-right font-mono">
                              {d.best_laps[seg] ? formatTime(d.best_laps[seg]) : '-'}
                            </td>
                          ))}
                          <td className={`p-3 text-right font-mono ${d.total_improvement < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {d.total_improvement ? `${d.total_improvement.toFixed(3)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ── Pit Strategy / Undercut ── */}
        {isRaceSprint && pitStrategyDrivers.length > 0 && (
          <TabsContent value="pit-strategy" className="mt-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-500" />
                Pit Strategy — Undercut Analysis
              </h3>
              {/* Undercut Opportunities */}
              {undercutOpps.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Undercut Opportunities</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Defender</th>
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Attacker</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Pit Lap</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Delta</th>
                          <th className="text-center p-2 text-xs font-medium text-muted-foreground">Position Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {undercutOpps.map((uo, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/30">
                            <td className="p-2 font-medium">{uo.defending_driver}</td>
                            <td className="p-2 font-medium text-green-400">{uo.attacking_driver}</td>
                            <td className="p-2 text-right">L{uo.pit_lap}</td>
                            <td className={`p-2 text-right font-mono ${(uo.undercut_delta || 0) < -1 ? 'text-green-400' : 'text-red-400'}`}>
                              {uo.undercut_delta?.toFixed(2)}s
                            </td>
                            <td className="p-2 text-center">
                              {uo.position_changed ? <Badge className="bg-green-500/10 text-green-500 border-green-500/30">✅ Overtook</Badge> :
                                <Badge variant="outline" className="text-muted-foreground">—</Badge>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Per-Driver Pit Analysis */}
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Per-Driver Pit Stops</h4>
              <div className="space-y-4">
                {pitStrategyDrivers.map(d => (
                  <div key={d.driver_number} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                        <span className="font-semibold">{d.acronym}</span>
                        <span className="text-xs text-muted-foreground">{d.team_name}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Avg pit: <span className="font-mono font-medium text-foreground">{d.avg_pit_duration.toFixed(1)}s</span></span>
                        <span>Total: <span className="font-mono font-medium text-foreground">{d.total_pit_time.toFixed(0)}s</span></span>
                      </div>
                    </div>
                    {d.strategy_summary && (
                      <p className="text-xs text-muted-foreground mb-2 italic">{d.strategy_summary}</p>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-1.5 text-muted-foreground">Lap</th>
                            <th className="text-right p-1.5 text-muted-foreground">In Lap</th>
                            <th className="text-right p-1.5 text-muted-foreground">Out Lap</th>
                            <th className="text-right p-1.5 text-muted-foreground">Prev Lap</th>
                            <th className="text-right p-1.5 text-muted-foreground">Avg Before</th>
                            <th className="text-right p-1.5 text-muted-foreground">Avg After</th>
                            <th className="text-center p-1.5 text-muted-foreground">Pos Δ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.pit_analysis.map((pa, j) => (
                            <tr key={j} className="border-b border-border hover:bg-muted/30">
                              <td className="p-1.5 font-medium">L{pa.lap_number}</td>
                              <td className="p-1.5 text-right font-mono">{pa.in_lap_time.toFixed(1)}</td>
                              <td className="p-1.5 text-right font-mono">{pa.out_lap_time.toFixed(1)}</td>
                              <td className="p-1.5 text-right font-mono">{pa.prev_lap_time.toFixed(1)}</td>
                              <td className="p-1.5 text-right font-mono">{pa.avg_before.toFixed(1)}</td>
                              <td className="p-1.5 text-right font-mono">{pa.avg_after.toFixed(1)}</td>
                              <td className={`p-1.5 text-center font-mono ${(pa.position_change || 0) > 0 ? 'text-green-400' : pa.position_change < 0 ? 'text-red-400' : ''}`}>
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
            </Card>
          </TabsContent>
        )}

        {/* ── Overtake Mode Analysis ── */}
        {isRaceSprint && omDrivers.length > 0 && (
          <TabsContent value="overtake-mode" className="mt-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Overtake Mode Analysis (2026)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {overtakeMode?.note || 'Overtake Mode replaces DRS — ERS electrical boost when within 1s of car ahead.'}
              </p>
              {omDrivers.length > 0 && (
                <>
                  {/* Top Overtake Mode Users */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Top Overtake Mode Usage</h4>
                    <div className="space-y-2">
                      {topOm.slice(0, 10).map(d => (
                        <div key={d.driver_number} className="flex items-center gap-3">
                          <div className="w-16 shrink-0 text-right">
                            <span className="text-xs font-medium" style={{ color: teamColor(d.team_colour) }}>
                              {d.acronym}
                            </span>
                          </div>
                          <div className="flex-1 bg-secondary rounded-full h-5 overflow-hidden">
                            <div className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                              style={{ width: `${Math.min(d.om_percentage, 100)}%`, background: teamColor(d.team_colour) }}>
                              {d.om_percentage > 15 && `${d.om_percentage.toFixed(1)}%`}
                            </div>
                          </div>
                          <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                            {d.speed_gain > 0 ? `+${d.speed_gain.toFixed(1)} km/h` : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Overtake Mode Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Activations</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">OM %</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Avg w/ OM</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Avg w/o OM</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Speed Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {omDrivers.sort((a, b) => b.om_percentage - a.om_percentage).map(d => (
                          <tr key={d.driver_number} className="border-b border-border hover:bg-muted/30">
                            <td className="p-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                                <span className="font-medium">{d.acronym}</span>
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono">{d.om_activations}</td>
                            <td className="p-2 text-right font-mono">{d.om_percentage.toFixed(1)}%</td>
                            <td className="p-2 text-right font-mono">{d.avg_speed_om?.toFixed(0)}</td>
                            <td className="p-2 text-right font-mono">{d.avg_speed_non_om?.toFixed(0)}</td>
                            <td className="p-2 text-right font-mono text-green-400">+{d.speed_gain.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        )}

        {/* ── Pit Stops ── */}
        <TabsContent value="pits" className="mt-4">
          <Card className="overflow-hidden">
            {pits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No pit stop data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Lap</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Duration</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Compound</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pits.slice(0, 50).map((p, i) => {
                      const drv = driverMap[p.driver_number];
                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: teamColor(drv?.team_colour) }} />
                              {drv?.name_acronym || p.driver_number}
                            </span>
                          </td>
                          <td className="p-3 text-right">L{p.lap_number}</td>
                          <td className={`p-3 text-right font-mono ${(p.pit_duration || 0) <= 22 ? 'text-green-400 font-bold' : ''}`}>
                            {p.pit_duration?.toFixed(1)}s
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px]">{p.compound}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Weather ── */}
        {weather.length > 0 && (
          <TabsContent value="weather" className="mt-4">
            <Card className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {Math.round(weather.reduce((s, w) => s + (w.air_temp || 0), 0) / weather.length)}°
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Air Temp</p>
                </div>
                <div className="text-center">
                  <Gauge className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {Math.round(weather.reduce((s, w) => s + (w.track_temp || 0), 0) / weather.length)}°
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Track Temp</p>
                </div>
                <div className="text-center">
                  <Flag className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {weather.filter(w => w.rainfall).length > 0 ? '🌧️' : '☀️'}
                  </div>
                  <p className="text-xs text-muted-foreground">{weather.filter(w => w.rainfall).length > 0 ? 'Rain' : 'Dry'}</p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-muted-foreground">Sample</th>
                      <th className="text-right p-2 text-muted-foreground">Air</th>
                      <th className="text-right p-2 text-muted-foreground">Track</th>
                      <th className="text-right p-2 text-muted-foreground">Humidity</th>
                      <th className="text-center p-2 text-muted-foreground">Rain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weather.slice(0, 30).map((w, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2 text-muted-foreground">#{i + 1}</td>
                        <td className="p-2 text-right">{w.air_temp?.toFixed(1)}°</td>
                        <td className="p-2 text-right">{w.track_temp?.toFixed(1)}°</td>
                        <td className="p-2 text-right">{w.humidity != null ? `${w.humidity}%` : '-'}</td>
                        <td className="p-2 text-center">{w.rainfall ? '🌧️' : '☀️'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ── Race Director ── */}
        {raceControl.length > 0 && (
          <TabsContent value="flags" className="mt-4">
            <Card className="p-5">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
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
                            rc.flag === 'VSC' ? 'bg-blue-500/10 text-blue-500' :
                            ''
                          }`}>{rc.flag}</Badge>
                        </td>
                        <td className="p-2">{rc.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ── Telemetry ── */}
        {selectedDriver && (
          <TabsContent value="telemetry" className="mt-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                Telemetry — {driverMap[selectedDriver]?.name_acronym || `#${selectedDriver}`}
                <span className="text-xs font-normal text-muted-foreground">Click a driver card above to change</span>
              </h3>
              {telemetryLoading ? (
                <p className="text-center text-muted-foreground py-6">Loading telemetry...</p>
              ) : telemetry.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No telemetry available for this session</p>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-1.5 text-muted-foreground">Time</th>
                          <th className="text-right p-1.5 text-muted-foreground">Speed</th>
                          <th className="text-right p-1.5 text-muted-foreground">RPM</th>
                          <th className="text-right p-1.5 text-muted-foreground">Throttle</th>
                          <th className="text-right p-1.5 text-muted-foreground">Brake</th>
                          <th className="text-center p-1.5 text-muted-foreground">DRS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {telemetry.filter((t, i) => i % 50 === 0).slice(0, 100).map((t, i) => (
                          <tr key={i} className="border-b border-border font-mono">
                            <td className="p-1.5 text-muted-foreground">{(t.timestamp || '').toString().slice(-8)}</td>
                            <td className="p-1.5 text-right">{t.speed?.toFixed(0)}</td>
                            <td className="p-1.5 text-right">{t.rpm}</td>
                            <td className={`p-1.5 text-right ${(t.throttle || 0) > 80 ? 'text-green-400' : ''}`}>{t.throttle?.toFixed(0)}%</td>
                            <td className={`p-1.5 text-right ${(t.brake || 0) > 0 ? 'text-red-400' : ''}`}>{t.brake?.toFixed(0)}%</td>
                            <td className="p-1.5 text-center">{t.drs ? '✅' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Simple Speed Bar */}
                  <div className="mt-4">
                    <h4 className="text-xs text-muted-foreground mb-2">Speed Distribution</h4>
                    <div className="flex items-end gap-0.5 h-24">
                      {Array.from({ length: Math.min(60, Math.floor(telemetry.length / 100)) }).map((_, i) => {
                        const sample = telemetry[i * 100];
                        const maxSpeed = Math.max(...telemetry.map(t => t.speed || 0), 1);
                        const pct = (sample?.speed || 0) / maxSpeed * 100;
                        return (
                          <div key={i} className="flex-1 rounded-t transition-all duration-100"
                            style={{ height: `${pct}%`, background: pct > 80 ? '#e11d48' : pct > 50 ? '#eab308' : '#3b82f6' }}
                            title={`${sample?.speed?.toFixed(0)} km/h`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>0</span>
                      <span>{Math.max(...telemetry.map(t => t.speed || 0), 0).toFixed(0)} km/h</span>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
