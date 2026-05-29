import { useEffect, useState } from 'react';
import { getMeetings, getChampionship, type Meeting, type ConstructorStandingRow, type StandingRow } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Calendar, Trophy, Users, Gauge, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

export default function HomePage() {
  const [allDrivers, setAllDrivers] = useState<StandingRow[]>([]);
  const [allConstructors, setAllConstructors] = useState<ConstructorStandingRow[]>([]);
  const [nextRace, setNextRace] = useState<Meeting | null>(null);
  const [driverWins, setDriverWins] = useState<Record<string, number>>({});
  const [constructorWins, setConstructorWins] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [showAllConstructors, setShowAllConstructors] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [champ, meetings] = await Promise.all([
          getChampionship(2026),
          getMeetings(2026),
        ]);
        const d = champ.driver_standings;
        const c = champ.constructor_standings;
        setAllDrivers(d);
        setAllConstructors(c);

        // Compute wins from race results
        const dw: Record<string, number> = {};
        const cw: Record<string, number> = {};
        champ.races.forEach(race => {
          const results = race.results || [];
          if (results.length > 0) {
            const w = results[0];
            dw[w.acronym] = (dw[w.acronym] || 0) + 1;
            cw[w.team_name] = (cw[w.team_name] || 0) + 1;
          }
        });
        setDriverWins(dw);
        setConstructorWins(cw);

        // Find next race
        const now = new Date();
        const upcoming = meetings
          .filter(m => !m.is_cancelled && new Date(m.date_start) > now)
          .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());
        if (upcoming.length > 0) setNextRace(upcoming[0]);
      } catch (e) {
        console.error('Home load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayedDrivers = showAllDrivers ? allDrivers : allDrivers.slice(0, 5);
  const displayedConstructors = showAllConstructors ? allConstructors : allConstructors.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero / Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-gradient-to-br from-red-600 to-red-800 border-red-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-100 uppercase tracking-wider">Next Race</p>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {nextRace?.name || 'Loading...'}
                </h2>
                {nextRace && (
                  <div className="flex items-center gap-2 mt-2 text-red-100">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{new Date(nextRace.date_start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold text-white">
                  R{nextRace ? 6 : '?'}
                </div>
                <p className="text-sm text-red-100">
                  {nextRace?.circuit_name || ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Gauge className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Season Progress</span>
            </div>
            <div className="text-3xl font-bold">2026</div>
            <div className="mt-2 w-full bg-secondary rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: '22.7%' }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">22.7% of season completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Driver Standings</span>
            </div>
            <p className="text-2xl font-bold">{allDrivers[0]?.full_name || '-'}</p>
            <p className="text-sm text-muted-foreground">
              {allDrivers[0]?.team_name} · {allDrivers[0]?.points} pts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Constructor Standings</span>
            </div>
            <p className="text-2xl font-bold">{allConstructors[0]?.team_name || '-'}</p>
            <p className="text-sm text-muted-foreground">
              {allConstructors[0]?.points} pts · {constructorWins[allConstructors[0]?.team_name || ''] || 0} wins
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Races Completed</span>
            </div>
            <p className="text-2xl font-bold">{allDrivers.length > 0 ? 5 : '-'}</p>
            <p className="text-sm text-muted-foreground">of 24 rounds in 2026</p>
          </CardContent>
        </Card>
      </div>

      {/* Standings Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              2026 Driver Standings
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {allDrivers.length} drivers
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayedDrivers.map((d, i) => (
                <div key={d.driver_number} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className={`w-6 text-center font-bold text-sm ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    {d.position === 1 ? '🥇' : d.position === 2 ? '🥈' : d.position === 3 ? '🥉' : `#${d.position}`}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor(d.team_colour) }} />
                    <span className="font-medium text-sm truncate">{d.name_acronym}</span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">{d.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">{flagEmoji(d.country_code)}</span>
                    <span className="font-bold text-sm">{d.points}</span>
                    {driverWins[d.name_acronym] > 0 && <Badge variant="secondary" className="text-xs">{driverWins[d.name_acronym]}W</Badge>}
                  </div>
                </div>
              ))}
            </div>
            {allDrivers.length > 5 && (
              <button
                onClick={() => setShowAllDrivers(!showAllDrivers)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
              >
                {showAllDrivers ? (
                  <><EyeOff className="h-3.5 w-3.5" /> Show Less</>
                ) : (
                  <><Eye className="h-3.5 w-3.5" /> Show All {allDrivers.length} Drivers</>
                )}
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              2026 Constructor Standings
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {allConstructors.length} teams
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {displayedConstructors.map((c, i) => (
                <div key={c.team_name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className={`w-6 text-center font-bold text-sm ${i < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    {c.position === 1 ? '🥇' : c.position === 2 ? '🥈' : c.position === 3 ? '🥉' : `#${c.position}`}
                  </span>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor(c.team_colour) }} />
                    <span className="font-medium text-sm truncate">{c.team_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-sm">{c.points}</span>
                    {constructorWins[c.team_name] > 0 && <Badge variant="secondary" className="text-xs">{constructorWins[c.team_name]}W</Badge>}
                  </div>
                </div>
              ))}
            </div>
            {allConstructors.length > 5 && (
              <button
                onClick={() => setShowAllConstructors(!showAllConstructors)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
              >
                {showAllConstructors ? (
                  <><EyeOff className="h-3.5 w-3.5" /> Show Less</>
                ) : (
                  <><Eye className="h-3.5 w-3.5" /> Show All {allConstructors.length} Teams</>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
