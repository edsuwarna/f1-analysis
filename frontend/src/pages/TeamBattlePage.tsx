import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor, formatTime } from '@/lib/formatters';
import { getDriverStandings, getSectorTrends, type StandingRow, type SectorTrend } from '@/lib/api';
import { Swords, Users, TrendingUp, Zap, Trophy, ChevronDown, ChevronRight, Crosshair } from 'lucide-react';

interface TeamBattle {
  team_name: string;
  team_colour: string;
  drivers: string[];
  race_wins: Record<string, number>;
  qual_wins: Record<string, number>;
}

interface TeamBattleData {
  total_teams: number;
  battles: TeamBattle[];
}

interface DriverPoints {
  name_acronym: string;
  points: number;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function TeamBattlePage() {
  const [data, setData] = useState<TeamBattleData | null>(null);
  const [pointsMap, setPointsMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [mode, setMode] = useState<'team' | 'custom'>('team');

  // Custom H2H state
  const [drivers, setDrivers] = useState<StandingRow[]>([]);
  const [sectors, setSectors] = useState<SectorTrend[]>([]);
  const [driver1, setDriver1] = useState<string>('');
  const [driver2, setDriver2] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const [battleRes, driversRes] = await Promise.all([
          fetch(`${API_BASE}/analytics/teammate-battle?year=2026`),
          fetch(`${API_BASE}/drivers?year=2026`),
        ]);
        if (!battleRes.ok) throw new Error(`Battle API ${battleRes.status}`);
        const battleJson = await battleRes.json();
        setData(battleJson);

        if (driversRes.ok) {
          const driversJson = await driversRes.json();
          const map = new Map<string, number>();
          (driversJson.drivers || []).forEach((d: DriverPoints) => {
            map.set(d.name_acronym, d.points);
          });
          setPointsMap(map);
        }

        // Load driver standings for custom mode
        const [d, s] = await Promise.all([
          getDriverStandings(2026),
          getSectorTrends(2026, 'Race'),
        ]);
        setDrivers(d);
        setSectors(s);
        if (d.length >= 2) {
          setDriver1(d[0].driver_number.toString());
          setDriver2(d[1].driver_number.toString());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  // ── Teammate Battle ──
  const { battles } = data || { battles: [] };

  function getDriverStats(battle: TeamBattle, d: string) {
    const qWins = battle.qual_wins?.[d] || 0;
    const rWins = battle.race_wins?.[d] || 0;
    const qTotal = Object.values(battle.qual_wins || {}).reduce((a, b) => a + b, 0) || 1;
    const rTotal = Object.values(battle.race_wins || {}).reduce((a, b) => a + b, 0) || 1;
    return {
      qualWins: qWins,
      qualPercent: Math.round((qWins / qTotal) * 100),
      raceWins: rWins,
      racePercent: Math.round((rWins / rTotal) * 100),
      totalQual: qTotal,
      totalRace: rTotal,
      points: pointsMap.get(d) || 0,
    };
  }

  function getOtherDriver(battle: TeamBattle, d: string): string {
    return battle.drivers.find(x => x !== d) || '';
  }

  // ── Custom Head to Head ──
  const d1Data = drivers.find(d => d.driver_number.toString() === driver1);
  const d2Data = drivers.find(d => d.driver_number.toString() === driver2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-orange-500" />
          {mode === 'team' ? 'Teammate Battles' : 'Head to Head'}
        </h1>
        <div className="flex items-center gap-2">
          <div className="bg-secondary rounded-lg p-0.5 flex">
            <button
              onClick={() => setMode('team')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1" />
              Teammates
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'custom' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5 inline mr-1" />
              Custom
            </button>
          </div>
          {mode === 'team' && data && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Users className="h-3.5 w-3.5 mr-1" />
              {data.total_teams || battles.length} teams
            </Badge>
          )}
        </div>
      </div>

      {mode === 'custom' ? (
        /* ── Custom Head to Head Mode ── */
        <>
          {/* Driver Selectors */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Driver 1</label>
              <select
                className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
                value={driver1}
                onChange={e => setDriver1(e.target.value)}
              >
                {drivers.map(d => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.full_name} ({d.team_name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Driver 2</label>
              <select
                className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
                value={driver2}
                onChange={e => setDriver2(e.target.value)}
              >
                {drivers.map(d => (
                  <option key={d.driver_number} value={d.driver_number}>
                    {d.full_name} ({d.team_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison */}
          {d1Data && d2Data && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Points</p>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <div>
                      <span className="block text-2xl font-bold" style={{ color: teamColor(d1Data.team_colour) }}>{d1Data.points}</span>
                      <span className="text-xs text-muted-foreground">{d1Data.name_acronym}</span>
                    </div>
                    <span className="text-muted-foreground">vs</span>
                    <div>
                      <span className="block text-2xl font-bold" style={{ color: teamColor(d2Data.team_colour) }}>{d2Data.points}</span>
                      <span className="text-xs text-muted-foreground">{d2Data.name_acronym}</span>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Wins</p>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-2xl font-bold">{d1Data.wins}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-2xl font-bold">{d2Data.wins}</span>
                  </div>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase">Position</p>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <span className="text-2xl font-bold">#{d1Data.position}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-2xl font-bold">#{d2Data.position}</span>
                  </div>
                </Card>
              </div>

              {/* Best Lap Comparison */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4">Best Lap Comparison (Season)</h3>
                <div className="overflow-x-auto">
                  {(() => {
                    const d1Sectors = sectors.filter(s => s.driver_number.toString() === driver1);
                    const d2Sectors = sectors.filter(s => s.driver_number.toString() === driver2);
                    return d1Sectors.length === 0 && d2Sectors.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No sector data available</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 text-muted-foreground">Race</th>
                            <th className="text-right p-2 text-muted-foreground">{d1Data.name_acronym}</th>
                            <th className="text-right p-2 text-muted-foreground">{d2Data.name_acronym}</th>
                            <th className="text-center p-2 text-muted-foreground">Winner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d1Sectors.slice(0, 15).map((s1, idx) => {
                            const s2 = d2Sectors.find(s => s.race_name === s1.race_name);
                            if (!s2) return null;
                            const winner = s1.best_lap < s2.best_lap ? d1Data.name_acronym : d2Data.name_acronym;
                            const isD1 = winner === d1Data.name_acronym;
                            return (
                              <tr key={idx} className="border-b border-border">
                                <td className="p-2 text-muted-foreground">{s1.race_name}</td>
                                <td className={`p-2 text-right font-mono ${s1.best_lap < s2.best_lap ? 'text-green-400 font-bold' : ''}`}>
                                  {formatTime(s1.best_lap)}
                                </td>
                                <td className={`p-2 text-right font-mono ${s2.best_lap < s1.best_lap ? 'text-green-400 font-bold' : ''}`}>
                                  {formatTime(s2.best_lap)}
                                </td>
                                <td className="p-2 text-center">
                                  <Badge variant="outline" className={`text-xs ${isD1 ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400'}`}>
                                    {winner}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </Card>
            </>
          )}

          {(!d1Data || !d2Data) && (
            <Card className="p-8 text-center text-muted-foreground">
              <p>Select two drivers to compare</p>
            </Card>
          )}
        </>
      ) : (
        /* ── Teammate Battle Mode ── */
        <>
          {/* Team Selector */}
          {battles.length > 0 && (
            <div className="max-w-xs">
              <label className="text-xs text-muted-foreground mb-1 block">Select Team</label>
              <select
                className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
              >
                <option value="">Choose a team...</option>
                {battles.map(b => (
                  <option key={b.team_name} value={b.team_name}>{b.team_name}</option>
                ))}
              </select>
            </div>
          )}

          {battles.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No teammate battle data available</Card>
          ) : !selectedTeam ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Swords className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-lg font-medium">Select a team above to view the teammate battle</p>
            </Card>
          ) : (() => {
            const battle = battles.find(b => b.team_name === selectedTeam);
            if (!battle) return <Card className="p-8 text-center text-muted-foreground">Team not found</Card>;
            const [d1, d2] = battle.drivers;
            const d1Stats = d1 ? getDriverStats(battle, d1) : null;
            const d2Stats = d2 ? getDriverStats(battle, d2) : null;

            return (
              <Card
                key={battle.team_name}
                className="overflow-hidden"
                style={{ borderLeft: `4px solid ${teamColor(battle.team_colour)}` }}
              >
                <div className="p-5">
                  {/* Team Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: teamColor(battle.team_colour) }} />
                    <h3 className="font-semibold text-lg">{battle.team_name}</h3>
                  </div>

                  {/* Driver Names */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {d1 && (
                      <div className="rounded-lg px-4 py-2.5 text-center" style={{ background: `${teamColor(battle.team_colour)}20` }}>
                        <span className="font-bold text-base">{d1}</span>
                        {d1Stats && <span className="block text-xs text-muted-foreground mt-0.5">{d1Stats.points} pts</span>}
                      </div>
                    )}
                    {d2 && (
                      <div className="rounded-lg px-4 py-2.5 text-center" style={{ background: `${teamColor(battle.team_colour)}20` }}>
                        <span className="font-bold text-base">{d2}</span>
                        {d2Stats && <span className="block text-xs text-muted-foreground mt-0.5">{d2Stats.points} pts</span>}
                      </div>
                    )}
                  </div>

                  {/* Head-to-Head Summary */}
                  {d1 && d2 && d1Stats && d2Stats && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <Card className="p-3 text-center">
                        <Zap className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                        <div className="text-lg font-bold">{d1Stats.qualWins} - {d2Stats.qualWins}</div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Qualifying H2H</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <TrendingUp className="h-4 w-4 text-green-500 mx-auto mb-1" />
                        <div className="text-lg font-bold">{d1Stats.raceWins} - {d2Stats.raceWins}</div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Race H2H</p>
                      </Card>
                    </div>
                  )}

                  {/* Points Bar */}
                  {d1Stats && d2Stats && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Trophy className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Points</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-right min-w-[32px]" style={{ color: teamColor(battle.team_colour) }}>{d1}</span>
                        <div className="flex-1 flex rounded-full overflow-hidden h-6 bg-secondary">
                          <div className="flex items-center justify-center text-[11px] font-bold text-white transition-all"
                            style={{ width: `${(d1Stats.points / Math.max(d1Stats.points + d2Stats.points, 1)) * 100}%`, background: teamColor(battle.team_colour) }}
                          >{d1Stats.points}</div>
                          <div className="flex items-center justify-center text-[11px] font-bold text-white transition-all ml-[1px]"
                            style={{ width: `${(d2Stats.points / Math.max(d1Stats.points + d2Stats.points, 1)) * 100}%`, background: teamColor(battle.team_colour), opacity: 0.5 }}
                          >{d2Stats.points}</div>
                        </div>
                        <span className="text-xs font-semibold min-w-[32px]" style={{ color: teamColor(battle.team_colour), opacity: 0.7 }}>{d2}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{d1Stats.points} pts</span>
                        <span className="text-xs text-muted-foreground">{d2Stats.points} pts</span>
                      </div>
                    </div>
                  )}

                  {/* Qualifying Battle */}
                  {d1Stats && d2Stats && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Qualifying</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: teamColor(battle.team_colour) }}>{d1}</span>
                        <div className="flex-1 flex rounded-full overflow-hidden h-5 bg-secondary">
                          <div className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                            style={{ width: `${d1Stats.qualPercent}%`, background: teamColor(battle.team_colour) }}
                          >{d1Stats.qualPercent > 15 ? `${d1Stats.qualWins}` : ''}</div>
                          <div className="flex items-center justify-center text-[10px] font-bold text-white transition-all ml-[1px]"
                            style={{ width: `${d2Stats.qualPercent}%`, background: teamColor(battle.team_colour), opacity: 0.5 }}
                          >{d2Stats.qualPercent > 15 ? `${d2Stats.qualWins}` : ''}</div>
                        </div>
                        <span className="text-xs font-semibold w-8" style={{ color: teamColor(battle.team_colour), opacity: 0.7 }}>{d2}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{d1Stats.qualPercent}%</span>
                        <span className="text-xs text-muted-foreground">{d2Stats.qualPercent}%</span>
                      </div>
                    </div>
                  )}

                  {/* Race Pace Battle */}
                  {d1Stats && d2Stats && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Race Pace</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: teamColor(battle.team_colour) }}>{d1}</span>
                        <div className="flex-1 flex rounded-full overflow-hidden h-5 bg-secondary">
                          <div className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                            style={{ width: `${d1Stats.racePercent}%`, background: teamColor(battle.team_colour) }}
                          >{d1Stats.racePercent > 15 ? `${d1Stats.raceWins}` : ''}</div>
                          <div className="flex items-center justify-center text-[10px] font-bold text-white transition-all ml-[1px]"
                            style={{ width: `${d2Stats.racePercent}%`, background: teamColor(battle.team_colour), opacity: 0.5 }}
                          >{d2Stats.racePercent > 15 ? `${d2Stats.raceWins}` : ''}</div>
                        </div>
                        <span className="text-xs font-semibold w-8" style={{ color: teamColor(battle.team_colour), opacity: 0.7 }}>{d2}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{d1Stats.racePercent}%</span>
                        <span className="text-xs text-muted-foreground">{d2Stats.racePercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}
