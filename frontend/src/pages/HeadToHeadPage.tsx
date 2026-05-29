import { useEffect, useState } from 'react';
import { getDriverStandings, getConstructorStandings, getSectorTrends, type StandingRow, type SectorTrend } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { teamColor, formatTime } from '@/lib/formatters';
import { Swords, Trophy, Users } from 'lucide-react';

export default function HeadToHeadPage() {
  const [drivers, setDrivers] = useState<StandingRow[]>([]);
  const [sectors, setSectors] = useState<SectorTrend[]>([]);
  const [driver1, setDriver1] = useState<string>('');
  const [driver2, setDriver2] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const [d, s] = await Promise.all([
          getDriverStandings(2026),
          getSectorTrends(2026, 'Race'),
        ]);
        setDrivers(d);
        setSectors(s);
        if (d.length >= 2) {
          setDriver1(d[0].driver_number.toString());
          setDriver2(d[1].driver_number.toString());
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const d1Data = drivers.find(d => d.driver_number.toString() === driver1);
  const d2Data = drivers.find(d => d.driver_number.toString() === driver2);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Swords className="h-6 w-6 text-orange-500" />
        Head to Head
      </h1>

      {/* Driver Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Driver 1</label>
          <select
            className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
            value={driver1}
            onChange={e => setDriver1(e.target.value)}
          >
            {drivers.map(d => (
              <option key={d.driver_number} value={d.driver_number}>
                {d.full_name} ({d.team_name})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Driver 2</label>
          <select
            className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
            value={driver2}
            onChange={e => setDriver2(e.target.value)}
          >
            {drivers.map(d => (
              <option key={d.driver_number} value={d.driver_number}>
                {d.full_name} ({d.team_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Grid */}
      {d1Data && d2Data && (
        <>
          {/* Overview */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Points</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div>
                  <span className="block text-2xl font-bold" style={{ color: teamColor(d1Data.team_colour) }}>{d1Data.points}</span>
                  <span className="text-xs text-muted-foreground">{d1Data.name_acronym}</span>
                </div>
                <span className="text-muted-foreground">vs</span>
                <div>
                  <span className="block text-2xl font-bold" style={{ color: teamColor(d2Data.team_colour) }}>{d2Data.points}</span>
                  <span className="text-xs text-muted-foreground">{d2Data.name_acronym}</span>
                </div>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Wins</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-2xl font-bold">{d1Data.wins}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="text-2xl font-bold">{d2Data.wins}</span>
              </div>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Position</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-2xl font-bold">#{d1Data.position}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="text-2xl font-bold">#{d2Data.position}</span>
              </div>
            </Card>
          </div>

          {/* Best Lap Comparison */}
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Best Lap Comparison (Season)</h3>
            <div className="overflow-x-auto">
              {(() => {
                const d1Sectors = sectors.filter(s => s.driver_number.toString() === driver1);
                const d2Sectors = sectors.filter(s => s.driver_number.toString() === driver2);
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-muted-foreground">Race</th>
                        <th className="text-right p-2 text-muted-foreground">{d1Data.name_acronym}</th>
                        <th className="text-right p-2 text-muted-foreground">{d2Data.name_acronym}</th>
                        <th className="text-center p-2 text-muted-foreground">Winner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d1Sectors.slice(0, 10).map((s1, idx) => {
                        const s2 = d2Sectors.find(s => s.race_name === s1.race_name);
                        if (!s2) return null;
                        const winner = s1.best_lap < s2.best_lap ? d1Data.name_acronym : d2Data.name_acronym;
                        const isD1 = winner === d1Data.name_acronym;
                        return (
                          <tr key={idx} className="border-b border-border">
                            <td className="p-2 text-muted-foreground">{s1.race_name}</td>
                            <td className={`p-2 text-right font-mono ${s1.best_lap < s2.best_lap ? 'text-green-400 font-bold' : ''}`}>
                              {formatTime(s1.best_lap)}
                            </td>
                            <td className={`p-2 text-right font-mono ${s2.best_lap < s1.best_lap ? 'text-green-400 font-bold' : ''}`}>
                              {formatTime(s2.best_lap)}
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className={`text-xs ${isD1 ? 'border-green-500 text-green-400' : 'border-orange-500 text-orange-400'}`}>
                                {winner}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </Card>
        </>
      )}

      {(!d1Data || !d2Data) && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Select two drivers to compare</p>
        </Card>
      )}
    </div>
  );
}
