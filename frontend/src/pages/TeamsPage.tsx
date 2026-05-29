import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor, formatTime } from '@/lib/formatters';
import { ChevronDown, ChevronRight, Building2, Users, MapPin, Cog, Wrench, Hash, Trophy, Award, Gauge, UserCog, CircleUser } from 'lucide-react';

interface DriverInfo {
  driver_number: number;
  full_name: string;
  acronym: string;
  team_colour: string;
  headshot_url?: string;
  race_engineer?: string;
}

interface TeamInfo {
  team_name: string;
  full_name: string;
  team_colour: string;
  team_principal?: string;
  technical_director?: string;
  base?: string;
  power_unit?: string;
  chassis?: string;
  founded?: number;
  constructors_titles?: number;
  drivers_titles?: number;
  constructor_position?: number;
  constructor_points?: number;
  pit_stop_rank?: number;
  pit_stop_avg?: number;
  pit_stop_count?: number;
  drivers: DriverInfo[];
  reserve_drivers?: string[];
}

interface TeamsApiResponse {
  year: number;
  total_teams: number;
  teams: TeamInfo[];
}

export default function TeamsPage() {
  const [data, setData] = useState<TeamsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/teams?year=2026`);
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

  if (loading) {
    return (
      <div className="text-center py-20 text-muted-foreground">Loading...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">No data available</div>
    );
  }

  const { teams, total_teams } = data;

  function infoItem(label: string, value: string | number | undefined | null, icon?: React.ReactNode) {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</span>}
        <div>
          <span className="text-xs text-muted-foreground block">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-500" />
          Teams
        </h1>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Building2 className="h-3.5 w-3.5 mr-1" />
          {total_teams || teams.length} teams
        </Badge>
      </div>

      {teams.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No team data available</Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {teams.map((team) => {
            const isExpanded = expandedTeams.has(team.team_name);
            return (
            <Card
              key={team.team_name}
              className="overflow-hidden"
              style={{ borderLeft: `4px solid ${teamColor(team.team_colour)}` }}
            >
              {/* Clickable Team Header */}
              <button
                onClick={() => {
                  setExpandedTeams(prev => {
                    const next = new Set(prev);
                    if (next.has(team.team_name)) {
                      next.delete(team.team_name);
                    } else {
                      next.add(team.team_name);
                    }
                    return next;
                  });
                }}
                className="w-full p-6 flex items-start justify-between hover:bg-muted/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ background: teamColor(team.team_colour) }}
                  />
                  <div>
                    <h2 className="text-xl font-bold text-left">{team.full_name || team.team_name}</h2>
                    {team.team_name && team.full_name && team.team_name !== team.full_name && (
                      <p className="text-xs text-muted-foreground">{team.team_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {team.constructor_position && (
                      <Badge variant="secondary" className="text-sm">
                        <Trophy className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                        P{team.constructor_position}
                      </Badge>
                    )}
                    {team.constructor_points !== undefined && (
                      <div className="text-right">
                        <div className="text-lg font-bold">{team.constructor_points}</div>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    )}
                  </div>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (<>
              {/* Info Grid */}
              <div className="p-6 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {infoItem('Team Principal', team.team_principal, <UserCog className="h-4 w-4" />)}
                  {infoItem('Technical Director', team.technical_director, <Wrench className="h-4 w-4" />)}
                  {infoItem('Base', team.base, <MapPin className="h-4 w-4" />)}
                  {infoItem('Power Unit', team.power_unit, <Cog className="h-4 w-4" />)}
                  {infoItem('Chassis', team.chassis, <Cog className="h-4 w-4" />)}
                  {infoItem('Founded', team.founded, <Hash className="h-4 w-4" />)}
                  {infoItem('Constructor Titles', team.constructors_titles, <Trophy className="h-4 w-4" />)}
                  {infoItem('Driver Titles', team.drivers_titles, <Award className="h-4 w-4" />)}
                </div>
              </div>

              {/* Drivers */}
              <div className="p-6 border-t border-border">
                <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-4">
                  <Users className="h-4 w-4" />
                  Drivers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {team.drivers?.map((driver) => (
                    <div
                      key={driver.driver_number}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      {/* Headshot */}
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                        {driver.headshot_url ? (
                          <img
                            src={driver.headshot_url}
                            alt={driver.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML =
                                `<div class="w-full h-full flex items-center justify-center text-lg font-bold" style="color:${teamColor(driver.team_colour)}">${driver.acronym?.[0] || '?'}</div>`;
                            }}
                          />
                        ) : (
                          <span
                            className="text-lg font-bold"
                            style={{ color: teamColor(driver.team_colour) }}
                          >
                            {driver.acronym?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{driver.full_name}</span>
                          <span
                            className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{
                              background: `${teamColor(driver.team_colour)}20`,
                              color: teamColor(driver.team_colour),
                            }}
                          >
                            {driver.acronym}
                          </span>
                        </div>
                        {driver.race_engineer && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <CircleUser className="h-3 w-3 inline mr-1" />
                            {driver.race_engineer}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pit Stop Info */}
              {(team.pit_stop_rank || team.pit_stop_avg) && (
                <div className="p-6 border-t border-border">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                    <Gauge className="h-4 w-4" />
                    Pit Stop Performance
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {team.pit_stop_rank && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rank:</span>
                        <Badge variant="secondary">#{team.pit_stop_rank}</Badge>
                      </div>
                    )}
                    {team.pit_stop_avg && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Avg Duration:</span>
                        <span className="text-sm font-mono font-semibold">{formatTime(team.pit_stop_avg)}</span>
                      </div>
                    )}
                    {team.pit_stop_count && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Total Stops:</span>
                        <span className="text-sm font-semibold">{team.pit_stop_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reserve Drivers */}
              {team.reserve_drivers && team.reserve_drivers.length > 0 && (
                <div className="p-6">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                    <CircleUser className="h-4 w-4" />
                    Reserve Drivers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {team.reserve_drivers.map((name, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              </>)}
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
