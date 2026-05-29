import { useEffect, useState } from 'react';
import { getChampionship, getSeasonProgression, getDriverForm, getSectorTrends, type StandingRow, type SeasonProgressionRound, type DriverFormRow, type SectorTrend } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CollapsibleCard from '@/components/CollapsibleCard';
import { teamColor, formatTime, flagEmoji } from '@/lib/formatters';
import { BarChart3, TrendingUp, Activity, Gauge } from 'lucide-react';

export default function DriverStatsPage() {
  const [drivers, setDrivers] = useState<StandingRow[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [progression, setProgression] = useState<SeasonProgressionRound[]>([]);
  const [driverForm, setDriverForm] = useState<DriverFormRow[]>([]);
  const [sectors, setSectors] = useState<SectorTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, sp, sf] = await Promise.all([
          getChampionship(2026),
          getSeasonProgression(2026),
          getDriverForm(2026),
        ]);
        setDrivers(c.driver_standings);
        setProgression(sp.rounds || []);
        setDriverForm(sf.rounds || []);
        if (c.driver_standings.length > 0) {
          setSelectedDriver(c.driver_standings[0].driver_number.toString());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedDriver) return;
    getSectorTrends(2026, 'Race')
      .then(setSectors)
      .catch(console.error);
  }, [selectedDriver]);

  const driver = drivers.find(d => d.driver_number.toString() === selectedDriver);
  const driverNum = parseInt(selectedDriver);

  // Driver's season progression
  const driverProgress = progression.map(round => {
    const entry = round.standings.find(s => s.driver_number === driverNum);
    return entry ? { ...entry, round: round.round, race_name: round.race_name } : null;
  }).filter(Boolean);

  // Driver's form (results)
  const formResults = driverForm.filter(f => {
    // Match by looking at race results (positions aren't in driver-form directly)
    return true; // We'll show all rounds and look for driver-specific data from championship
  });

  // Driver sector trends
  const driverSectors = sectors.filter(s => s.driver_number === driverNum);

  const maxPoints = Math.max(...driverProgress.map(p => p!.cumulative_points), 1);

  if (loading) return <div className="text-center p-12 text-muted-foreground">Loading driver stats...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-500" />
          Driver Stats
        </h1>
      </div>

      {/* Driver Selector */}
      <div className="max-w-xs">
        <label className="text-xs text-muted-foreground mb-1 block">Select Driver</label>
        <select
          className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
          value={selectedDriver}
          onChange={e => setSelectedDriver(e.target.value)}
        >
          {drivers.map(d => (
            <option key={d.driver_number} value={d.driver_number}>
              {d.full_name} ({d.team_name}) — {d.points} pts
            </option>
          ))}
        </select>
      </div>

      {driver && (
        <>
          {/* Driver Profile Card */}
          <Card className="p-5 bg-gradient-to-r from-card to-muted/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center" style={{ color: teamColor(driver.team_colour) }}>
                {driver.headshot_url ? (
                  <img
                    src={driver.headshot_url}
                    alt={driver.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xl font-bold">${driver.name_acronym?.charAt(0) || '?'}</span>`;
                    }}
                  />
                ) : (
                  <span className="text-xl font-bold">{driver.name_acronym?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{driver.full_name}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamColor(driver.team_colour) }} />
                    {driver.team_name}
                  </span>
                  <span>{flagEmoji(driver.country_code)}</span>
                  <span>#{driver.position} in standings</span>
                </div>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="text-3xl font-bold">{driver.points}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>
          </Card>

          <CollapsibleCard title="Season Progress" subtitle="Points accumulation across 2026 rounds" icon={<TrendingUp className="h-4 w-4 text-green-500" />} defaultOpen>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Round</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Race</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Race Pts</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Sprint Pts</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Total</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cumulative</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground" style={{ width: '30%' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {driverProgress.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No progression data available for this driver
                      </td>
                    </tr>
                  ) : (
                    driverProgress.map((entry, i) => (
                      <tr key={entry!.round} className="border-b border-border hover:bg-muted/20 text-sm">
                        <td className="p-3 font-bold text-xs text-muted-foreground">R{entry!.round}</td>
                        <td className="p-3">{entry!.race_name}</td>
                        <td className="p-3 text-right font-mono font-semibold">{entry!.race_points}</td>
                        <td className="p-3 text-right font-mono">{entry!.sprint_points || '-'}</td>
                        <td className="p-3 text-right font-mono font-semibold">{entry!.round_points}</td>
                        <td className="p-3 text-right font-mono font-bold text-lg">
                          {entry!.cumulative_points}
                        </td>
                        <td className="p-3">
                          <div className="w-full bg-secondary rounded-full h-2.5">
                            <div
                              className="h-2.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${(entry!.cumulative_points / maxPoints) * 100}%`,
                                background: teamColor(driver.team_colour),
                                opacity: 0.5 + (i / driverProgress.length) * 0.5,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Race Results / Form */}
          <CollapsibleCard title="Race Results" subtitle="Finishing positions per round" icon={<Activity className="h-4 w-4 text-blue-500" />}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Round</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Race</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground">Position</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {progression.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No race data available
                      </td>
                    </tr>
                  ) : (
                    progression.map((round, i) => {
                      const result = round.standings.find(s => s.driver_number === driverNum);
                      if (!result) return (
                        <tr key={i} className="border-b border-border text-sm text-muted-foreground">
                          <td className="p-3 font-bold text-xs">R{round.round}</td>
                          <td className="p-3">{round.race_name}</td>
                          <td className="p-3 text-center">—</td>
                          <td className="p-3 text-right">—</td>
                        </tr>
                      );
                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/20 text-sm">
                          <td className="p-3 font-bold text-xs text-muted-foreground">R{round.round}</td>
                          <td className="p-3">{round.race_name}</td>
                          <td className="p-3 text-center">
                            <Badge variant={result.race_points >= 25 ? 'default' : 'outline'}
                              className={
                                result.race_points >= 25 ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                result.race_points >= 18 ? 'bg-gray-400/20 text-gray-400 border-gray-400/30' :
                                result.race_points >= 15 ? 'bg-amber-600/20 text-amber-600 border-amber-600/30' :
                                result.race_points > 0 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                'bg-red-500/10 text-red-400 border-red-500/30'
                              }
                            >
                              {result.race_points >= 25 ? '🥇 1st' :
                                result.race_points >= 18 ? '🥈 2nd' :
                                result.race_points >= 15 ? '🥉 3rd' :
                                result.race_points > 0 ? `${(() => {
                                  const sorted = round.standings.sort((a, b) => b.race_points - a.race_points);
                                  return sorted.findIndex(s => s.driver_number === driverNum) + 1;
                                })()}th` : 'DNF'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">{result.race_points}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleCard>

          {/* Sector Analysis */}
          <CollapsibleCard title="Sector Analysis" subtitle="Best sector times by race" icon={<Gauge className="h-4 w-4 text-purple-500" />}>
            {driverSectors.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No sector data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Race</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">S1</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">S2</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">S3</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Best Lap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverSectors.sort((a, b) => a.meeting_id - b.meeting_id).map((s, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/20">
                        <td className="p-2 text-muted-foreground">{s.race_name}</td>
                        <td className="p-2 text-right font-mono">{formatTime(s.best_sector_1)}</td>
                        <td className="p-2 text-right font-mono">{formatTime(s.best_sector_2)}</td>
                        <td className="p-2 text-right font-mono">{formatTime(s.best_sector_3)}</td>
                        <td className="p-2 text-right font-mono font-bold text-green-400">{formatTime(s.best_lap)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleCard>

          {/* Overview */}
          <CollapsibleCard title="Overview" subtitle="Quick stats & navigation" icon={<BarChart3 className="h-4 w-4 text-purple-500" />}>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 text-center">
                  <Gauge className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h3 className="font-semibold">Race Pace</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average lap time analysis across stints
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Visit{' '}
                    <a href="/race-pace" className="text-primary hover:underline">Race Pace</a>
                    {' '}for detailed analysis
                  </p>
                </Card>
                <Card className="p-5 text-center">
                  <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="font-semibold">Head to Head</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare with teammates & rivals
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Visit{' '}
                    <a href="/head-to-head" className="text-primary hover:underline">Head to Head</a>
                    {' '}to compare drivers
                  </p>
                </Card>
                <Card className="p-5 text-center">
                  <Activity className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <h3 className="font-semibold">Pit Stops</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pit stop performance analysis
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Visit{' '}
                    <a href="/pit-stops" className="text-primary hover:underline">Pit Stops</a>
                    {' '}for pit data
                  </p>
                </Card>
              </div>

              {driverProgress.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Points Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                      <p className="text-2xl font-bold">{driver.points}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Races Entered</p>
                      <p className="text-2xl font-bold">{driverProgress.filter(p => p!.race_points > 0).length}/{progression.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Best Finish</p>
                      <p className="text-2xl font-bold">
                        {Math.max(...driverProgress.map(p => p!.race_points)) >= 25 ? '🥇' :
                         Math.max(...driverProgress.map(p => p!.race_points)) >= 18 ? '🥈' :
                         Math.max(...driverProgress.map(p => p!.race_points)) >= 15 ? '🥉' : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Points Percentage</p>
                      <p className="text-2xl font-bold">
                        {(() => {
                          const totalAvailable = progression.length * 25;
                          return totalAvailable > 0 ? `${((driver.points / totalAvailable) * 100).toFixed(0)}%` : '-';
                        })()}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </CollapsibleCard>
        </>
      )}

      {!driver && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          <p className="text-lg font-medium">Select a driver to view stats</p>
        </Card>
      )}
    </div>
  );
}
