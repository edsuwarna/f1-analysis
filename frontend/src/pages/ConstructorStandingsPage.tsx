import { useEffect, useState } from 'react';
import { getConstructorStandings, type ConstructorStandingRow } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor } from '@/lib/formatters';
import { Users, Building2 } from 'lucide-react';

export default function ConstructorStandingsPage() {
  const [standings, setStandings] = useState<ConstructorStandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');

  useEffect(() => {
    async function load() {
      try {
        const data = await getConstructorStandings(parseInt(year));
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
          <Building2 className="h-6 w-6 text-blue-500" />
          Constructor Standings
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center p-8 text-muted-foreground">Loading...</div>
        ) : standings.length === 0 ? (
          <div className="col-span-2 text-center p-8 text-muted-foreground">No data available</div>
        ) : (
          standings.map((c, i) => (
            <Card key={c.team_name} className="overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: teamColor(c.team_colour) }} />
                    <div>
                      <h3 className="font-semibold">{c.team_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Position #{c.position}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{c.points}</div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
                {(c.wins ?? 0) > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{(c.wins ?? 0)} Wins</Badge>
                  </div>
                )}
                {/* Points bar */}
                <div className="mt-3 w-full bg-secondary rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${(c.points / Math.max(...standings.map(s => s.points))) * 100}%`,
                      background: teamColor(c.team_colour),
                    }}
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
