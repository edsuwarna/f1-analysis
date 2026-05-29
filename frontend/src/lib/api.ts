const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface Meeting {
  id: number;
  meeting_key: number;
  year: number;
  name: string;
  official_name: string;
  location: string;
  country_code: string;
  country_name: string;
  circuit_name: string;
  date_start: string;
  date_end: string;
  circuit_type?: string;
  is_cancelled: boolean;
}

export interface Circuit {
  id: number;
  circuit_key: number;
  circuit_short_name: string;
  country_code: string;
}

export interface Session {
  id: number;
  session_key: number;
  meeting_id: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
}

export interface SessionDriver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  headshot_url?: string;
}

export interface Lap {
  id: number;
  session_id: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number;
  duration_sector_1: number;
  duration_sector_2: number;
  duration_sector_3: number;
  compound: string;
  tyre_age: number;
  is_pit_out_lap: boolean;
  is_pit_in_lap: boolean;
}

export interface PitStop {
  id: number;
  session_id: number;
  driver_number: number;
  lap_number: number;
  pit_duration: number;
  compound: string;
}

export interface Weather {
  air_temp: number;
  track_temp: number;
  humidity: number;
  rainfall: boolean;
}

export interface RaceControl {
  message: string;
  flag: string;
  lap_number: number;
  time: string;
}

export interface TelemetrySample {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  rpm: number;
  gear: number;
  drs: number;
}

export interface Stint {
  driver_number: number;
  compound: string;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number;
}

export interface StandingRow {
  position: number;
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  points: number;
  wins: number;
  country_code: string;
}

export interface ConstructorStandingRow {
  position: number;
  team_name: string;
  team_colour: string;
  points: number;
  wins?: number;
}

export interface ChampionshipData {
  year: number;
  races_completed: number;
  driver_standings: StandingRow[];
  constructor_standings: ConstructorStandingRow[];
  races: RaceResult[];
}

export interface RaceResult {
  meeting_id: number;
  race_name: string;
  country_code: string;
  results: RaceResultDriver[];
}

export interface RaceResultDriver {
  driver_number: number;
  position: number;
  points: number;
  acronym: string;
  team_name: string;
  team_colour: string;
  session_name?: string;
}

export interface SeasonProgressionRound {
  round: number;
  race_name: string;
  meeting_id: number;
  standings: SeasonStandingRow[];
}

export interface SeasonStandingRow {
  driver_number: number;
  acronym: string;
  full_name?: string;
  team_name: string;
  team_colour: string;
  race_points: number;
  sprint_points: number;
  round_points: number;
  cumulative_points: number;
}

export interface DriverFormRow {
  meeting_id: number;
  race_name: string;
  date_start: string;
  position?: number;
  points?: number;
}

export interface SectorTrend {
  race_name: string;
  meeting_id: number;
  driver_number: number;
  full_name: string;
  acronym: string;
  team: string;
  best_sector_1: number;
  best_sector_2: number;
  best_sector_3: number;
  best_lap: number;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Meetings ──
export const getMeetings = (year?: number) =>
  request<Meeting[]>(`/meetings${year ? `?year=${year}` : ''}`);

export const getMeeting = (id: number) =>
  request<Meeting>(`/meetings/${id}`);

// ── Sessions ──
export const getSessions = (meetingId: number) =>
  request<Session[]>(`/meetings/${meetingId}/sessions`);

export const getSessionDrivers = (sessionId: number) =>
  request<SessionDriver[]>(`/sessions/${sessionId}/drivers`);

export const getLaps = (sessionId: number, driver?: number) =>
  request<Lap[]>(`/sessions/${sessionId}/laps${driver ? `?driver=${driver}` : ''}`);

export const getPitStops = (sessionId: number) =>
  request<PitStop[]>(`/sessions/${sessionId}/pit-stops`);

export const getWeather = (sessionId: number) =>
  request<Weather[]>(`/sessions/${sessionId}/weather`);

export const getRaceControl = (sessionId: number) =>
  request<RaceControl[]>(`/sessions/${sessionId}/race-control`);

export const getStints = (sessionId: number) =>
  request<Stint[]>(`/sessions/${sessionId}/stints`);

// ── Telemetry ──
export const getTelemetry = (sessionId: number, driver: number) =>
  request<TelemetrySample[]>(`/sessions/${sessionId}/telemetry?driver=${driver}`);

// ── Standings ──
export const getChampionship = (year?: number) =>
  request<ChampionshipData>(`/analytics/championship${year ? `?year=${year}` : ''}`);

export const getDriverStandings = async (year?: number): Promise<StandingRow[]> => {
  const data = await getChampionship(year);
  return data.driver_standings;
};

export const getConstructorStandings = async (year?: number): Promise<ConstructorStandingRow[]> => {
  const data = await getChampionship(year);
  return data.constructor_standings;
};

// ── Analytics ──
export const getSectorTrends = (year?: number, sessionType?: string) =>
  request<SectorTrend[]>(`/analytics/sectors${year ? `?year=${year}&session_type=${sessionType || 'Race'}` : ''}`);

export const getDriverProgress = (driverNumber: number, year?: number) =>
  request<any[]>(`/analytics/driver-progress/${driverNumber}${year ? `?year=${year}` : ''}`);

export const getSeasonProgression = (year?: number) =>
  request<{ year: number; rounds: SeasonProgressionRound[] }>(`/analytics/season-progression${year ? `?year=${year}` : ''}`);

export const getDriverForm = (year?: number) =>
  request<{ year: number; rounds: DriverFormRow[] }>(`/analytics/driver-form${year ? `?year=${year}` : ''}`);

export const getPitStopChampionship = (year?: number) =>
  request<any[]>(`/analytics/pit-stop-championship${year ? `?year=${year}` : ''}`);

// ── News ──
export const getNews = () => request<any[]>('/news');

// ── Circuit ──
export const getCircuitInfo = (circuitKey: number) =>
  request<Circuit>(`/circuits/${circuitKey}`);
