import { useEffect, useState } from 'react';
import { getChampionship, getSeasonProgression, getDriverForm, getSectorTrends, type StandingRow, type SeasonProgressionRound, type DriverFormRow, type SectorTrend } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, formatTime, flagEmoji } from '@/lib/formatters';
import { BarChart3, TrendingUp, Activity, Radar, CircleDot, Gauge } from 'lucide-react';

// 2026 driver headshots from F1 CDN
const HEADSHOT_MAP: Record<number, string> = {
  1: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/lannor01/2026mclarenlannor01right.webp',
  3: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01right.webp',
  5: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/gabbor01/2026audigabbor01right.webp',
  6: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/redbullracing/isahad01/2026redbullracingisahad01right.webp',
  10: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/piegas01/2026alpinepiegas01right.webp',
  11: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.webp',
  12: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/andant01/2026mercedesandant01right.webp',
  14: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01right.webp',
  16: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/chalec01/2026ferrarichalec01right.webp',
  18: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/astonmartin/lanstr01/2026astonmartinlanstr01right.webp',
  23: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/alealb01/2026williamsalealb01right.webp',
  27: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.webp',
  30: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01right.webp',
  31: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/estoco01/2026haasf1teamestoco01right.webp',
  41: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp',
  43: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/alpine/fracol01/2026alpinefracol01right.webp',
  44: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/ferrari/lewham01/2026ferrarilewham01right.webp',
  55: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/williams/carsai01/2026williamscarsai01right.webp',
  63: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mercedes/georus01/2026mercedesgeorus01right.webp',
  77: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01right.webp',
  81: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01right.webp',
  87: 'https://media.formula1.com/image/upload/c_lfill,g_north,w_128,h_160/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000001/common/f1/2026/haasf1team/olibea01/2026haasf1teamolibea01right.webp',
};

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
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {HEADSHOT_MAP[driver.driver_number] ? (
                  <img
                    src={HEADSHOT_MAP[driver.driver_number]}
                    alt={driver.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        `<div class="w-full h-full flex items-center justify-center text-xl font-bold" style="color:${teamColor(driver.team_colour)}">${driver.name_acronym?.charAt(0) || '?'}</div>`;
                    }}
                  />
                ) : (
                  <span
                    className="text-xl font-bold"
                    style={{ color: teamColor(driver.team_colour) }}
                  >
                    {driver.name_acronym?.charAt(0) || '?'}
                  </span>
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

          <Tabs defaultValue="season-progress">
            <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
              <TabsTrigger value="season-progress" className="whitespace-nowrap">Season Progress</TabsTrigger>
              <TabsTrigger value="form" className="whitespace-nowrap">Race Results</TabsTrigger>
              <TabsTrigger value="sectors" className="whitespace-nowrap">Sector Analysis</TabsTrigger>
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            </TabsList>

            {/* Season Progress - Points Accumulation Table */}
            <TabsContent value="season-progress" className="mt-4">
              <Card>
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Points Progression — 2026 Season
                  </h3>
                </div>
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
              </Card>
            </TabsContent>

            {/* Race Results / Form */}
            <TabsContent value="form" className="mt-4">
              <Card>
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Race Results
                  </h3>
                </div>
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
              </Card>
            </TabsContent>

            {/* Sector Analysis */}
            <TabsContent value="sectors" className="mt-4">
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Radar className="h-4 w-4 text-purple-500" />
                  Best Sector Times by Race
                </h3>
                {driverSectors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No sector data available</p>
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
              </Card>
            </TabsContent>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4">
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
                  <CircleDot className="h-8 w-8 text-blue-500 mx-auto mb-2" />
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
                <Card className="p-5 mt-4">
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
            </TabsContent>
          </Tabs>
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
