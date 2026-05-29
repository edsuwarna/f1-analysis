import { useEffect, useState } from 'react';
import { getDriverStandings, type StandingRow } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Trophy, Medal } from 'lucide-react';

export default function DriverStandingsPage() {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');

  useEffect(() => {
    async function load() {
      try {
        const data = await getDriverStandings(parseInt(year));
        setStandings(data);
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
          Driver Standings
        </h1>
        <select
          className="bg-secondary text-foreground border border-border rounded-md px-3 py-1.5 text-sm"
          value={year}
          onChange={e => { setYear(e.target.value); setLoading(true); }}
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="2024">2024</option>
        </select>
      </div>

      <Card className="overflow-hidden">
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
              {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">Loading...</td></tr>
              ) : standings.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-muted-foreground">No data available</td></tr>
              ) : (
                standings.map((d, i) => (
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
      </Card>
    </div>
  );
}
