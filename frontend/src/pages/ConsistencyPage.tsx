import { useEffect, useState } from 'react';
import { getDriverForm, getDriverStandings, type StandingRow } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, flagEmoji } from '@/lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Activity, TrendingUp, Table2, Gauge } from 'lucide-react';

// ─── Types Based on Actual API Response ─────────────────────────────

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

interface DriverFormResponse {
  year: number;
  rounds: Array<{ meeting_id: number; race_name: string; date_start: string }>;
  drivers: DriverFormEntry[];
}

// ─── Computed Consistency Metrics ───────────────────────────────────

interface ConsistencyMetrics {
  driver_number: number;
  acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  race_count: number;
  sprint_count: number;
  avg_race_pos: number | null;
  avg_sprint_pos: number | null;
  race_std_dev: number | null;
  consistency_score: number;
  points_per_race: number;
  total_points: number;
  reliability: number; // percentage of race sessions finished
}

function computeMetrics(driver: DriverFormEntry): ConsistencyMetrics {
  const raceResults = driver.results.filter(r => r.session_name === 'Race');
  const sprintResults = driver.results.filter(r => r.session_name === 'Sprint');

  const racePositions = raceResults
    .filter(r => !r.dnf && r.position != null)
    .map(r => r.position);
  const sprintPositions = sprintResults
    .filter(r => !r.dnf && r.position != null)
    .map(r => r.position);

  const raceCount = raceResults.length;
  const sprintCount = sprintResults.length;

  const avgRacePos = racePositions.length > 0
    ? racePositions.reduce((a, b) => a + b, 0) / racePositions.length
    : null;

  const avgSprintPos = sprintPositions.length > 0
    ? sprintPositions.reduce((a, b) => a + b, 0) / sprintPositions.length
    : null;

  // Standard deviation of race positions
  let raceStdDev: number | null = null;
  if (racePositions.length > 1 && avgRacePos != null) {
    const variance = racePositions.reduce((s, p) => s + (p - avgRacePos) ** 2, 0) / racePositions.length;
    raceStdDev = Math.sqrt(variance);
  }

  // Consistency score: 100 - std_dev * 10, capped 0-100
  const consistencyScore = raceStdDev != null
    ? Math.max(0, Math.min(100, 100 - raceStdDev * 10))
    : 100;

  // Points per race
  const totalPoints = driver.results.reduce((sum, r) => sum + (r.points || 0), 0);
  const pointsPerRace = raceCount > 0 ? totalPoints / raceCount : 0;

  // Reliability: % of race sessions finished (not DNF)
  const finishedRaces = raceResults.filter(r => !r.dnf).length;
  const reliability = raceCount > 0 ? (finishedRaces / raceCount) * 100 : 100;

  return {
    driver_number: driver.driver_number,
    acronym: driver.acronym,
    full_name: driver.full_name,
    team_name: driver.team_name,
    team_colour: driver.team_colour,
    race_count: raceCount,
    sprint_count: sprintCount,
    avg_race_pos: avgRacePos,
    avg_sprint_pos: avgSprintPos,
    race_std_dev: raceStdDev,
    consistency_score: Math.round(consistencyScore),
    points_per_race: Math.round(pointsPerRace * 10) / 10,
    total_points: totalPoints,
    reliability: Math.round(reliability * 10) / 10,
  };
}

// ─── Chart Data Helpers ─────────────────────────────────────────────

interface ChartRow {
  full_name: string;
  acronym: string;
  team_name: string;
  team_colour: string;
  fill: string;
  avg_pos: number;
  consistency_score: number;
  reliability: number;
  total_points: number;
}

function buildRaceChartData(metrics: ConsistencyMetrics[]): ChartRow[] {
  return metrics
    .filter(m => m.avg_race_pos != null)
    .map(m => ({
      full_name: m.full_name || m.acronym,
      acronym: m.acronym,
      team_name: m.team_name,
      team_colour: m.team_colour,
      fill: teamColor(m.team_colour),
      avg_pos: m.avg_race_pos!,
      consistency_score: m.consistency_score,
      reliability: m.reliability,
      total_points: m.total_points,
    }))
    .sort((a, b) => a.avg_pos - b.avg_pos);
}

function buildSprintChartData(metrics: ConsistencyMetrics[]): ChartRow[] {
  return metrics
    .filter(m => m.avg_sprint_pos != null)
    .map(m => ({
      full_name: m.full_name || m.acronym,
      acronym: m.acronym,
      team_name: m.team_name,
      team_colour: m.team_colour,
      fill: teamColor(m.team_colour),
      avg_pos: m.avg_sprint_pos!,
      consistency_score: m.consistency_score,
      reliability: m.reliability,
      total_points: m.total_points,
    }))
    .sort((a, b) => a.avg_pos - b.avg_pos);
}

// ─── Number Formatting ──────────────────────────────────────────────

function posClass(pos: number): string {
  if (pos === 1) return 'text-yellow-500';
  if (pos === 2) return 'text-gray-400';
  if (pos === 3) return 'text-amber-600';
  return 'text-muted-foreground';
}

