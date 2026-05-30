import { useEffect, useState } from 'react';
import { getDriverStandings, getConstructorStandings, getSectorTrends, getConstructorProgression, type StandingRow, type ConstructorStandingRow, type RaceResult, type SectorTrend, type ConstructorProgressionRound } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor, formatTime } from '@/lib/formatters';
import { Trophy, Users, ChevronDown, ChevronRight, Table2, BarChart3, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RaceResultEntry {
  meeting_id: number;
  race_name: string;
  country_code: string;
  results: Array<{
    driver_number: number;
    position: number;
    points: number;
    acronym: string;
    team_name: string;
    team_colour: string;
    session_name?: string;
  }>;
}

interface ChampionshipData {
  year: number;
  races_completed: number;
  driver_standings: StandingRow[];
  constructor_standings: ConstructorStandingRow[];
  races: RaceResultEntry[];
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function StandingsPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');
  const [championship, setChampionship] = useState<ChampionshipData | null>(null);
  const [driverOpen, setDriverOpen] = useState(true);
  const [constructorOpen, setConstructorOpen] = useState(false);
  const [ppwOpen, setPpwOpen] = useState(false);
  const [conPpwOpen, setConPpwOpen] = useState(false);
  const [conProgOpen, setConProgOpen] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());

  // Constructor Progression
  const [conProgression, setConProgression] = useState<ConstructorProgressionRound[]>([]);
  const [allProgTeams, setAllProgTeams] = useState<Array<{team_name: string; colour: string; total_points: number}>>([]);
  const [selectedProgTeams, setSelectedProgTeams] = useState<Set<string>>(new Set());
  const [showConProg, setShowConProg] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/analytics/championship?year=${year}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: ChampionshipData = await res.json();
        // Normalize acronym field
        data.driver_standings = data.driver_standings.map(d => ({
          ...d,
          name_acronym: (d as any).acronym || d.name_acronym || d.full_name?.substring(0, 3)?.toUpperCase() || '',
        }));
        setChampionship(data);
        // Load constructor progression
        try {
          const progData = await getConstructorProgression(parseInt(year));
          if (progData?.rounds) {
            setConProgression(progData.rounds);
            setAllProgTeams(progData.teams || []);
          }
        } catch (e) {
          console.error('Constructor progression load error:', e);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  const drivers = championship?.driver_standings || [];
  const constructors = championship?.constructor_standings || [];
  const races = championship?.races || [];

  // ── Points Per Week (PPW) heatmap data ──
  const ppwRaces = [...races].reverse(); // chronological order
  const ppwRaceNames = ppwRaces.map(r => r.race_name);
  const ppwCountryCodes = ppwRaces.map(r => r.country_code || r.race_name.slice(0, 3).toUpperCase());

  // Build per-driver ppw data: { raceName: { driverNumber: { race: pts, sprint: pts } } }
  const ppwData: Record<string, Record<number, { race: number; sprint: number }>> = {};
  const allPpwDrivers = new Set<number>();
  for (const race of ppwRaces) {
    const driverPts: Record<number, { race: number; sprint: number }> = {};
    for (const r of race.results) {
      const dn = r.driver_number;
      allPpwDrivers.add(dn);
      if (!driverPts[dn]) driverPts[dn] = { race: 0, sprint: 0 };
      if (r.session_name === 'Sprint') {
        driverPts[dn].sprint += r.points || 0;
      } else {
        driverPts[dn].race += r.points || 0;
      }
    }
    ppwData[race.race_name] = driverPts;
  }

  // Sort drivers by total points
  const ppwDriverList = [...allPpwDrivers].sort((a, b) => {
    const aPts = drivers.find(d => d.driver_number === a)?.points || 0;
    const bPts = drivers.find(d => d.driver_number === b)?.points || 0;
    return bPts - aPts;
  });

  // Max race pts for normalization
  let maxRacePts = 0;
  for (const rn of ppwRaceNames) {
    for (const dn of ppwDriverList) {
      const p = ppwData[rn]?.[dn];
      if (p) maxRacePts = Math.max(maxRacePts, p.race);
    }
  }
  maxRacePts = Math.max(maxRacePts, 1);

  // ── Constructor PPW ──
  const ppwConData: Record<string, Record<string, { race: number; sprint: number }>> = {};
  const allPpwCons = new Set<string>();
  for (const race of ppwRaces) {
    const teamPts: Record<string, { race: number; sprint: number }> = {};
    for (const r of race.results) {
      const team = r.team_name || 'Unknown';
      allPpwCons.add(team);
      if (!teamPts[team]) teamPts[team] = { race: 0, sprint: 0 };
      if (r.session_name === 'Sprint') {
        teamPts[team].sprint += r.points || 0;
      } else {
        teamPts[team].race += r.points || 0;
      }
    }
    ppwConData[race.race_name] = teamPts;
  }

  const ppwConList = [...allPpwCons].sort((a, b) => {
    const aPts = constructors.find(c => c.team_name === a)?.points || 0;
    const bPts = constructors.find(c => c.team_name === b)?.points || 0;
    return bPts - aPts;
  });

  let maxConRacePts = 0;
  for (const rn of ppwRaceNames) {
    for (const tn of ppwConList) {
      const p = ppwConData[rn]?.[tn];
      if (p) maxConRacePts = Math.max(maxConRacePts, p.race);
    }
  }
  maxConRacePts = Math.max(maxConRacePts, 1);

  // ── Toggle helper ──
  function toggleDriver(dn: number) {
    setSelectedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(dn)) next.delete(dn);
      else next.add(dn);
      return next;
    });
  }
  function toggleTeam(tn: string) {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn);
      else next.add(tn);
      return next;
    });
  }
  function toggleProgTeam(tn: string) {
    setSelectedProgTeams(prev => {
      const next = new Set(prev);
      if (next.has(tn)) next.delete(tn);
      else next.add(tn);
      return next;
    });
    setShowConProg(false);
  }
  function selectAllProgTeams() {
    setSelectedProgTeams(new Set(allProgTeams.map(t => t.team_name)));
    setShowConProg(false);
  }
  function clearProgTeams() {
    setSelectedProgTeams(new Set());
    setShowConProg(false);
  }

  // Default: first 10 selected
  if (selectedDrivers.size === 0 && ppwDriverList.length > 0) {
    setSelectedDrivers(new Set(ppwDriverList.slice(0, 10)));
  }
  if (selectedTeams.size === 0 && ppwConList.length > 0) {
    setSelectedTeams(new Set(ppwConList.slice(0, 10)));
  }
  if (selectedProgTeams.size === 0 && allProgTeams.length > 0) {
    setSelectedProgTeams(new Set(allProgTeams.slice(0, 10).map(t => t.team_name)));
  }

  const cellW = Math.max(48, Math.min(72, Math.max(600 / ppwRaceNames.length, 44)));
  const cellH = 34;

  // ── Constructor Progression Chart Data ──
  const conProgChartData = (() => {
    if (!conProgression || selectedProgTeams.size === 0) return [];
    return conProgression.map(round => {
      const point: Record<string, any> = { round: round.round, race_name: round.race_name };
      for (const s of round.standings || []) {
        if (selectedProgTeams.has(s.team_name)) {
          point[s.team_name] = s.cumulative_points;
          point[`${s.team_name}_colour`] = s.colour;
        }
      }
      return point;
    });
  })();
  const selectedProgTeamList = allProgTeams.filter(t => selectedProgTeams.has(t.team_name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Standings
        </h1>
        <div className="flex items-center gap-3">
          {championship && (
            <span className="text-xs text-muted-foreground">
              {championship.races_completed} races
            </span>
          )}
          <select
            className="bg-secondary text-foreground border border-border rounded-md px-3 py-1.5 text-sm"
            value={year}
            onChange={e => setYear(e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading standings...</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* ── Driver Standings ── */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setDriverOpen(!driverOpen)}
              className="w-full flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors text-left"
            >
              {driverOpen ? <ChevronDown className="h-5 w-5 text-yellow-500" /> : <ChevronRight className="h-5 w-5 text-yellow-500" />}
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-base">Driver Standings</span>
              <Badge variant="secondary" className="ml-auto text-xs">{drivers.length} drivers</Badge>
            </button>

            {driverOpen && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase w-12">Pos</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Driver</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Team</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Pts</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Wins</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No data available</td></tr>
                    ) : (
                      drivers.map((d, i) => {
                        const avgFinish = races.length > 0 ? (d.points / races.length).toFixed(1) : '-';
                        return (
                          <tr key={d.driver_number} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <span className={`font-bold text-sm ${
                                i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                              }`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${d.position}`}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: teamColor(d.team_colour) }} />
                                <div>
                                  <div className="font-semibold text-sm">{d.name_acronym}</div>
                                  <div className="text-xs text-muted-foreground">{d.full_name} {flagEmoji(d.country_code)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 hidden sm:table-cell">
                              <span className="text-sm text-muted-foreground">{d.team_name}</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="font-bold text-lg">{d.points}</span>
                            </td>
                            <td className="p-3 text-right hidden md:table-cell">
                              {d.wins > 0 ? <Badge variant="secondary">{d.wins}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                            </td>
                            <td className="p-3 text-right hidden lg:table-cell">
                              <span className="text-sm text-muted-foreground">{avgFinish}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Points Per Weekend: Driver Heatmap ── */}
          {drivers.length > 0 && races.length > 0 && (
            <Card className="overflow-hidden">
              <button
                onClick={() => setPpwOpen(!ppwOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border"
              >
                {ppwOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-primary" />}
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Driver Points Per Weekend</span>
                <Badge variant="outline" className="text-xs ml-auto">{ppwRaceNames.length} races</Badge>
                <Badge variant="secondary" className="text-xs">{ppwDriverList.length} drivers</Badge>
              </button>

              {ppwOpen && (
                <div className="p-4">
                  {/* Driver Checkboxes */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {ppwDriverList.map(dn => {
                      const d = drivers.find(x => x.driver_number === dn);
                      const acronym = d?.name_acronym || `#${dn}`;
                      const colour = d?.team_colour ? teamColor(d.team_colour) : '#666';
                      const isChecked = selectedDrivers.has(dn);
                      return (
                        <button
                          key={dn}
                          onClick={() => toggleDriver(dn)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all border ${
                            isChecked ? 'border-border font-medium' : 'border-transparent opacity-40 hover:opacity-60'
                          }`}
                          style={isChecked ? { background: `${colour}20`, borderColor: `${colour}60`, color: colour } : {}}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                          {acronym}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setSelectedDrivers(new Set(ppwDriverList))}
                      className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedDrivers(new Set())}
                      className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-3 text-[10px] text-muted-foreground">
                    <span>🏁 Main = Race pts</span>
                    <span>⚡ Small below = Sprint pts</span>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <div style={{ minWidth: `${48 + ppwRaceNames.length * cellW + 36}px` }}>
                      {/* Header Row */}
                      <div className="flex gap-0.5 mb-1" style={{ paddingLeft: 48 }}>
                        {ppwRaceNames.map((rn, ci) => (
                          <div
                            key={ci}
                            className="text-[9px] font-bold text-muted-foreground text-center truncate"
                            style={{ width: cellW }}
                            title={rn}
                          >
                            {ppwCountryCodes[ci]}
                          </div>
                        ))}
                        <div className="text-[9px] font-bold text-muted-foreground text-center" style={{ width: 36 }}>Tot</div>
                      </div>

                      {/* Driver Rows */}
                      {ppwDriverList.filter(dn => selectedDrivers.has(dn)).map(dn => {
                        const d = drivers.find(x => x.driver_number === dn);
                        const acronym = d?.name_acronym || `#${dn}`;
                        const baseColor = d?.team_colour ? teamColor(d.team_colour) : '#666';
                        const rgb = baseColor.replace('#', '');
                        const r = parseInt(rgb.slice(0,2), 16);
                        const g = parseInt(rgb.slice(2,4), 16);
                        const b = parseInt(rgb.slice(4,6), 16);

                        let rowTotal = 0;
                        const cells = ppwRaceNames.map(rn => {
                          const p = ppwData[rn]?.[dn];
                          const racePts = p?.race || 0;
                          const sprintPts = p?.sprint || 0;
                          const pts = racePts + sprintPts;
                          rowTotal += pts;

                          if (pts === 0) {
                            return (
                              <div
                                key={rn}
                                className="flex items-center justify-center text-[9px] text-muted-foreground/30 rounded"
                                style={{ width: cellW, height: cellH, background: 'var(--secondary)' }}
                              >
                                0
                              </div>
                            );
                          }

                          const intensity = Math.min(1, racePts / maxRacePts);
                          const alpha = 0.15 + intensity * 0.85;
                          const cellBg = `rgba(${r},${g},${b},${alpha})`;
                          const textBrightness = (r*0.299 + g*0.587 + b*0.114) * alpha;
                          const cellTextColor = textBrightness > 80 ? '#000' : '#fff';

                          return (
                            <div
                              key={rn}
                              className="rounded flex flex-col items-center justify-center leading-tight"
                              style={{ width: cellW, height: cellH, background: cellBg, color: cellTextColor }}
                              title={`${acronym} - ${rn}: Race ${racePts} + Sprint ${sprintPts} = ${pts} pts`}
                            >
                              {sprintPts > 0 ? (
                                <>
                                  <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{racePts}</span>
                                  <span style={{ fontSize: 7, opacity: 0.85, lineHeight: 1.1 }}>+{sprintPts}</span>
                                </>
                              ) : (
                                <span style={{ fontSize: 10, fontWeight: 700 }}>{racePts}</span>
                              )}
                            </div>
                          );
                        });

                        return (
                          <div key={dn} className="flex items-center gap-0.5 mb-[1px]">
                            <div
                              className="text-[9px] font-semibold text-right pr-1.5 truncate"
                              style={{ width: 48, color: baseColor }}
                            >
                              {acronym}
                            </div>
                            {cells}
                            <div className="flex items-center justify-center text-[10px] font-bold" style={{ width: 36, color: baseColor }}>
                              {rowTotal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Constructor PPW Heatmap ── */}
          {constructors.length > 0 && races.length > 0 && (
            <Card className="overflow-hidden">
              <button
                onClick={() => setConPpwOpen(!conPpwOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border"
              >
                {conPpwOpen ? <ChevronDown className="h-4 w-4 text-blue-500" /> : <ChevronRight className="h-4 w-4 text-blue-500" />}
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Constructor Points Per Weekend</span>
                <Badge variant="outline" className="text-xs ml-auto">{ppwRaceNames.length} races</Badge>
                <Badge variant="secondary" className="text-xs">{ppwConList.length} teams</Badge>
              </button>

              {conPpwOpen && (
                <div className="p-4">
                  {/* Team Checkboxes */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {ppwConList.map(tn => {
                      const c = constructors.find(x => x.team_name === tn);
                      const colour = c?.team_colour ? teamColor(c.team_colour) : '#666';
                      const short = tn.replace(/Team|Racing|Racing Bulls/g, '').trim() || tn;
                      const isChecked = selectedTeams.has(tn);
                      return (
                        <button
                          key={tn}
                          onClick={() => toggleTeam(tn)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all border ${
                            isChecked ? 'border-border font-medium' : 'border-transparent opacity-40 hover:opacity-60'
                          }`}
                          style={isChecked ? { background: `${colour}20`, borderColor: `${colour}60`, color: colour } : {}}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                          {short}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setSelectedTeams(new Set(ppwConList))}
                      className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedTeams(new Set())}
                      className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mb-3 text-[10px] text-muted-foreground">
                    <span>🏁 Main = Race pts</span>
                    <span>⚡ Small below = Sprint pts</span>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                    <div style={{ minWidth: `${64 + ppwRaceNames.length * cellW + 36}px` }}>
                      {/* Header Row */}
                      <div className="flex gap-0.5 mb-1" style={{ paddingLeft: 64 }}>
                        {ppwRaceNames.map((rn, ci) => (
                          <div
                            key={ci}
                            className="text-[9px] font-bold text-muted-foreground text-center truncate"
                            style={{ width: cellW }}
                            title={rn}
                          >
                            {ppwCountryCodes[ci]}
                          </div>
                        ))}
                        <div className="text-[9px] font-bold text-muted-foreground text-center" style={{ width: 36 }}>Tot</div>
                      </div>

                      {/* Team Rows */}
                      {ppwConList.filter(tn => selectedTeams.has(tn)).map(tn => {
                        const c = constructors.find(x => x.team_name === tn);
                        const colour = c?.team_colour ? teamColor(c.team_colour) : '#666';
                        const short = tn.replace(/Team|Racing|Racing Bulls/g, '').trim() || tn;
                        const rgb = colour.replace('#', '');
                        const r = parseInt(rgb.slice(0,2), 16);
                        const g = parseInt(rgb.slice(2,4), 16);
                        const b = parseInt(rgb.slice(4,6), 16);

                        let rowTotal = 0;
                        const cells = ppwRaceNames.map(rn => {
                          const p = ppwConData[rn]?.[tn];
                          const racePts = p?.race || 0;
                          const sprintPts = p?.sprint || 0;
                          const pts = racePts + sprintPts;
                          rowTotal += pts;

                          if (pts === 0) {
                            return (
                              <div
                                key={rn}
                                className="flex items-center justify-center text-[9px] text-muted-foreground/30 rounded"
                                style={{ width: cellW, height: cellH, background: 'var(--secondary)' }}
                              >
                                0
                              </div>
                            );
                          }

                          const intensity = Math.min(1, racePts / maxConRacePts);
                          const alpha = 0.15 + intensity * 0.85;
                          const cellBg = `rgba(${r},${g},${b},${alpha})`;
                          const textBrightness = (r*0.299 + g*0.587 + b*0.114) * alpha;
                          const cellTextColor = textBrightness > 80 ? '#000' : '#fff';

                          return (
                            <div
                              key={rn}
                              className="rounded flex flex-col items-center justify-center leading-tight"
                              style={{ width: cellW, height: cellH, background: cellBg, color: cellTextColor }}
                              title={`${short} - ${rn}: Race ${racePts} + Sprint ${sprintPts} = ${pts} pts`}
                            >
                              {sprintPts > 0 ? (
                                <>
                                  <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{racePts}</span>
                                  <span style={{ fontSize: 7, opacity: 0.85, lineHeight: 1.1 }}>+{sprintPts}</span>
                                </>
                              ) : (
                                <span style={{ fontSize: 10, fontWeight: 700 }}>{racePts}</span>
                              )}
                            </div>
                          );
                        });

                        return (
                          <div key={tn} className="flex items-center gap-0.5 mb-[1px]">
                            <div className="text-[9px] font-semibold text-right pr-1.5 truncate" style={{ width: 64, color: colour }}>
                              {short}
                            </div>
                            {cells}
                            <div className="flex items-center justify-center text-[10px] font-bold" style={{ width: 36, color: colour }}>
                              {rowTotal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ── Constructor Standings Progression ── */}
          {allProgTeams.length > 0 && conProgression.length > 0 && (
            <Card className="overflow-hidden">
              <button
                onClick={() => setConProgOpen(!conProgOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border"
              >
                {conProgOpen ? <ChevronDown className="h-4 w-4 text-blue-500" /> : <ChevronRight className="h-4 w-4 text-blue-500" />}
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Constructor Standings Progression</span>
                <Badge variant="outline" className="text-xs ml-auto">{conProgression.length} rounds</Badge>
                <Badge variant="secondary" className="text-xs">{allProgTeams.length} teams</Badge>
              </button>

              {conProgOpen && (
                <div className="p-4 space-y-4">
                  {/* Team Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Select teams to plot:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAllProgTeams}
                          className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                        >
                          All
                        </button>
                        <button
                          onClick={clearProgTeams}
                          className="text-[11px] px-2 py-1 rounded-md text-muted-foreground hover:text-foreground border border-border/50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allProgTeams.map(t => {
                        const colour = t.colour ? teamColor(t.colour) : '#666';
                        const isChecked = selectedProgTeams.has(t.team_name);
                        const short = t.team_name.replace(/Team|Racing|Racing Bulls/g, '').trim() || t.team_name;
                        return (
                          <button
                            key={t.team_name}
                            onClick={() => toggleProgTeam(t.team_name)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all border ${
                              isChecked ? 'border-border font-medium' : 'border-transparent opacity-40 hover:opacity-60'
                            }`}
                            style={isChecked ? { background: `${colour}20`, borderColor: `${colour}60`, color: colour } : {}}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ background: colour }} />
                            {short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Plot Button */}
                  <button
                    onClick={() => setShowConProg(true)}
                    disabled={selectedProgTeams.size === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Plot ({selectedProgTeams.size} team{selectedProgTeams.size !== 1 ? 's' : ''})
                  </button>

                  {/* Chart */}
                  {showConProg && conProgChartData.length > 0 && (
                    <div className="pt-2">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={conProgChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="round"
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fontSize: 12 }}
                            label={{ value: 'Round', position: 'insideBottomRight', offset: -5, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
                          />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            tick={{ fontSize: 12 }}
                            label={{ value: 'Cumulative Points', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--card-foreground))',
                            }}
                            labelFormatter={(label) => `Round ${label}`}
                          />
                          <Legend />
                          {selectedProgTeamList.map(t => {
                            const colour = t.colour ? teamColor(t.colour) : '#666';
                            return (
                              <Line
                                key={t.team_name}
                                type="monotone"
                                dataKey={t.team_name}
                                name={t.team_name.replace(/Team|Racing|Racing Bulls/g, '').trim() || t.team_name}
                                stroke={colour}
                                strokeWidth={2}
                                dot={{ r: 3, fill: colour }}
                                activeDot={{ r: 5, fill: colour }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ── Constructor Standings ── */}
          <Card className="overflow-hidden">
            <button
              onClick={() => setConstructorOpen(!constructorOpen)}
              className="w-full flex items-center gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors text-left"
            >
              {constructorOpen ? <ChevronDown className="h-5 w-5 text-blue-500" /> : <ChevronRight className="h-5 w-5 text-blue-500" />}
              <Users className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-base">Constructor Standings</span>
              <Badge variant="secondary" className="ml-auto text-xs">{constructors.length} teams</Badge>
            </button>

            {constructorOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {constructors.length === 0 ? (
                  <div className="col-span-2 text-center p-8 text-muted-foreground">No data available</div>
                ) : (
                  constructors.map((c, i) => (
                    <Card key={c.team_name} className="overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex-shrink-0 font-bold text-sm text-muted-foreground w-6">
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${c.position}`}
                            </span>
                            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: teamColor(c.team_colour) }} />
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{c.team_name}</h3>
                              <p className="text-xs text-muted-foreground">Position #{c.position}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl font-bold">{c.points}</div>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                        </div>
                        {(c.wins ?? 0) > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{(c.wins ?? 0)} Wins</Badge>
                          </div>
                        )}
                        <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(c.points / Math.max(...constructors.map(s => s.points))) * 100}%`,
                              background: teamColor(c.team_colour),
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
