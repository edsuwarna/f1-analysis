import { useEffect, useState } from 'react';
import { getSeasonProgression, getDriverForm, getPitStopChampionship } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, formatTime } from '@/lib/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, LineChartIcon, TrendingUp, Gauge, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react';

interface DriverInfo {
  driver_number: number;
  acronym: string;
  full_name?: string;
  team_name: string;
  team_colour: string;
}

interface DriverResult {
  meeting_id: number;
  race_name: string;
  session_name: string;
  position: number;
  points: number;
  dnf: boolean;
}

interface DriverFormEntry {
  driver_number: number;
  acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  avg_finish: number;
  results: DriverResult[];
}

interface PitStopTeam {
  position: number;
  team_name: string;
  team_colour: string;
  avg_pit_duration: number;
  fastest_stop: number;
  slowest_stop: number;
  consistency_percentage: number;
  total_stops: number;
}

export default function SeasonAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progression');

  // Season Progression
  const [progressionData, setProgressionData] = useState<{ year: number; rounds: any[] } | null>(null);
  const [allDrivers, setAllDrivers] = useState<DriverInfo[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
  const [showChart, setShowChart] = useState(false);

  // Driver Form
  const [driverForms, setDriverForms] = useState<DriverFormEntry[]>([]);
  const [expandedFormDrivers, setExpandedFormDrivers] = useState<Set<number>>(new Set());

  // Pit Stop Championship
  const [pitStopTeams, setPitStopTeams] = useState<PitStopTeam[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [progression, form, pitStop] = await Promise.all([
          getSeasonProgression(),
          getDriverForm(),
          getPitStopChampionship(),
        ]);

        // Season Progression
        setProgressionData(progression);
        if (progression.rounds?.length > 0) {
          const driverMap = new Map<number, DriverInfo>();
          for (const round of progression.rounds) {
            if (round.standings) {
              for (const s of round.standings) {
                if (!driverMap.has(s.driver_number)) {
                  driverMap.set(s.driver_number, {
                    driver_number: s.driver_number,
                    acronym: s.acronym,
                    full_name: s.full_name || s.acronym,
                    team_name: s.team_name,
                    team_colour: s.team_colour,
                  });
                }
              }
            }
          }
          setAllDrivers(Array.from(driverMap.values()));
        }

        // Driver Form — use the API response directly (has drivers array)
        const formData = form as unknown as { year: number; rounds: any[]; drivers: DriverFormEntry[] };
        if (formData.drivers && formData.drivers.length > 0) {
          setDriverForms(formData.drivers);
        }

        // Pit Stop Championship
        if (pitStop.teams) {
          const mapped: PitStopTeam[] = pitStop.teams.map((t: any, i: number) => ({
            position: t.position || i + 1,
            team_name: t.team_name || '',
            team_colour: t.team_colour || '',
            avg_pit_duration: t.avg_pit_duration || 0,
            fastest_stop: t.fastest_stop || 0,
            slowest_stop: t.slowest_stop || 0,
            consistency_percentage: t.consistency_percentage || t.consistency || 0,
            total_stops: t.total_stops || 0,
          }));
          setPitStopTeams(mapped);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleDriver(driverNumber: number) {
    setSelectedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driverNumber)) {
        next.delete(driverNumber);
      } else {
        next.add(driverNumber);
      }
      return next;
    });
    setShowChart(false);
  }

  function selectAllDrivers() {
    setSelectedDrivers(new Set(allDrivers.map(d => d.driver_number)));
    setShowChart(false);
  }

  function clearDrivers() {
    setSelectedDrivers(new Set());
    setShowChart(false);
  }

  function handlePlot() {
    setShowChart(true);
  }

  // Build chart data
  const chartData = (() => {
    if (!progressionData?.rounds || selectedDrivers.size === 0) return [];
    return progressionData.rounds.map(round => {
      const point: Record<string, any> = { round: round.round, race_name: round.race_name };
      for (const s of round.standings || []) {
        if (selectedDrivers.has(s.driver_number)) {
          point[s.acronym] = s.cumulative_points;
          point[`${s.acronym}_colour`] = s.team_colour;
        }
      }
      return point;
    });
  })();

  const selectedDriverList = allDrivers.filter(d => selectedDrivers.has(d.driver_number));

  function positionColor(position: number): string {
    if (position <= 3) return 'bg-green-500/20 text-green-400 border-green-500/50';
    if (position <= 10) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    if (position <= 15) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    return 'bg-red-500/20 text-red-400 border-red-500/50';
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-blue-500" />
        Season Analysis
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
          <TabsTrigger value="progression" className="flex items-center gap-1.5 whitespace-nowrap">
            <LineChartIcon className="h-4 w-4" />
            Season Progression
          </TabsTrigger>
          <TabsTrigger value="form" className="flex items-center gap-1.5 whitespace-nowrap">
            <TrendingUp className="h-4 w-4" />
            Driver Form
          </TabsTrigger>
          <TabsTrigger value="pitstop" className="flex items-center gap-1.5 whitespace-nowrap">
            <Gauge className="h-4 w-4" />
            Pit Stop Championship
          </TabsTrigger>
        </TabsList>

        {/* ── Season Progression Tab ── */}
        <TabsContent value="progression" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Select Drivers</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllDrivers}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  <CheckSquare className="h-3 w-3" />
                  Select All
                </button>
                <button
                  onClick={clearDrivers}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  <Square className="h-3 w-3" />
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {allDrivers.map(d => (
                <button
                  key={d.driver_number}
                  onClick={() => toggleDriver(d.driver_number)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedDrivers.has(d.driver_number)
                      ? 'border-foreground bg-foreground/10 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                  style={{
                    borderColor: selectedDrivers.has(d.driver_number)
                      ? teamColor(d.team_colour)
                      : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: teamColor(d.team_colour) }}
                  />
                  {d.acronym}
                </button>
              ))}
            </div>
            <button
              onClick={handlePlot}
              disabled={selectedDrivers.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LineChartIcon className="h-4 w-4" />
              Plot ({selectedDrivers.size} driver{selectedDrivers.size !== 1 ? 's' : ''})
            </button>
          </Card>

          {showChart && chartData.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Cumulative Points Progression</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                  {selectedDriverList.map(d => {
                    const colour = teamColor(d.team_colour);
                    return (
                      <Line
                        key={d.driver_number}
                        type="monotone"
                        dataKey={d.acronym}
                        name={d.acronym}
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
            </Card>
          )}

          {showChart && selectedDrivers.size === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              Select at least one driver and click Plot to see the chart.
            </Card>
          )}
        </TabsContent>

        {/* ── Driver Form Tab ── */}
        <TabsContent value="form" className="space-y-4">
          {driverForms.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No driver form data available</Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {driverForms.map(df => {
                const raceResults = df.results.filter(r => r.session_name === 'Race');
                const isExpanded = expandedFormDrivers.has(df.driver_number);
                return (
                  <Card
                    key={df.acronym}
                    className="overflow-hidden"
                    style={{ borderLeft: `4px solid ${teamColor(df.team_colour)}` }}
                  >
                    <button
                      onClick={() => {
                        setExpandedFormDrivers(prev => {
                          const next = new Set(prev);
                          if (next.has(df.driver_number)) {
                            next.delete(df.driver_number);
                          } else {
                            next.add(df.driver_number);
                          }
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: teamColor(df.team_colour) }}
                        />
                        <div className="min-w-0 text-left">
                          <span className="font-semibold text-sm">{df.acronym}</span>
                          <span className="text-xs text-muted-foreground ml-2 truncate">{df.full_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          Avg: P{df.avg_finish}
                        </Badge>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {raceResults.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No race data</span>
                          ) : (
                            raceResults.map((p, idx) => (
                              <div
                                key={`${p.meeting_id}-${idx}`}
                                className={`w-9 h-9 flex items-center justify-center rounded-md text-xs font-mono font-bold border ${
                                  p.dnf
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                    : positionColor(p.position)
                                }`}
                                title={`${p.race_name}: P${p.position}${p.dnf ? ' (DNF)' : ''}`}
                              >
                                {p.dnf ? 'DNF' : p.position}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {raceResults.map((p, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-muted-foreground truncate max-w-[80px]"
                            >
                              {p.race_name?.split(' ').slice(0, 2).join(' ') || `R${idx + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Pit Stop Championship Tab ── */}
        <TabsContent value="pitstop" className="space-y-4">
          {pitStopTeams.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">No pit stop championship data available</Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase w-12">Pos</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Avg Pit Duration</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Fastest Stop</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Slowest Stop</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Consistency %</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Total Stops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pitStopTeams.map((t, i) => (
                      <tr key={t.team_name} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-sm text-muted-foreground">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${t.position}`}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ background: teamColor(t.team_colour) }}
                            />
                            <span className="font-medium text-sm">{t.team_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-sm">{formatTime(t.avg_pit_duration)}</td>
                        <td className="p-3 text-right font-mono text-sm hidden sm:table-cell text-green-400">
                          {formatTime(t.fastest_stop)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm hidden md:table-cell text-red-400">
                          {formatTime(t.slowest_stop)}
                        </td>
                        <td className="p-3 text-right">
                          <span className="text-sm font-semibold">
                            {t.consistency_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                          {t.total_stops}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
