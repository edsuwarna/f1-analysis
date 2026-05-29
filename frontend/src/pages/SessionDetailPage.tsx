import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMeeting, getSessions, getSessionDrivers, getLaps, getPitStops,
  getWeather, getRaceControl, getStints, getTelemetry,
  type Meeting, type Session, type SessionDriver, type Lap,
  type PitStop, type Weather, type RaceControl, type Stint,
  type TelemetrySample,
} from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { teamColor, formatTime, flagEmoji } from '@/lib/formatters';
import { ArrowLeft, Clock, Gauge, Thermometer, Flag, Radio } from 'lucide-react';

export default function SessionDetailPage() {
  const { meetingId, sessionId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [pits, setPits] = useState<PitStop[]>([]);
  const [weather, setWeather] = useState<Weather[]>([]);
  const [raceControl, setRaceControl] = useState<RaceControl[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!meetingId || !sessionId) return;
      setLoading(true);
      try {
        const [m, s, d, l, p, w, rc, st] = await Promise.all([
          getMeeting(parseInt(meetingId)),
          getSessions(parseInt(meetingId)).then(sessions =>
            sessions.find(s => s.id === parseInt(sessionId!))
          ),
          getSessionDrivers(parseInt(sessionId)),
          getLaps(parseInt(sessionId)),
          getPitStops(parseInt(sessionId)),
          getWeather(parseInt(sessionId)),
          getRaceControl(parseInt(sessionId)),
          getStints(parseInt(sessionId)),
        ]);
        setMeeting(m);
        setSession(s || null);
        setDrivers(d);
        setLaps(l);
        setPits(p);
        setWeather(w);
        setRaceControl(rc);
        setStints(st);
      } catch (e) {
        console.error('Session load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [meetingId, sessionId]);

  if (loading) {
    return <div className="text-center p-12 text-muted-foreground">Loading session...</div>;
  }

  if (!session) {
    return <div className="text-center p-12 text-muted-foreground">Session not found</div>;
  }

  const driverMap = Object.fromEntries(drivers.map(d => [d.driver_number, d]));
  const isRace = session.session_type === 'Race' || session.session_name?.includes('Race');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/#/races"
          className="p-2 rounded-md hover:bg-muted transition-colors"
          onClick={e => { e.preventDefault(); window.history.back(); }}
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">{meeting?.name || 'Session'}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{session.session_name || session.session_type}</Badge>
            <span>{flagEmoji(meeting?.country_code)} {meeting?.circuit_name}</span>
          </div>
        </div>
      </div>

      {/* Driver Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {drivers.slice(0, 10).map(d => (
          <Card key={d.driver_number} className="p-3 text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: teamColor(d.team_colour) }} />
            <p className="font-bold text-sm">{d.name_acronym}</p>
            <p className="text-xs text-muted-foreground truncate">{d.team_name}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="laps">
        <TabsList>
          <TabsTrigger value="laps">Lap Times</TabsTrigger>
          <TabsTrigger value="tyres">Tyre Strategy</TabsTrigger>
          <TabsTrigger value="pits">Pit Stops</TabsTrigger>
          {weather.length > 0 && <TabsTrigger value="weather">Weather</TabsTrigger>}
          {raceControl.length > 0 && <TabsTrigger value="flags">Race Director</TabsTrigger>}
        </TabsList>

        <TabsContent value="laps" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left p-2 text-xs font-medium text-muted-foreground">Driver</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground">Lap Time</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S1</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S2</th>
                    <th className="text-right p-2 text-xs font-medium text-muted-foreground hidden md:table-cell">S3</th>
                    <th className="text-center p-2 text-xs font-medium text-muted-foreground">Tyre</th>
                  </tr>
                </thead>
                <tbody>
                  {laps.filter(l => !l.is_pit_out_lap && !l.is_pit_in_lap).slice(0, 200).map((lap, i) => {
                    const drv = driverMap[lap.driver_number];
                    const isPersonalBest = i > 0 && lap.lap_duration < laps.filter(l => l.driver_number === lap.driver_number && l.lap_number < lap.lap_number).reduce((min, l) => Math.min(min, l.lap_duration || 999), Infinity);
                    return (
                      <tr key={`${lap.driver_number}-${lap.lap_number}`} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                        <td className="p-2 text-muted-foreground">{lap.lap_number}</td>
                        <td className="p-2">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: teamColor(drv?.team_colour) }} />
                            <span className="font-medium">{drv?.name_acronym || lap.driver_number}</span>
                          </span>
                        </td>
                        <td className={`p-2 text-right font-mono ${isPersonalBest ? 'text-green-400' : ''}`}>
                          {formatTime(lap.lap_duration)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_1)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_2)}
                        </td>
                        <td className="p-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                          {formatTime(lap.duration_sector_3)}
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className={`text-[10px] ${
                            lap.compound === 'SOFT' ? 'bg-red-500/10 text-red-500' :
                            lap.compound === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                            lap.compound === 'HARD' ? 'bg-gray-500/10 text-gray-400' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {lap.compound?.substring(0, 4)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tyres" className="mt-4">
          <Card className="p-5">
            <p className="text-muted-foreground text-sm">
              Tyre strategy data available for this session. Click "Load" in the full version to see detailed stint analysis.
            </p>
            {stints.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                {stints.length} stints recorded across {new Set(stints.map(s => s.driver_number)).size} drivers
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pits" className="mt-4">
          <Card className="overflow-hidden">
            {pits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No pit stop data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Driver</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Lap</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Duration</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Compound</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pits.slice(0, 50).map((p, i) => {
                      const drv = driverMap[p.driver_number];
                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors text-sm">
                          <td className="p-3">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: teamColor(drv?.team_colour) }} />
                              {drv?.name_acronym || p.driver_number}
                            </span>
                          </td>
                          <td className="p-3 text-right">L{p.lap_number}</td>
                          <td className={`p-3 text-right font-mono ${(p.pit_duration || 0) <= 22 ? 'text-green-400' : ''}`}>
                            {p.pit_duration?.toFixed(1)}s
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="text-[10px]">{p.compound}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {weather.length > 0 && (
          <TabsContent value="weather" className="mt-4">
            <Card className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <Thermometer className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {Math.round(weather.reduce((s, w) => s + (w.air_temp || 0), 0) / weather.length)}°
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Air Temp</p>
                </div>
                <div className="text-center">
                  <Gauge className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {Math.round(weather.reduce((s, w) => s + (w.track_temp || 0), 0) / weather.length)}°
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Track Temp</p>
                </div>
                <div className="text-center">
                  <Flag className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold">
                    {weather.filter(w => w.rainfall).length > 0 ? '🌧️' : '☀️'}
                  </div>
                  <p className="text-xs text-muted-foreground">{weather.filter(w => w.rainfall).length > 0 ? 'Rain' : 'Dry'}</p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-muted-foreground">Sample</th>
                      <th className="text-right p-2 text-muted-foreground">Air</th>
                      <th className="text-right p-2 text-muted-foreground">Track</th>
                      <th className="text-right p-2 text-muted-foreground">Humidity</th>
                      <th className="text-center p-2 text-muted-foreground">Rain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weather.slice(0, 30).map((w, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2 text-muted-foreground">#{i + 1}</td>
                        <td className="p-2 text-right">{w.air_temp?.toFixed(1)}°</td>
                        <td className="p-2 text-right">{w.track_temp?.toFixed(1)}°</td>
                        <td className="p-2 text-right">{w.humidity != null ? `${w.humidity}%` : '-'}</td>
                        <td className="p-2 text-center">{w.rainfall ? '🌧️' : '☀️'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}

        {raceControl.length > 0 && (
          <TabsContent value="flags" className="mt-4">
            <Card className="p-5">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Lap</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Flag</th>
                      <th className="text-left p-2 text-xs font-medium text-muted-foreground">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raceControl.slice(0, 50).map((rc, i) => (
                      <tr key={i} className="border-b border-border text-sm">
                        <td className="p-2 text-muted-foreground">{rc.lap_number ? `L${rc.lap_number}` : '-'}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={`text-xs ${
                            rc.flag === 'GREEN' ? 'bg-green-500/10 text-green-500' :
                            rc.flag === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-500' :
                            rc.flag === 'RED' ? 'bg-red-500/10 text-red-500' :
                            rc.flag === 'CHEQUERED' ? 'bg-purple-500/10 text-purple-500' :
                            rc.flag === 'SC' ? 'bg-orange-500/10 text-orange-500' :
                            rc.flag === 'VSC' ? 'bg-blue-500/10 text-blue-500' :
                            ''
                          }`}>{rc.flag}</Badge>
                        </td>
                        <td className="p-2">{rc.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
