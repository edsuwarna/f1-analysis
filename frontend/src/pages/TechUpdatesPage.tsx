import { useEffect, useState } from 'react';
import { getChampionship, type ChampionshipData, type RaceResult, type StandingRow } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Wrench, Trophy, BarChart3, Medal, Star } from 'lucide-react';

export default function TechUpdatesPage() {
  const [data, setData] = useState<ChampionshipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChampionship(2026).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-12 text-muted-foreground">Loading season data...</div>;
  if (!data) return <div className="text-center p-12 text-muted-foreground">No data available</div>;

  const { races, driver_standings, constructor_standings, races_completed } = data;

  // Stats
  const totalDrivers = driver_standings.length;
  const totalConstructors = constructor_standings.length;
  const winners = new Set(races.map(r => r.results?.[0]?.acronym).filter(Boolean));
  const podiumDrivers = new Set(
    races.flatMap(r => r.results?.slice(0, 3).map(res => res.acronym).filter(Boolean) || [])
  );
  const uniqueWinners = races.filter(r => r.results?.[0]);

  // Podium counts
  const podiumCount: Record<string, { count: number; team: string; colour: string; name: string }> = {};
  races.forEach(r => {
    r.results?.slice(0, 3).forEach(res => {
      if (!podiumCount[res.acronym]) {
        const drv = driver_standings.find(d => d.name_acronym === res.acronym);
        podiumCount[res.acronym] = { count: 0, team: res.team_name, colour: res.team_colour, name: drv?.full_name || res.acronym };
      }
      podiumCount[res.acronym].count++;
    });
  });

  // Win counts
  const winCount: Record<string, { wins: number; team: string; colour: string; name: string }> = {};
  races.forEach(r => {
    const w = r.results?.[0];
    if (w) {
      if (!winCount[w.acronym]) {
        const drv = driver_standings.find(d => d.name_acronym === w.acronym);
        winCount[w.acronym] = { wins: 0, team: w.team_name, colour: w.team_colour, name: drv?.full_name || w.acronym };
      }
      winCount[w.acronym].wins++;
    }
  });

  // Constructor wins
  const constructorWins: Record<string, { wins: number; colour: string }> = {};
  races.forEach(r => {
    const w = r.results?.[0];
    if (w) {
      if (!constructorWins[w.team_name]) {
        constructorWins[w.team_name] = { wins: 0, colour: w.team_colour };
      }
      constructorWins[w.team_name].wins++;
    }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Wrench className="h-6 w-6 text-cyan-500" />
        2026 Season Report
      </h1>

      {/* Season Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <BarChart3 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{races_completed}</p>
          <p className="text-xs text-muted-foreground">Races Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalDrivers}</p>
          <p className="text-xs text-muted-foreground">Drivers</p>
        </Card>
        <Card className="p-4 text-center">
          <Medal className="h-5 w-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{uniqueWinners.length > 0 ? winners.size : '-'}</p>
          <p className="text-xs text-muted-foreground">Different Winners</p>
        </Card>
        <Card className="p-4 text-center">
          <Star className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalConstructors}</p>
          <p className="text-xs text-muted-foreground">Constructors</p>
        </Card>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Race Results</TabsTrigger>
          <TabsTrigger value="winners">Winners & Podiums</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        {/* Race Results */}
        <TabsContent value="results" className="mt-4 space-y-4">
          {[...races].reverse().map(race => {
            const results = race.results || [];
            if (results.length === 0) return null;

            const winner = results[0];
            return (
              <Card key={race.meeting_id} className="overflow-hidden">
                <div className="p-4 border-b border-border bg-gradient-to-r from-card to-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2">
                        {flagEmoji(race.country_code)} {race.race_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: teamColor(winner.team_colour) }} />
                      <span className="font-semibold text-sm">{winner.acronym}</span>
                      <Badge className="text-[10px] bg-yellow-500/20 text-yellow-500 border-yellow-500/30">WIN</Badge>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground w-10">Pos</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Team</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(0, 10).map((res, i) => (
                        <tr key={i} className="border-b border-border last:border-0 text-sm hover:bg-muted/20">
                          <td className="p-2">
                            <span className={`font-bold text-xs ${
                              res.position === 1 ? 'text-yellow-500' :
                              res.position === 2 ? 'text-gray-400' :
                              res.position === 3 ? 'text-amber-600' :
                              'text-muted-foreground'
                            }`}>
                              {res.position <= 3 ? ['🥇', '🥈', '🥉'][res.position - 1] : `#${res.position}`}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: teamColor(res.team_colour) }} />
                              <span className="font-medium">{res.acronym}</span>
                            </span>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">{res.team_name}</td>
                          <td className="p-2 text-right font-mono text-xs">{res.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.length > 10 && (
                  <div className="p-2 text-center text-xs text-muted-foreground border-t border-border">
                    +{results.length - 10} more drivers
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* Winners & Podiums */}
        <TabsContent value="winners" className="mt-4 space-y-6">
          {/* Win Leaders */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Win Leaders
            </h3>
            <div className="space-y-3">
              {Object.entries(winCount)
                .sort(([, a], [, b]) => b.wins - a.wins)
                .filter(([, v]) => v.wins > 0)
                .map(([acronym, info], i) => (
                  <div key={acronym} className="flex items-center gap-3">
                    <span className={`w-6 text-center font-bold text-sm ${
                      i === 0 ? 'text-yellow-500' : 'text-muted-foreground'
                    }`}>{i + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(info.colour) }} />
                    <span className="flex-1 font-medium">{info.name}</span>
                    <span className="text-xs text-muted-foreground">{info.team}</span>
                    <Badge className="text-xs font-bold">{info.wins} {info.wins === 1 ? 'win' : 'wins'}</Badge>
                  </div>
                ))}
            </div>
          </Card>

          {/* Podium Leaders */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Medal className="h-4 w-4 text-purple-500" />
              Podium Appearances
            </h3>
            <div className="space-y-3">
              {Object.entries(podiumCount)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([acronym, info], i) => (
                  <div key={acronym} className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-sm text-muted-foreground">{i + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(info.colour) }} />
                    <span className="flex-1 font-medium">{info.name}</span>
                    <span className="text-xs text-muted-foreground">{info.team}</span>
                    <Badge variant="secondary" className="text-xs">{info.count} podiums</Badge>
                  </div>
                ))}
            </div>
          </Card>

          {/* Constructor Wins */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-500" />
              Constructor Wins
            </h3>
            <div className="space-y-3">
              {Object.entries(constructorWins)
                .sort(([, a], [, b]) => b.wins - a.wins)
                .map(([team, info], i) => (
                  <div key={team} className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-sm text-muted-foreground">{i + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor(info.colour) }} />
                    <span className="flex-1 font-medium">{team}</span>
                    <Badge variant="outline" className="text-xs">{info.wins} {info.wins === 1 ? 'win' : 'wins'}</Badge>
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>

        {/* Standings Summary */}
        <TabsContent value="standings" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Driver Standings */}
            <Card>
              <div className="p-4 border-b border-border">
                <h3 className="font-bold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Driver Standings
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Pos</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Team</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driver_standings.map(d => (
                      <tr key={d.driver_number} className="border-b border-border text-sm hover:bg-muted/20">
                        <td className="p-2 font-bold text-xs text-muted-foreground">{d.position}</td>
                        <td className="p-2">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                            <span className="font-medium">{d.name_acronym}</span>
                            <span className="text-xs text-muted-foreground hidden md:inline">{d.full_name}</span>
                          </span>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground hidden sm:table-cell">{d.team_name}</td>
                        <td className="p-2 text-right font-bold">{d.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Constructor Standings */}
            <Card>
              <div className="p-4 border-b border-border">
                <h3 className="font-bold flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-500" />
                  Constructor Standings
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Pos</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Team</th>
                      <th className="text-right p-2 text-xs font-medium text-muted-foreground">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constructor_standings.map(c => (
                      <tr key={c.team_name} className="border-b border-border text-sm hover:bg-muted/20">
                        <td className="p-2 font-bold text-xs text-muted-foreground">{c.position}</td>
                        <td className="p-2">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: teamColor(c.team_colour) }} />
                            <span className="font-medium">{c.team_name}</span>
                          </span>
                        </td>
                        <td className="p-2 text-right font-bold">{c.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