function posEmoji(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `#${pos}`;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ConsistencyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ConsistencyMetrics[]>([]);
  const [activeTab, setActiveTab] = useState('race');

  useEffect(() => {
    async function load() {
      try {
        const [formRes, standings] = await Promise.all([
          getDriverForm(2026),
          getDriverStandings(2026),
        ]);

        // Build standings map for total points
        const standingsMap = new Map<number, StandingRow>();
        standings.forEach(s => standingsMap.set(s.driver_number, s));

        // Cast the form response since the TS type is incomplete
        const data = formRes as unknown as DriverFormResponse;
        const drivers = data.drivers || [];

        const computed = drivers.map(d => {
          const m = computeMetrics(d);
          // Use standings total points if available (more authoritative)
          const standing = standingsMap.get(d.driver_number);
          if (standing) {
            m.total_points = standing.points;
          }
          return m;
        });

        // Sort by consistency score descending
        computed.sort((a, b) => b.consistency_score - a.consistency_score);
        setMetrics(computed);
      } catch (e) {
        console.error('ConsistencyPage error:', e);
        setError(e instanceof Error ? e.message : 'Failed to load consistency data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-emerald-500" />
          Consistency Analysis
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading consistency data...
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-emerald-500" />
          Consistency Analysis
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty State ──
  if (metrics.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-emerald-500" />
          Consistency Analysis
        </h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No consistency data available for 2026.
          </CardContent>
        </Card>
      </div>
    );
  }

  const raceChartData = buildRaceChartData(metrics);
  const sprintChartData = buildSprintChartData(metrics);

  // ── Custom Tooltip for Bar Charts ──
  function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload as ChartRow | undefined;
    if (!row) return null;
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-md">
        <p className="font-semibold mb-1">{row.full_name} ({row.acronym})</p>
        <p className="text-muted-foreground">{row.team_name}</p>
        <p className="mt-1">Avg Position: <span className="font-bold">{row.avg_pos.toFixed(1)}</span></p>
        <p>Consistency: <span className="font-bold">{row.consistency_score}/100</span></p>
        <p>Reliability: <span className="font-bold">{row.reliability}%</span></p>
        <p>Total Pts: <span className="font-bold">{row.total_points}</span></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Activity className="h-6 w-6 text-emerald-500" />
        Consistency Analysis
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="race" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Race Consistency
          </TabsTrigger>
          <TabsTrigger value="sprint" className="flex items-center gap-1.5">
            <Gauge className="h-4 w-4" />
            Sprint Consistency
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-1.5">
            <Table2 className="h-4 w-4" />
            Full Table
          </TabsTrigger>
        </TabsList>

        {/* ── Race Consistency Tab ── */}
        <TabsContent value="race" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Average Race Finishing Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              {raceChartData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No race data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, raceChartData.length * 40)}>
                  <BarChart
                    data={raceChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      domain={[0, 'dataMax + 2']}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      label={{
                        value: 'Avg Finish Position',
                        position: 'insideBottomRight',
                        offset: -5,
                        style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                      }}
                    />
                    <YAxis
                      dataKey="full_name"
                      type="category"
                      width={140}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val: string) => {
                        const driver = raceChartData.find(d => d.full_name === val);
                        return driver ? `${driver.acronym} ${val.split(' ').pop() || ''}` : val;
                      }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="avg_pos" name="Avg Position" radius={[0, 4, 4, 0]}>
                      {raceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {metrics.filter(m => m.consistency_score >= 80).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Highly Consistent (≥80)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {(metrics.reduce((sum, m) => sum + m.consistency_score, 0) / metrics.length).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average Consistency</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {(metrics.reduce((sum, m) => sum + (m.reliability || 0), 0) / metrics.length).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average Reliability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {metrics.filter(m => m.avg_race_pos != null && m.avg_race_pos <= 10).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Top-10 Avg Finish</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sprint Consistency Tab ── */}
        <TabsContent value="sprint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Gauge className="h-5 w-5 text-orange-500" />
                Average Sprint Finishing Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sprintChartData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No sprint data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, sprintChartData.length * 40)}>
                  <BarChart
                    data={sprintChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      domain={[0, 'dataMax + 2']}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      label={{
                        value: 'Avg Sprint Position',
                        position: 'insideBottomRight',
                        offset: -5,
                        style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                      }}
                    />
                    <YAxis
                      dataKey="full_name"
                      type="category"
                      width={140}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val: string) => {
                        const driver = sprintChartData.find(d => d.full_name === val);
                        return driver ? `${driver.acronym} ${val.split(' ').pop() || ''}` : val;
                      }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="avg_pos" name="Avg Sprint Position" radius={[0, 4, 4, 0]}>
                      {sprintChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Full Table Tab ── */}
        <TabsContent value="table" className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase w-12">#</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Driver</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Team</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Avg Race Pos</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Avg Sprint Pos</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Consistency</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Reliability</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Pts/Race</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase">Total Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr
                      key={m.driver_number}
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        i % 2 === 1 ? 'bg-muted/10' : ''
                      }`}
                    >
                      <td className="p-3">
                        <span className={`font-bold text-sm ${posClass(i + 1)}`}>
                          {posEmoji(i + 1)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: teamColor(m.team_colour) }}
                          />
                          <div>
                            <div className="font-semibold text-sm">{m.acronym}</div>
                            <div className="text-xs text-muted-foreground">{m.full_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: teamColor(m.team_colour) }}
                          />
                          <span className="text-sm text-muted-foreground">{m.team_name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm font-medium">
                          {m.avg_race_pos != null ? m.avg_race_pos.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm text-muted-foreground">
                          {m.avg_sprint_pos != null ? m.avg_sprint_pos.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            m.consistency_score >= 80
                              ? 'border-green-500/50 text-green-400'
                              : m.consistency_score >= 60
                              ? 'border-yellow-500/50 text-yellow-400'
                              : 'border-red-500/50 text-red-400'
                          }`}
                        >
                          {m.consistency_score}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm">
                          {m.reliability.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-mono text-sm text-muted-foreground">
                          {m.points_per_race.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-bold text-sm">{m.total_points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
