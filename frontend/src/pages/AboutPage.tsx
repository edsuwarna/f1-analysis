import { useEffect, useState } from 'react';
import { getChampionship, type ChampionshipData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, teamColor } from '@/lib/formatters';
import { Info, Database, Code, ExternalLink, Trophy, Users, Flag, Timer } from 'lucide-react';

export default function AboutPage() {
  const [data, setData] = useState<ChampionshipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const champ = await getChampionship(2026);
        setData(champ);
      } catch (e) {
        console.error('AboutPage load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center p-12 text-muted-foreground">Loading season data...</div>
      </div>
    );
  }

  const stats = data
    ? {
        gps: data.races_completed,
        sessions: data.races.length,
        drivers: data.driver_standings.length,
        teams: data.constructor_standings.length,
      }
    : null;

  const topDrivers = data?.driver_standings.slice(0, 3) ?? [];
  const topConstructors = data?.constructor_standings.slice(0, 3) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🏎️ F1 Analysis 2026</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Formula 1 sector times, tyre strategy, driver comparison &amp; race analysis platform
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Flag className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.gps}</p>
            <p className="text-xs text-muted-foreground">Grands Prix</p>
          </Card>
          <Card className="p-4 text-center">
            <Timer className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.sessions}</p>
            <p className="text-xs text-muted-foreground">Race Sessions</p>
          </Card>
          <Card className="p-4 text-center">
            <Users className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.drivers}</p>
            <p className="text-xs text-muted-foreground">Drivers</p>
          </Card>
          <Card className="p-4 text-center">
            <Trophy className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.teams}</p>
            <p className="text-xs text-muted-foreground">Teams</p>
          </Card>
        </div>
      )}

      {/* Top 3 Leaders */}
      {(topDrivers.length > 0 || topConstructors.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topDrivers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  Top 3 Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topDrivers.map((d, i) => (
                  <div key={d.driver_number} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <span className={`w-5 text-center text-xs font-bold ${
                      i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-amber-600'
                    }`}>
                      {['🥇', '🥈', '🥉'][i]}
                    </span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: teamColor(d.team_colour) }} />
                    <span className="flex-1 font-medium text-sm truncate">{d.full_name}</span>
                    <span className="text-xs text-muted-foreground">{flagEmoji(d.country_code)}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{d.points} pts</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {topConstructors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Top 3 Constructors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topConstructors.map((c, i) => (
                  <div key={c.team_name} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: teamColor(c.team_colour) }} />
                    <span className="flex-1 font-medium text-sm truncate">{c.team_name}</span>
                    <Badge variant="secondary" className="text-xs font-mono">{c.points} pts</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            F1 Analysis is a comprehensive Formula 1 data platform that provides detailed sector times,
            tyre strategy insights, driver comparisons, and race analysis. Built for fans, analysts,
            and anyone who wants to go beyond the broadcast to understand the stories the data tells.
            Track your favourite drivers, compare teammate performance, analyse pit stop strategies,
            and explore season-long trends — all in one place.
          </p>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-500" />
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span><strong className="text-foreground">OpenF1 API</strong> — live timing, telemetry, sector times, and session data</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span><strong className="text-foreground">Ergast API</strong> — historical championship standings and race results</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span><strong className="text-foreground">RSS Feeds</strong> — latest Formula 1 news and updates</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-purple-500" />
            Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'FastAPI', 'PostgreSQL', 'React', 'TypeScript',
              'Tailwind CSS', 'shadcn/ui', 'recharts', 'Cloudflare Pages',
            ].map(tech => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-foreground" />
            Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href="https://github.com/edsuwarna/f1-analysis"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>edsuwarna/f1-analysis</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
