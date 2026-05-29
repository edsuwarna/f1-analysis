import { useEffect, useState } from 'react';
import { getMeetings, getSessions, getLaps, getStints, getSessionDrivers, type Meeting, type Session, type Lap, type Stint, type SessionDriver } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, formatTime } from '@/lib/formatters';
import { Flame, Gauge, TrendingUp, Layers } from 'lucide-react';

function TyreBadge({ compound }: { compound: string }) {
  const c = (compound || '').toUpperCase();
  const colors: Record<string, string> = {
    SOFT: 'bg-red-500/15 text-red-400 border-red-500/30',
    MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    HARD: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    INTERMEDIATE: 'bg-green-500/15 text-green-400 border-green-500/30',
    WET: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[c] || ''}`}>
      {c.substring(0, 4)}
    </Badge>
  );
}

export default function RacePacePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | ''>('');
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [laps, setLaps] = useState<Lap[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMeetings(2026).then(setMeetings).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedMeeting) { setSessions([]); return; }
    getSessions(selectedMeeting)
      .then(s => s.filter(ses => ses.session_type === 'Race' || ses.session_name?.includes('Race')))
      .then(setSessions)
      .catch(console.error);
  }, [selectedMeeting]);

  useEffect(() => {
    if (!selectedSession) { setLaps([]); setStints([]); setDrivers([]); return; }
    setLoading(true);
    Promise.all([
      getLaps(selectedSession),
      getStints(selectedSession),
      getSessionDrivers(selectedSession),
    ]).then(([l, st, d]) => {
      setLaps(l);
      setStints(st);
      setDrivers(d);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [selectedSession]);

  const driverMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]));

  // Average pace per driver (race laps only, no pit in/out)
  const validLaps = laps.filter(l => !l.is_pit_out_lap && !l.is_pit_in_lap && l.lap_duration > 0);
  const driverPace = drivers.map(d => {
    const dl = validLaps.filter(l => l.driver_number === d.driver_number);
    if (dl.length < 2) return null;
    const times = dl.map(l => l.lap_duration);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const best = Math.min(...times);
    const worst = Math.max(...times);
    const stdDev = Math.sqrt(times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length);
    return { driver: d, avg, best, worst, stdDev, count: dl.length, laps: dl };
  }).filter(Boolean).sort((a, b) => a!.avg - b!.avg);

  // Stint analysis
  const driverStints = drivers.map(d => {
    const ds = stints.filter(s => s.driver_number === d.driver_number);
    return ds.length > 0 ? { driver: d, stints: ds.sort((a, b) => a.lap_start - b.lap_start) } : null;
  }).filter((x): x is { driver: SessionDriver; stints: Stint[] } => x !== null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Flame className="h-6 w-6 text-orange-500" />
        Race Pace
      </h1>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Grand Prix</label>
          <select
            className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
            value={selectedMeeting}
            onChange={e => { setSelectedMeeting(Number(e.target.value) || ''); setSelectedSession(''); }}
          >
            <option value="">Select a race...</option>
            {meetings.filter(m => !m.is_cancelled && m.circuit_name).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Session</label>
          <select
            className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
            value={selectedSession}
            onChange={e => setSelectedSession(Number(e.target.value) || '')}
            disabled={!selectedMeeting}
          >
            <option value="">Select a session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.session_name || s.session_type}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedSession && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">Select a race session to view pace analysis</p>
        </Card>
      )}

      {loading && <div className="text-center p-12 text-muted-foreground">Loading pace data...</div>}

      {driverPace.length > 0 && (
        <Tabs defaultValue="pace">
          <TabsList>
            <TabsTrigger value="pace">Average Pace</TabsTrigger>
            <TabsTrigger value="consistency">Consistency</TabsTrigger>
            <TabsTrigger value="stints">Stint Analysis</TabsTrigger>
          </TabsList>

          {/* Average Pace Table */}
          <TabsContent value="pace" className="mt-4">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pos</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Avg Pace</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Best Lap</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Worst Lap</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Laps</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Gap to Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverPace.map((stat, i) => {
                      const isLeader = i === 0;
                      const gap = isLeader ? 0 : stat!.avg - driverPace[0]!.avg;
                      return (
                        <tr key={stat!.driver.driver_number} className={`border-b border-border hover:bg-muted/30 transition-colors text-sm ${i % 2 === 0 ? 'bg-muted/5' : ''}`}>
                          <td className="p-3">
                            <span className={`font-bold ${i < 3 ? 'text-lg' : ''}`}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(stat!.driver.team_colour) }} />
                              <span className="font-medium">{stat!.driver.name_acronym}</span>
                              <span className="text-xs text-muted-foreground hidden md:inline">{stat!.driver.full_name}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold">{formatTime(stat!.avg)}</td>
                          <td className="p-3 text-right font-mono text-green-400">{formatTime(stat!.best)}</td>
                          <td className="p-3 text-right font-mono text-red-400">{formatTime(stat!.worst)}</td>
                          <td className="p-3 text-right">{stat!.count}</td>
                          <td className="p-3 text-center font-mono">
                            {isLeader ? (
                              <span className="text-green-400">—</span>
                            ) : (
                              <span className="text-orange-400">+{gap.toFixed(3)}s</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Consistency Analysis */}
          <TabsContent value="consistency" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Least consistent (highest std dev) */}
              <Card className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Least Consistent
                </h3>
                <div className="space-y-2">
                  {[...driverPace].sort((a, b) => b!.stdDev - a!.stdDev).slice(0, 5).map(stat => (
                    <div key={stat!.driver.driver_number} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full" style={{ background: teamColor(stat!.driver.team_colour) }} />
                      <span className="flex-1 font-medium">{stat!.driver.name_acronym}</span>
                      <span className="font-mono text-red-400">±{stat!.stdDev.toFixed(3)}s</span>
                    </div>
                  ))}
                </div>
              </Card>
              {/* Most consistent (lowest std dev) */}
              <Card className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Most Consistent
                </h3>
                <div className="space-y-2">
                  {driverPace.slice(0, 5).map(stat => (
                    <div key={stat!.driver.driver_number} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 rounded-full" style={{ background: teamColor(stat!.driver.team_colour) }} />
                      <span className="flex-1 font-medium">{stat!.driver.name_acronym}</span>
                      <span className="font-mono text-green-400">±{stat!.stdDev.toFixed(3)}s</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* All consistency table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Avg Pace</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Std Dev</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Best - Avg</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Worst - Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...driverPace].sort((a, b) => a!.stdDev - b!.stdDev).map((stat, i) => {
                      const bestGap = stat!.best - stat!.avg;
                      const worstGap = stat!.worst - stat!.avg;
                      return (
                        <tr key={stat!.driver.driver_number} className="border-b border-border hover:bg-muted/30 text-sm">
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: teamColor(stat!.driver.team_colour) }} />
                              <span className="font-medium">{stat!.driver.name_acronym}</span>
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">{formatTime(stat!.avg)}</td>
                          <td className="p-3 text-right font-mono font-bold">{stat!.stdDev.toFixed(3)}s</td>
                          <td className="p-3 text-right font-mono text-green-500">-{Math.abs(bestGap).toFixed(3)}s</td>
                          <td className="p-3 text-right font-mono text-red-500">+{worstGap.toFixed(3)}s</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Stint Analysis */}
          <TabsContent value="stints" className="mt-4">
            <div className="space-y-3">
              {driverStints.map(({ driver, stints: ds }) => {
                const totalLaps = ds.reduce((s, st) => s + (st.lap_end - st.lap_start + 1), 0);
                return (
                  <Card key={driver.driver_number} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(driver.team_colour) }} />
                        <span className="font-semibold">{driver.name_acronym}</span>
                        <span className="text-xs text-muted-foreground">{driver.full_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{ds.length} stints · {totalLaps} laps</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ds.map((stint, si) => {
                        const stintLaps = validLaps.filter(l =>
                          l.driver_number === driver.driver_number &&
                          l.lap_number >= stint.lap_start &&
                          l.lap_number <= stint.lap_end
                        );
                        const avgStint = stintLaps.length > 0
                          ? stintLaps.reduce((s, l) => s + l.lap_duration, 0) / stintLaps.length
                          : 0;
                        return (
                          <div key={si} className="rounded-md border border-border p-2.5 text-xs min-w-[120px]">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Layers className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">Stint {si + 1}</span>
                            </div>
                            <TyreBadge compound={stint.compound} />
                            <div className="mt-1 text-muted-foreground">
                              L{stint.lap_start}–L{stint.lap_end}
                              <span className="ml-1">({stint.lap_end - stint.lap_start + 1} laps)</span>
                            </div>
                            {avgStint > 0 && (
                              <div className="text-muted-foreground mt-0.5">
                                Avg: <span className="font-mono text-foreground">{formatTime(avgStint)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
