import { useEffect, useState } from 'react';
import { getMeetings, getChampionship, type Meeting, type ConstructorStandingRow, type StandingRow, type RaceResultDriver } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Calendar, Trophy, Users, Gauge, Eye, EyeOff, Medal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PodiumDriver extends RaceResultDriver {
  full_name: string;
  headshot_url?: string;
}

export default function HomePage() {
  const [allDrivers, setAllDrivers] = useState<StandingRow[]>([]);
  const [allConstructors, setAllConstructors] = useState<ConstructorStandingRow[]>([]);
  const [nextRace, setNextRace] = useState<Meeting | null>(null);
  const [podium, setPodium] = useState<PodiumDriver[]>([]);
  const [lastRaceName, setLastRaceName] = useState('');
  const [racesCompleted, setRacesCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAllDrivers, setShowAllDrivers] = useState(false);
  const [showAllConstructors, setShowAllConstructors] = useState(false);
  const navigate = useNavigate();

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
        setRacesCompleted(champ.races_completed || 0);

        // Last race podium
        if (champ.races.length > 0) {
          const lastRace = champ.races[champ.races.length - 1];
          setLastRaceName(lastRace.race_name);
          const top3 = (lastRace.results || []).slice(0, 3).map(r => {
            const driver = d.find(sd => sd.name_acronym === r.acronym);
            return {
              ...r,
              full_name: driver?.full_name || r.acronym,
              headshot_url: driver?.headshot_url,
            };
          });
          setPodium(top3);
        }

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

  // Championship battle stats
  const leader = allDrivers[0];
  const second = allDrivers[1];
  const champGap = leader && second ? leader.points - second.points : 0;
  const champTotal = leader && second ? leader.points + second.points : 1;
  const leaderPct = (leader?.points || 0) / champTotal * 100;

  // Races completed
  const racesDone = allDrivers.length > 0 ? allDrivers.reduce((max, d) => Math.max(max, d.wins || 0), 0) > 0 ? '?' : '?' : '?';

  return (
    <div className="space-y-6">

      {/* ── Row 1: Next Race + Championship Battle ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Next Race - Hero */}
        <Card className="md:col-span-2 bg-gradient-to-br from-red-600 to-red-800 border-red-500 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-100/80 uppercase tracking-widest">Next Race</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  {nextRace?.name || 'Loading...'}
                </h2>
                {nextRace && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-red-100/90">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{new Date(nextRace.date_start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                    <span className="text-sm text-red-100/60">{nextRace.circuit_name}</span>
                  </div>
                )}
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="text-4xl md:text-5xl font-extrabold text-white leading-none">
                  R{racesCompleted + 1 || '?'}
                </div>
                <p className="text-xs text-red-100/70 font-medium uppercase tracking-wider">
                  {nextRace?.location || ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Championship Battle */}
        <Card className="border-t-4" style={{ borderTopColor: leader ? teamColor(leader.team_colour) : '#666' }}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold uppercase tracking-wider">Championship Battle</span>
            </div>

            {leader && second ? (
              <>
                {/* Leader */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden ring-2" style={{ borderColor: teamColor(leader.team_colour) }}>
                      {leader.headshot_url ? (
                        <img src={leader.headshot_url} alt={leader.name_acronym}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-muted">
                          {leader.name_acronym}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{leader.name_acronym}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{leader.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-lg font-bold">{leader.points}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">pts</div>
                  </div>
                </div>

                {/* Gap visual */}
                <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-1.5 text-[10px] font-bold text-white"
                    style={{
                      width: `${Math.min(leaderPct, 85)}%`,
                      background: `linear-gradient(90deg, ${teamColor(leader.team_colour)}, ${teamColor(second.team_colour)})`,
                    }}
                  >
                    {champGap > 0 && `+${champGap}`}
                  </div>
                </div>

                {/* P2 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden ring-2" style={{ borderColor: teamColor(second.team_colour) }}>
                      {second.headshot_url ? (
                        <img src={second.headshot_url} alt={second.name_acronym}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-muted">
                          {second.name_acronym}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{second.name_acronym}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{second.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-lg font-bold text-muted-foreground">{second.points}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">pts</div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading standings...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Last Race Podium ── */}
      {podium.length === 3 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-b from-background to-muted/30">
          <CardHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-4 w-4 text-yellow-500" />
                <span>Last Race: <span className="font-bold">{lastRaceName}</span></span>
              </CardTitle>
              <span className="text-xs text-muted-foreground">Podium</span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {/* P2 - Left */}
              <PodiumCard
                driver={podium[1]}
                position={2}
                accentColor={teamColor(podium[1].team_colour)}
              />
              {/* P1 - Center (emphasized) */}
              <PodiumCard
                driver={podium[0]}
                position={1}
                accentColor={teamColor(podium[0].team_colour)}
                isWinner
              />
              {/* P3 - Right */}
              <PodiumCard
                driver={podium[2]}
                position={3}
                accentColor={teamColor(podium[2].team_colour)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Row 3: Quick Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <QuickStatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Races Completed"
          value={`${racesCompleted || '0'}`}
          sub={`Round ${racesCompleted || '?'} of 24`}
        />
        <QuickStatCard
          icon={<Users className="h-4 w-4" />}
          label="Drivers"
          value={`${allDrivers.length}`}
          sub={`${allConstructors.length} teams`}
        />
        <QuickStatCard
          icon={<Medal className="h-4 w-4" />}
          label="Championship Leader"
          value={leader?.name_acronym || '-'}
          sub={`${leader?.points || 0} pts · ${leader?.full_name || ''}`}
          accent={leader ? teamColor(leader.team_colour) : undefined}
        />
        <QuickStatCard
          icon={<Gauge className="h-4 w-4" />}
          label="P1 vs P2 Gap"
          value={`${champGap}`}
          sub={`${leader?.name_acronym || ''} leads ${second?.name_acronym || ''}`}
          accent={champGap > 50 ? '#22c55e' : champGap > 20 ? '#eab308' : '#ef4444'}
        />
      </div>

      {/* ── Row 4: Standings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Driver Standings */}
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
            <div className="space-y-1">
              {displayedDrivers.map((d, i) => {
                return (
                  <div
                    key={d.driver_number}
                    className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/drivers?driver=${d.driver_number}`)}
                  >
                    {/* Position */}
                    <span className={`w-7 text-center font-bold text-sm flex-shrink-0 ${
                      d.position === 1 ? 'text-yellow-500' :
                      d.position === 2 ? 'text-gray-400' :
                      d.position === 3 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>
                      {d.position}
                    </span>

                    {/* Headshot */}
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-muted ring-2 ring-offset-1 ring-offset-background"
                      style={{ boxShadow: `0 0 0 2px ${teamColor(d.team_colour)}, 0 0 0 4px var(--tw-ring-offset-color, hsl(var(--background)))` }}>
                      {d.headshot_url ? (
                        <img
                          src={d.headshot_url}
                          alt={d.name_acronym}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {d.name_acronym}
                        </div>
                      )}
                    </div>

                    {/* Name & Team */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor(d.team_colour) }} />
                        <span className="font-semibold text-sm truncate">{d.name_acronym}</span>
                        <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">{d.full_name}</span>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">{flagEmoji(d.country_code)}</span>
                      <span className="font-bold text-sm tabular-nums">{d.points}</span>
                      {d.wins > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                          {d.wins}W
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {allDrivers.length > 5 && (
              <button
                onClick={() => setShowAllDrivers(!showAllDrivers)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
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

        {/* Constructor Standings */}
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
            <div className="space-y-1">
              {displayedConstructors.map((c, i) => {
                const maxPts = allConstructors[0]?.points || 1;
                const barPct = Math.max((c.points / maxPts) * 100, 5);
                return (
                  <div key={c.team_name} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className={`w-7 text-center font-bold text-sm flex-shrink-0 ${
                      c.position === 1 ? 'text-yellow-500' :
                      c.position === 2 ? 'text-gray-400' :
                      c.position === 3 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>
                      {c.position}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: teamColor(c.team_colour) }} />
                        <span className="font-medium text-sm truncate">{c.team_name}</span>
                        <span className="font-bold text-sm ml-auto tabular-nums">{c.points}</span>
                      </div>
                      {/* Points bar */}
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barPct}%`,
                            background: teamColor(c.team_colour),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {allConstructors.length > 5 && (
              <button
                onClick={() => setShowAllConstructors(!showAllConstructors)}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border border-border"
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

// ── Sub-components ──

function PodiumCard({ driver, position, accentColor, isWinner }: {
  driver: PodiumDriver;
  position: number;
  accentColor: string;
  isWinner?: boolean;
}) {
  const medals = ['🥇', '🥈', '🥉'];
  const posLabels = ['Winner', '2nd', '3rd'];
  return (
    <div
      className={`relative flex flex-col items-center text-center p-3 rounded-xl transition-all ${
        isWinner
          ? 'bg-gradient-to-b from-yellow-500/10 to-transparent ring-1 ring-yellow-500/30 scale-105'
          : 'bg-muted/30 ring-1 ring-border/50'
      }`}
    >
      {/* Headshot */}
      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden mb-2 ring-2 flex-shrink-0 ${
        isWinner ? 'ring-yellow-500 shadow-lg shadow-yellow-500/20' : 'ring-border'
      }`}>
        {driver.headshot_url ? (
          <img
            src={driver.headshot_url}
            alt={driver.acronym}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-muted">
            {driver.acronym}
          </div>
        )}
      </div>

      {/* Medal & Name */}
      <div className="text-2xl mb-0.5">{medals[position - 1]}</div>
      <p className="text-sm font-bold leading-tight">{driver.acronym}</p>
      <p className="text-[10px] text-muted-foreground truncate w-full max-w-[100px]">{driver.full_name}</p>
      <p className="text-[10px] font-medium mt-1 px-2 py-0.5 rounded-full" style={{ background: `${accentColor}20`, color: accentColor }}>
        {driver.team_name}
      </p>

      {/* Points badge */}
      <div className={`mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${
        isWinner ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'
      }`}>
        +{driver.points} pts
      </div>

      {isWinner && (
        <div className="absolute -top-1.5 -right-1.5">
          <span className="text-xs">👑</span>
        </div>
      )}
    </div>
  );
}

function QuickStatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
          <span style={accent ? { color: accent } : undefined}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-xl font-bold" style={accent ? { color: accent } : undefined}>{value}</p>
        <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}
