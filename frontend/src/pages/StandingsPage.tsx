import { useEffect, useState } from 'react';
import { getDriverStandings, getConstructorStandings, type StandingRow, type ConstructorStandingRow } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Trophy, Users, ChevronDown, ChevronRight, Table2 } from 'lucide-react';

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
  const [raceBreakdownOpen, setRaceBreakdownOpen] = useState(false);

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

  // Build per-driver race matrix: for each driver, map race index to result
  const driverRaceMatrix = drivers.map(d => {
    const raceResults: { raceIdx: number; position: number; points: number; session_name?: string }[] = [];
    races.forEach((race, raceIdx) => {
      // Find all results for this driver in this race (sprint + race)
      const driverResults = race.results.filter(r => r.driver_number === d.driver_number);
      driverResults.forEach(rr => {
        raceResults.push({
          raceIdx,
          position: rr.position,
          points: rr.points,
          session_name: rr.session_name,
        });
      });
    });
    return { driver: d, raceResults };
  });

  const maxPos = Math.max(...races.flatMap(r => r.results.map(x => x.position)), 25);

  function posColor(pos: number): string {
    if (pos === 1) return 'bg-yellow-500/30 text-yellow-400 font-bold';
    if (pos === 2) return 'bg-gray-400/20 text-gray-300 font-bold';
    if (pos === 3) return 'bg-amber-600/20 text-amber-500 font-bold';
    if (pos <= 10) return 'bg-green-500/10 text-green-400';
    return 'bg-muted/30 text-muted-foreground';
  }

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
                        const avgFinish = races.length > 0
                          ? (d.points / races.length).toFixed(1)
                          : '-';
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

            {/* ── Per-Race Breakdown Toggle ── */}
            {drivers.length > 0 && races.length > 0 && (
              <>
                <button
                  onClick={() => setRaceBreakdownOpen(!raceBreakdownOpen)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-t border-border/50"
                >
                  {raceBreakdownOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Per-Race Breakdown</span>
                  <Badge variant="outline" className="text-xs ml-auto">{races.length} races</Badge>
                </button>

                {raceBreakdownOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="sticky left-0 bg-muted/30 z-10 p-2 text-left font-medium text-muted-foreground">Driver</th>
                          {races.map((r, idx) => (
                            <th key={r.meeting_id} className="p-2 text-center font-medium text-muted-foreground min-w-[50px]">
                              <div title={r.race_name}>
                                <span className="text-[10px] uppercase">{r.country_code}</span>
                                <span className="block text-[9px] opacity-60">R{idx + 1}</span>
                              </div>
                            </th>
                          ))}
                          <th className="p-2 text-right font-medium text-muted-foreground">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverRaceMatrix.map(({ driver: d, raceResults }) => (
                          <tr key={d.driver_number} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="sticky left-0 bg-card z-10 p-2 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor(d.team_colour) }} />
                              <span>{d.name_acronym}</span>
                            </td>
                            {races.map((race, raceIdx) => {
                              const driverAtRace = raceResults.filter(r => r.raceIdx === raceIdx && !r.session_name);
                              const driverSprint = raceResults.filter(r => r.raceIdx === raceIdx && r.session_name === 'Sprint');
                              const dr = driverAtRace[0];
                              const ds = driverSprint[0];
                              return (
                                <td key={race.meeting_id} className="p-1.5 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {ds && (
                                      <span className={`text-[9px] px-1 rounded ${posColor(ds.position)}`}>
                                        S{ds.position}
                                      </span>
                                    )}
                                    {dr ? (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${posColor(dr.position)}`}>
                                        P{dr.position}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground/40">-</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-2 text-right font-bold">{d.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Card>

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
