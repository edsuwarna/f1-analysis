import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor } from '@/lib/formatters';
import { Swords, Users, TrendingUp, Zap } from 'lucide-react';

interface TeamBattle {
  team_name: string;
  team_colour: string;
  drivers: string[];  // API returns acronym strings, not objects
  race_wins: Record<string, number>;
  qual_wins: Record<string, number>;
}

interface TeamBattleData {
  total_teams: number;
  battles: TeamBattle[];
}

export default function TeamBattlePage() {
  const [data, setData] = useState<TeamBattleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/analytics/teammate-battle?year=2026`);
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

  const { battles } = data;

  // Compute qualifying and race win totals for percentage bars
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
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-orange-500" />
          Teammate Battles
        </h1>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          <Users className="h-3.5 w-3.5 mr-1" />
          {data.total_teams || battles.length} teams
        </Badge>
      </div>

      {/* Team Selector */}
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
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: teamColor(battle.team_colour) }}
                />
                <h3 className="font-semibold text-lg">{battle.team_name}</h3>
              </div>

              {/* Driver Names */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {d1 && (
                  <div
                    className="rounded-lg px-4 py-2.5 text-center"
                    style={{ background: `${teamColor(battle.team_colour)}20` }}
                  >
                    <span className="font-bold text-base">{d1}</span>
                  </div>
                )}
                {d2 && (
                  <div
                    className="rounded-lg px-4 py-2.5 text-center"
                    style={{ background: `${teamColor(battle.team_colour)}20` }}
                  >
                    <span className="font-bold text-base">{d2}</span>
                  </div>
                )}
              </div>

              {/* Qualifying Battle */}
              {d1Stats && d2Stats && (
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Qualifying
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold w-8 text-right" style={{ color: teamColor(battle.team_colour) }}>
                      {d1}
                    </span>
                    <div className="flex-1 flex rounded-full overflow-hidden h-5 bg-secondary">
                      <div
                        className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                        style={{
                          width: `${d1Stats.qualPercent}%`,
                          background: teamColor(battle.team_colour),
                        }}
                      >
                        {d1Stats.qualPercent > 15 ? `${d1Stats.qualWins}` : ''}
                      </div>
                      <div
                        className="flex items-center justify-center text-[10px] font-bold text-white transition-all ml-[1px]"
                        style={{
                          width: `${d2Stats.qualPercent}%`,
                          background: teamColor(battle.team_colour),
                          opacity: 0.5,
                        }}
                      >
                        {d2Stats.qualPercent > 15 ? `${d2Stats.qualWins}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-semibold w-8" style={{ color: teamColor(battle.team_colour), opacity: 0.7 }}>
                      {d2}
                    </span>
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
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Race Pace
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold w-8 text-right" style={{ color: teamColor(battle.team_colour) }}>
                      {d1}
                    </span>
                    <div className="flex-1 flex rounded-full overflow-hidden h-5 bg-secondary">
                      <div
                        className="flex items-center justify-center text-[10px] font-bold text-white transition-all"
                        style={{
                          width: `${d1Stats.racePercent}%`,
                          background: teamColor(battle.team_colour),
                        }}
                      >
                        {d1Stats.racePercent > 15 ? `${d1Stats.raceWins}` : ''}
                      </div>
                      <div
                        className="flex items-center justify-center text-[10px] font-bold text-white transition-all ml-[1px]"
                        style={{
                          width: `${d2Stats.racePercent}%`,
                          background: teamColor(battle.team_colour),
                          opacity: 0.5,
                        }}
                      >
                        {d2Stats.racePercent > 15 ? `${d2Stats.raceWins}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-semibold w-8" style={{ color: teamColor(battle.team_colour), opacity: 0.7 }}>
                      {d2}
                    </span>
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
    </div>
  );
}
