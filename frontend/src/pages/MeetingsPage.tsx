import { useEffect, useState } from 'react';
import { getMeetings, getSessions, type Meeting, type Session } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { flagEmoji, formatDate } from '@/lib/formatters';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface MeetingsPageProps {
  onSelectSession: (meetingId: number, sessionId: number) => void;
}

export default function MeetingsPage({ onSelectSession }: MeetingsPageProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [sessions, setSessions] = useState<Record<number, Session[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2026');

  useEffect(() => {
    async function load() {
      try {
        const data = await getMeetings(parseInt(year));
        setMeetings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  async function toggleMeeting(id: number) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!sessions[id]) {
      try {
        const data = await getSessions(id);
        setSessions(prev => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error(e);
      }
    }
  }

  const sessionTypeColor: Record<string, string> = {
    Practice: 'bg-blue-500/10 text-blue-500',
    Qualifying: 'bg-purple-500/10 text-purple-500',
    Race: 'bg-red-500/10 text-red-500',
    Sprint: 'bg-orange-500/10 text-orange-500',
    SprintQualifying: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-red-500" />
          2026 Race Calendar
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

      {loading ? (
        <div className="text-center p-12 text-muted-foreground">Loading calendar...</div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m, idx) => (
            <Card
              key={m.id}
              className={`overflow-hidden cursor-pointer transition-all hover:border-muted-foreground/30 ${
                expanded === m.id ? 'border-primary/50' : ''
              }`}
              onClick={() => toggleMeeting(m.id)}
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center flex-shrink-0 w-12">
                    <div className="text-2xl font-bold text-muted-foreground">{idx + 1}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{flagEmoji(m.country_code)}</span>
                      <h3 className="font-semibold truncate">{m.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {m.circuit_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(m.date_start)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                    expanded === m.id ? 'rotate-90' : ''
                  }`} />
                </div>
              </div>

              {/* Sessions */}
              {expanded === m.id && sessions[m.id] && (
                <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/20">
                  {sessions[m.id].map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onSelectSession(m.id, s.id); }}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`text-xs ${sessionTypeColor[s.session_type] || ''}`}>
                          {s.session_name || s.session_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.date_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
