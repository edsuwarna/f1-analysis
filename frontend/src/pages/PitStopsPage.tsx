import { useEffect, useState } from 'react';
import { getMeetings, getSessions, getPitStops, getSessionDrivers, getPitStopChampionship, type Meeting, type Session, type PitStop, type SessionDriver } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor } from '@/lib/formatters';
import { Flag, Timer, Zap, Gauge, Building2 } from 'lucide-react';

export default function PitStopsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<number | ''>('');
  const [selectedSession, setSelectedSession] = useState<number | ''>('');
  const [pits, setPits] = useState<PitStop[]>([]);
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamChampionship, setTeamChampionship] = useState<any>(null);

  useEffect(() => {
    getMeetings(2026).then(setMeetings).catch(console.error);
    getPitStopChampionship(2026).then(setTeamChampionship).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMeeting) {
      setSessions([]);
      return;
    }
    getSessions(selectedMeeting)
      .then(s => s.filter(ses => ses.session_type === 'Race' || ses.session_name?.includes('Race')))
      .then(setSessions)
      .catch(console.error);
  }, [selectedMeeting]);

  useEffect(() => {
    if (!selectedSession) {
      setPits([]);
      setDrivers([]);
      return;
    }
    setLoading(true);
    Promise.all([
      getPitStops(selectedSession),
      getSessionDrivers(selectedSession),
    ]).then(([p, d]) => {
      setPits(p);
      setDrivers(d);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [selectedSession]);

  const driverMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]));
  const fastestStop = pits.length > 0 ? Math.min(...pits.map(p => p.pit_duration || 99)) : null;
  const avgStop = pits.length > 0 ? pits.reduce((s, p) => s + (p.pit_duration || 0), 0) / pits.length : null;

  // Per-driver aggregation
  const driverPitStats = drivers.map(d => {
    const driverPits = pits.filter(p => p.driver_number === d.driver_number);
    if (driverPits.length === 0) return null;
    const times = driverPits.map(p => p.pit_duration || 0);
    return {
      driver: d,
      stops: driverPits.length,
      fastest: Math.min(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      total: times.reduce((a, b) => a + b, 0),
      laps: driverPits.map(p => p.lap_number),
    };
  }).filter(Boolean).sort((a, b) => a!.avg - b!.avg);

  // Fastest stops ranking
  const fastestStops = [...pits]
    .filter(p => p.pit_duration > 0)
    .sort((a, b) => (a.pit_duration || 99) - (b.pit_duration || 99))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Flag className="h-6 w-6 text-red-500" />
        Pit Stops
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
          <p className="text-lg font-medium">Select a race session to view pit stop data</p>
        </Card>
      )}

      {loading && (
        <div className="text-center p-12 text-muted-foreground">Loading pit stop data...</div>
      )}

      {selectedSession && !loading && pits.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">No pit stop data available for this session</p>
        </Card>
      )}

      {pits.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs uppercase">Fastest Stop</span>
              </div>
              <p className="text-2xl font-bold text-green-400">
                {fastestStop?.toFixed(1)}<span className="text-sm text-muted-foreground">s</span>
              </p>
              {(() => {
                const fs = pits.find(p => (p.pit_duration || 99) === fastestStop);
                const fd = fs ? driverMap[fs.driver_number] : null;
                return fd ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ background: teamColor(fd.team_colour) }} />
                    {fd.name_acronym} · L{fs!.lap_number}
                  </p>
                ) : null;
              })()}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Timer className="h-4 w-4 text-blue-500" />
                <span className="text-xs uppercase">Avg Stop</span>
              </div>
              <p className="text-2xl font-bold">
                {avgStop?.toFixed(1)}<span className="text-sm text-muted-foreground">s</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Across all drivers</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Flag className="h-4 w-4 text-orange-500" />
                <span className="text-xs uppercase">Total Stops</span>
              </div>
              <p className="text-2xl font-bold">{pits.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{drivers.length} drivers</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Gauge className="h-4 w-4 text-purple-500" />
                <span className="text-xs uppercase">Quickest Team</span>
              </div>
              {(() => {
                const byTeam: Record<string, number[]> = {};
                pits.forEach(p => {
                  const d = driverMap[p.driver_number];
                  const team = d?.team_name || 'Unknown';
                  if (!byTeam[team]) byTeam[team] = [];
                  byTeam[team].push(p.pit_duration || 0);
                });
                const teamAvgs = Object.entries(byTeam)
                  .map(([team, times]) => ({ team, avg: times.reduce((a, b) => a + b, 0) / times.length }))
                  .sort((a, b) => a.avg - b.avg);
                const best = teamAvgs[0];
                return best ? (
                  <>
                    <p className="text-xl font-bold truncate" style={{ color: teamColor(
                      drivers.find(d => d.team_name === best.team)?.team_colour
                    ) }}>{best.team}</p>
                    <p className="text-xs text-muted-foreground mt-1">{best.avg.toFixed(1)}s avg</p>
                  </>
                ) : <p className="text-muted-foreground">-</p>;
              })()}
            </Card>
          </div>

          <Tabs defaultValue="driver-stats">
            <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
              <TabsTrigger value="driver-stats" className="whitespace-nowrap">Per Driver</TabsTrigger>
              <TabsTrigger value="fastest" className="whitespace-nowrap">Fastest Stops</TabsTrigger>
              <TabsTrigger value="all" className="whitespace-nowrap">All Stops</TabsTrigger>
              {teamChampionship && <TabsTrigger value="teams" className="whitespace-nowrap">Team Standings</TabsTrigger>}
            </TabsList>

            {/* Per Driver Stats */}
            <TabsContent value="driver-stats" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stops</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Fastest</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Average</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total Pit Time</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driverPitStats.map((stat, i) => (
                        <tr key={stat!.driver.driver_number} className={`border-b border-border hover:bg-muted/30 transition-colors text-sm ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: teamColor(stat!.driver.team_colour) }} />
                              <span className="font-medium">{stat!.driver.full_name}</span>
                              <span className="text-xs text-muted-foreground">({stat!.driver.name_acronym})</span>
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold">{stat!.stops}</td>
                          <td className="p-3 text-right font-mono text-green-400">{stat!.fastest.toFixed(1)}s</td>
                          <td className="p-3 text-right font-mono">{stat!.avg.toFixed(1)}s</td>
                          <td className="p-3 text-right font-mono">{stat!.total.toFixed(0)}s</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex gap-1">
                              {stat!.laps.map((lap, li) => (
                                <Badge key={li} variant="outline" className="text-[10px] font-mono">
                                  L{lap}
                                </Badge>
                              ))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* Fastest Stops */}
            <TabsContent value="fastest" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">#</th>
                        <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Lap</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fastestStops.map((p, i) => {
                        const d = driverMap[p.driver_number];
                        return (
                          <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                            <td className="p-3">
                              <span className={`font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: teamColor(d?.team_colour) }} />
                                {d?.name_acronym || p.driver_number}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono">L{p.lap_number}</td>
                            <td className="p-3 text-right font-mono font-bold text-green-400">
                              {p.pit_duration?.toFixed(2)}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* All Stops */}
            <TabsContent value="all" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Lap</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pits.sort((a, b) => a.lap_number - b.lap_number).map((p, i) => {
                        const d = driverMap[p.driver_number];
                        return (
                          <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                            <td className="p-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: teamColor(d?.team_colour) }} />
                                {d?.name_acronym || p.driver_number}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono">L{p.lap_number}</td>
                            <td className={`p-2 text-right font-mono ${(p.pit_duration || 0) <= 20 ? 'text-green-400 font-bold' : ''}`}>
                              {p.pit_duration?.toFixed(2)}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
            {/* Team Standings */}
            {teamChampionship && (
              <TabsContent value="teams" className="mt-4">
                <Card className="overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-500" />
                      Pit Stop Championship — {teamChampionship.year}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {teamChampionship.total_stops} total pit stops across {teamChampionship.total_teams} teams
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pos</th>
                          <th className="text-left p-3 text-xs font-medium text-muted-foreground">Team</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Stops</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Avg</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Fastest</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Slowest</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">σ</th>
                          <th className="text-right p-3 text-xs font-medium text-muted-foreground">Consistency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(teamChampionship.teams || [])
                          .sort((a: any, b: any) => a.avg_pit_duration - b.avg_pit_duration)
                          .map((team: any, i: number) => (
                            <tr key={team.team_name} className={`border-b border-border text-sm ${i < 3 ? 'bg-green-500/5' : 'hover:bg-muted/30'}`}>
                              <td className="p-3">
                                <span className={`font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(team.team_colour) }} />
                                  <span className="font-medium">{team.team_name}</span>
                                </span>
                              </td>
                              <td className="p-3 text-right font-semibold">{team.total_stops}</td>
                              <td className="p-3 text-right font-mono">{team.avg_pit_duration.toFixed(2)}s</td>
                              <td className="p-3 text-right font-mono text-green-400">{team.fastest_stop.toFixed(1)}s</td>
                              <td className="p-3 text-right font-mono text-red-400">{team.slowest_stop.toFixed(1)}s</td>
                              <td className="p-3 text-right font-mono text-muted-foreground">{team.std_dev.toFixed(2)}</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 bg-secondary rounded-full h-2">
                                    <div className="h-2 rounded-full" style={{
                                      width: `${Math.max(0, Math.min(100, team.consistency))}%`,
                                      background: team.consistency >= 85 ? '#22c55e' : team.consistency >= 75 ? '#eab308' : '#ef4444',
                                    }} />
                                  </div>
                                  <span className={`text-xs font-mono ${team.consistency >= 85 ? 'text-green-400' : team.consistency >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    {team.consistency.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {teamChampionship.overall_fastest_stop && (
                    <div className="p-3 border-t border-border text-xs text-muted-foreground">
                      🏆 Fastest stop: <span className="font-semibold text-foreground">{teamChampionship.overall_fastest_stop[1]}</span> ({teamChampionship.overall_fastest_stop[0]}s) —
                      L{teamChampionship.overall_fastest_stop[2]?.lap_number} by {teamChampionship.overall_fastest_stop[2]?.acronym} at {teamChampionship.overall_fastest_stop[2]?.race_name}
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
