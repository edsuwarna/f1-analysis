import { useEffect, useState } from 'react';
import { getMeetings, getTechUpdates, type Meeting, type TechUpdatesData, type TechUpdateDriver } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor } from '@/lib/formatters';
import { Wrench, Gauge, ArrowUpDown, Sparkles, Zap, RotateCcw, BarChart3 } from 'lucide-react';

const GEAR_LABELS: Record<string, string> = {
  '1': '1st', '2': '2nd', '3': '3rd', '4': '4th',
  '5': '5th', '6': '6th', '7': '7th', '8': '8th',
};

export default function TechUpdatesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [data, setData] = useState<TechUpdatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMeetings(2026).then(m => {
      const races = m.filter(x => !x.name.includes('Pre-Season') && !x.name.includes('Testing'));
      setMeetings(races);
      if (races.length > 0) setSelectedId(races[races.length - 1].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    getTechUpdates(selectedId).then(d => {
      if (d.error) setError(d.error);
      else setData(d);
    }).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, [selectedId]);

  const drivers = data?.drivers || [];
  const sortedMaxSpeed = [...drivers].sort((a, b) => b.speed.max_speed - a.speed.max_speed);
  const sortedRPM = [...drivers].sort((a, b) => b.avg_rpm - a.avg_rpm);
  const sortedDRS = [...drivers].sort((a, b) => b.drs_pct - a.drs_pct);
  const sortedThrottle = [...drivers].sort((a, b) => b.throttle_avg - a.throttle_avg);
  const sortedBrake = [...drivers].sort((a, b) => b.brake_avg - a.brake_avg);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Wrench className="h-6 w-6 text-cyan-500" />
        Tech Updates — Car Performance
      </h1>

      {/* Race selector */}
      <div className="max-w-md">
        <label className="text-xs text-muted-foreground mb-1 block">Select Grand Prix</label>
        <select
          className="w-full bg-secondary text-foreground border border-border rounded-md px-3 py-2 text-sm"
          value={selectedId ?? ''}
          onChange={e => setSelectedId(Number(e.target.value) || null)}
        >
          <option value="">Choose a race...</option>
          {meetings.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center py-8 text-muted-foreground">Loading telemetry data...</div>}
      {error && <div className="text-center py-8 text-red-500">⚠️ {error}</div>}
      {!loading && !error && drivers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No telemetry data available for this race.
        </div>
      )}

      {drivers.length > 0 && (
        <Tabs defaultValue="speed">
          <TabsList className="overflow-x-auto flex-nowrap w-full justify-start">
            <TabsTrigger value="speed" className="whitespace-nowrap"><Gauge className="h-3.5 w-3.5 mr-1" />Speed</TabsTrigger>
            <TabsTrigger value="gears" className="whitespace-nowrap"><ArrowUpDown className="h-3.5 w-3.5 mr-1" />Gears</TabsTrigger>
            <TabsTrigger value="throttle" className="whitespace-nowrap"><Sparkles className="h-3.5 w-3.5 mr-1" />Throttle</TabsTrigger>
            <TabsTrigger value="brake" className="whitespace-nowrap"><RotateCcw className="h-3.5 w-3.5 mr-1" />Brake</TabsTrigger>
            <TabsTrigger value="rpm" className="whitespace-nowrap"><Zap className="h-3.5 w-3.5 mr-1" />RPM</TabsTrigger>
            <TabsTrigger value="drs" className="whitespace-nowrap"><BarChart3 className="h-3.5 w-3.5 mr-1" />DRS</TabsTrigger>
          </TabsList>

          {/* Speed Tab */}
          <TabsContent value="speed" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Top Speed per Driver (km/h)</h3>
              <div className="space-y-2">
                {sortedMaxSpeed.map((d, i) => {
                  const maxSpeed = d.speed.max_speed || 0;
                  const max = sortedMaxSpeed[0].speed.max_speed || 1;
                  return (
                    <div key={d.driver_number} className="flex items-center gap-2">
                      <span className="w-6 text-xs font-bold text-muted-foreground text-right">{i + 1}</span>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                      <span className="w-10 text-xs font-semibold">{d.acronym}</span>
                      <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold text-white"
                          style={{ width: `${(maxSpeed / max) * 100}%`, background: teamColor(d.team_colour) }}
                        >
                          {maxSpeed > 30 && `${maxSpeed} km/h`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Gears Tab */}
          <TabsContent value="gears" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Gear Distribution per Driver (%)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left p-1.5">Driver</th>
                      {['1','2','3','4','5','6','7','8'].map(g => (
                        <th key={g} className="text-right p-1.5">{GEAR_LABELS[g]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map(d => {
                      const dist = d.gear_distribution || {};
                      return (
                        <tr key={d.driver_number} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="p-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                            <span className="font-semibold">{d.acronym}</span>
                          </td>
                          {['1','2','3','4','5','6','7','8'].map(g => (
                            <td key={g} className="text-right p-1.5 font-mono">
                              {dist[g] ? `${dist[g].toFixed(1)}%` : '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Throttle Tab */}
          <TabsContent value="throttle" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Throttle Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Average Throttle (%)</h4>
                  <div className="space-y-1.5">
                    {sortedThrottle.slice(0, 10).map((d, i) => {
                      const val = d.throttle_avg;
                      const maxVal = sortedThrottle[0].throttle_avg || 1;
                      return (
                        <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                          <span className="w-10 font-semibold">{d.acronym}</span>
                          <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                          </div>
                          <span className="w-12 text-right">{val}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Max Throttle (%)</h4>
                  <div className="space-y-1.5">
                    {[...drivers].sort((a, b) => b.throttle_max - a.throttle_max).slice(0, 10).map((d, i) => (
                      <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                        <span className="w-10 font-semibold">{d.acronym}</span>
                        <div className="flex-1 text-right">{d.throttle_max}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Brake Tab */}
          <TabsContent value="brake" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Brake Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Average Brake (%)</h4>
                  <div className="space-y-1.5">
                    {sortedBrake.slice(0, 10).map((d, i) => {
                      const val = d.brake_avg;
                      const maxVal = sortedBrake[0].brake_avg || 1;
                      return (
                        <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                          <span className="w-10 font-semibold">{d.acronym}</span>
                          <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                          </div>
                          <span className="w-12 text-right">{val}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Max Brake (%)</h4>
                  <div className="space-y-1.5">
                    {[...drivers].sort((a, b) => b.brake_max - a.brake_max).slice(0, 10).map((d, i) => (
                      <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                        <span className="w-10 font-semibold">{d.acronym}</span>
                        <div className="flex-1 text-right">{d.brake_max}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* RPM Tab */}
          <TabsContent value="rpm" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Engine RPM</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Average RPM</h4>
                  <div className="space-y-1.5">
                    {sortedRPM.slice(0, 10).map((d, i) => {
                      const val = d.avg_rpm;
                      const maxVal = sortedRPM[0].avg_rpm || 1;
                      return (
                        <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                          <span className="w-10 font-semibold">{d.acronym}</span>
                          <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-purple-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                          </div>
                          <span className="w-16 text-right font-mono">{val.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Peak RPM</h4>
                  <div className="space-y-1.5">
                    {[...drivers].sort((a, b) => b.max_rpm - a.max_rpm).slice(0, 10).map((d, i) => (
                      <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                        <span className="w-10 font-semibold">{d.acronym}</span>
                        <div className="flex-1 text-right font-mono">{d.max_rpm.toLocaleString()} rpm</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* DRS Tab */}
          <TabsContent value="drs" className="mt-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">DRS Usage (% of lap with DRS open)</h3>
              <div className="space-y-2">
                {sortedDRS.map((d, i) => {
                  const val = d.drs_pct;
                  const maxVal = sortedDRS[0]?.drs_pct || 1;
                  return (
                    <div key={d.driver_number} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-right text-muted-foreground">{i + 1}</span>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: teamColor(d.team_colour) }} />
                      <span className="w-10 font-semibold">{d.acronym}</span>
                      <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(val / maxVal) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right">{val}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
