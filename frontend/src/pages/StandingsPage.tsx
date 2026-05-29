import { useEffect, useState } from 'react';
import { getDriverStandings, getConstructorStandings, type StandingRow, type ConstructorStandingRow } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Trophy, Users, ChevronDown, ChevronRight } from 'lucide-react';

export default function StandingsPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');
  const [drivers, setDrivers] = useState<StandingRow[]>([]);
  const [constructors, setConstructors] = useState<ConstructorStandingRow[]>([]);
  const [driverOpen, setDriverOpen] = useState(false);
  const [constructorOpen, setConstructorOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [d, c] = await Promise.all([
          getDriverStandings(parseInt(year)),
          getConstructorStandings(parseInt(year)),
        ]);
        setDrivers(d);
        setConstructors(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Standings
        </h1>
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
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No data available</td></tr>
                    ) : (
                      drivers.map((d, i) => (
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
