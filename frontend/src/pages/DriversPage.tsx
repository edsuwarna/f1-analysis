import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Users,
  Trophy,
  Medal,
  Gauge,
  Flag,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  List,
} from 'lucide-react';

interface DriverResult {
  meeting_id: number;
  race_name: string;
  session_name: string;
  position: number;
  points: number;
  dnf: boolean;
}

interface DriverData {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string;
  country_code: string;
  points: number;
  wins: number;
  podiums: number;
  races_completed: number;
  avg_finish: number;
  dnf_count: number;
  results: DriverResult[];
}

interface DriversApiResponse {
  year: number;
  total_drivers: number;
  drivers: DriverData[];
}

export default function DriversPage() {
  const [data, setData] = useState<DriversApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDriver, setExpandedDriver] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/drivers?year=2026`);
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxPoints = data?.drivers?.length
    ? Math.max(...data.drivers.map((d) => d.points), 1)
    : 1;

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No data available
      </div>
    );
  }

  const { drivers, total_drivers } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-500" />
          Drivers
        </h1>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="h-3.5 w-3.5 mr-1" />
          {total_drivers || drivers.length} drivers
        </Badge>
      </div>

      {drivers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No driver data available
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drivers.map((driver) => {
            const isExpanded = expandedDriver === driver.driver_number;
            return (
              <div key={driver.driver_number}>
                <Card
                  className={cn(
                    'overflow-hidden cursor-pointer transition-all hover:shadow-md',
                    isExpanded && 'ring-2 ring-primary'
                  )}
                  style={{
                    borderLeft: `4px solid ${teamColor(driver.team_colour)}`,
                  }}
                  onClick={() =>
                    setExpandedDriver(
                      isExpanded ? null : driver.driver_number
                    )
                  }
                >
                  {/* Driver Header: headshot, name, number, team */}
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted"
                        style={{ boxShadow: `inset 0 0 0 2px ${teamColor(driver.team_colour)}` }}>
                        {driver.headshot_url ? (
                          <img
                            src={driver.headshot_url}
                            alt={driver.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                              const p = el.parentElement!;
                              p.innerHTML = `<span class="text-lg font-bold" style="color:${teamColor(driver.team_colour)}">${driver.name_acronym?.[0] || '?'}</span>`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: `${teamColor(driver.team_colour)}20`, color: teamColor(driver.team_colour) }}>
                            <span className="text-lg font-bold">{driver.name_acronym?.[0] || '?'}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">
                            {driver.full_name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono px-1.5 py-0.5 flex-shrink-0"
                            style={{
                              background: `${teamColor(driver.team_colour)}20`,
                              borderColor: teamColor(driver.team_colour),
                              color: teamColor(driver.team_colour),
                            }}
                          >
                            #{driver.driver_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{
                              background: teamColor(driver.team_colour),
                            }}
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            {driver.team_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase">
                            {driver.name_acronym}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold">
                          {driver.points}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          pts
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid: Wins, Podiums, Avg Finish, Races, Points, DNFs */}
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-bold">
                            {driver.wins}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Wins
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Medal className="h-3 w-3 text-amber-500" />
                          <span className="text-sm font-bold">
                            {driver.podiums}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Podiums
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Gauge className="h-3 w-3 text-blue-500" />
                          <span className="text-sm font-bold">
                            {driver.avg_finish?.toFixed(1) || '-'}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Avg Finish
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Flag className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-bold">
                            {driver.races_completed}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Races
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Award className="h-3 w-3 text-purple-500" />
                          <span className="text-sm font-bold">
                            {driver.points}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Points
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span className="text-sm font-bold">
                            {driver.dnf_count}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          DNFs
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        Performance
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {((driver.points / maxPoints) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(driver.points / maxPoints) * 100}%`,
                          background: teamColor(driver.team_colour),
                        }}
                      />
                    </div>
                  </div>

                  {/* Expand/Collapse Indicator */}
                  <div className="px-4 pb-3 flex justify-center">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Card>

                {/* Expanded Results Section */}
                {isExpanded && driver.results && driver.results.length > 0 && (
                  <Card className="mt-2 overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <List className="h-4 w-4 text-blue-500" />
                        Race Results
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDriver(null);
                        }}
                        className="p-1 rounded-md hover:bg-muted transition-colors"
                        aria-label="Close results"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                              Race
                            </th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                              Session
                            </th>
                            <th className="text-center p-3 text-xs font-medium text-muted-foreground">
                              Pos
                            </th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                              Pts
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {driver.results.map((result, idx) => {
                            const posBadge =
                              result.dnf ? (
                                <Badge
                                  variant="outline"
                                  className="text-red-500 border-red-500/30 bg-red-500/10"
                                >
                                  DNF
                                </Badge>
                              ) : result.position === 1 ? (
                                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                  P1
                                </Badge>
                              ) : result.position === 2 ? (
                                <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">
                                  P2
                                </Badge>
                              ) : result.position === 3 ? (
                                <Badge className="bg-amber-600/20 text-amber-600 border-amber-600/30">
                                  P3
                                </Badge>
                              ) : result.points > 0 ? (
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                                  P{result.position}
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  P{result.position}
                                </Badge>
                              );

                            return (
                              <tr
                                key={idx}
                                className={cn(
                                  'border-b border-border hover:bg-muted/20',
                                  result.dnf && 'bg-red-500/5'
                                )}
                              >
                                <td className="p-3">{result.race_name}</td>
                                <td className="p-3 text-muted-foreground">
                                  {result.session_name}
                                </td>
                                <td className="p-3 text-center">
                                  {posBadge}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold">
                                  {result.points}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Expanded results — empty state */}
                {isExpanded &&
                  (!driver.results || driver.results.length === 0) && (
                    <Card className="mt-2 p-6 text-center text-muted-foreground text-sm">
                      <List className="h-5 w-5 mx-auto mb-2 opacity-50" />
                      No results data available
                    </Card>
                  )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
