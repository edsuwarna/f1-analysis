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

export const getTelemetryLap = (sessionId: number, driver: number, lap?: number) =>
  request<TelemetrySample[]>(`/sessions/${sessionId}/telemetry/${driver}${lap ? `?lap=${lap}` : ''}`);

// ── Session Data ──
export interface SessionSectorRow {
  driver_number: number;
  full_name: string;
  acronym: string;
  team: string;
  team_colour: string;
  best_sector_1: number;
  best_sector_2: number;
  best_sector_3: number;
  best_lap: number;
  total_laps: number;
}

export const getSessionSectors = (sessionId: number) =>
  request<SessionSectorRow[]>(`/sessions/${sessionId}/sectors`);

export interface PositionChange {
  driver_number: number;
  acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  positions_gained: number;
  start_position: number;
  end_position: number;
}

export const getPositions = (sessionId: number) =>
  request<PositionChange[]>(`/sessions/${sessionId}/positions`);

// ── Analytics ──
export const getChampionship = async (year?: number): Promise<ChampionshipData> => {
  const data = await request<ChampionshipData>(`/analytics/championship${year ? `?year=${year}` : ''}`);
  // API returns 'acronym' but code expects 'name_acronym'
  data.driver_standings = data.driver_standings.map(d => ({
    ...d,
    name_acronym: (d as any).acronym || d.name_acronym || d.full_name?.substring(0, 3)?.toUpperCase() || '',
  }));
  return data;
};

export const getDriverStandings = async (year?: number): Promise<StandingRow[]> => {
  const data = await getChampionship(year);
  return data.driver_standings;
};

export const getConstructorStandings = async (year?: number): Promise<ConstructorStandingRow[]> => {
  const data = await getChampionship(year);
  return data.constructor_standings;
};

// ── Analytics ──
export interface PitStrategyData {
  session_id: number;
  total_stops: number;
  drivers: Array<{
    driver_number: number;
    acronym: string;
    full_name: string;
    team_name: string;
    team_colour: string;
    total_stops: number;
    pit_analysis: Array<{
      lap_number: number;
      pit_duration: number;
      in_lap_time: number;
      out_lap_time: number;
      prev_lap_time: number;
      avg_before: number;
      avg_after: number;
      position_change: number;
      net_gain?: number;
    }>;
    avg_pit_duration: number;
    total_pit_time: number;
    strategy_summary: string;
  }>;
  undercut_opportunities: Array<{
    defending_driver: string;
    attacking_driver: string;
    pit_lap: number;
    undercut_delta: number;
    position_changed: boolean;
  }>;
}

export interface OvertakeModeData {
  session_id: number;
  overtake_mode: boolean;
  note: string;
  total_drivers_analyzed: number;
  drivers: Array<{
    driver_number: number;
    acronym: string;
    full_name: string;
    team_name: string;
    team_colour: string;
    total_telemetry_points: number;
    om_activations: number;
    om_percentage: number;
    avg_speed_om: number;
    avg_speed_non_om: number;
    speed_gain: number;
    peak_speed_om: number;
    peak_speed_non_om: number;
  }>;
}

export interface QualifyingSummaryData {
  meeting_id: number;
  session: { session_id: number; session_name: string };
  segments: string[];
  drivers: Array<{
    driver_number: number;
    acronym: string;
    full_name: string;
    team_name: string;
    team_colour: string;
    best_laps: Record<string, number>;
    segments_completed: number;
    total_improvement: number;
  }>;
}

export interface LapDistributionData {
  session_id: number;
  session_name: string;
  session_type: string;
  total_drivers: number;
  total_laps: number;
  drivers: Array<{
    driver_number: number;
    acronym: string;
    full_name: string;
    team_name: string;
    team_colour: string;
    total_laps: number;
    avg_lap_time: number;
    median_lap_time: number;
    std_dev: number;
    fastest_lap: number;
    slowest_lap: number;
    range: number;
    consistency: number;
    lap_times: number[];
  }>;
}

export interface DriverProgressRow {
  race_name: string;
  date: string;
  session_type: string;
  best_lap: number;
  best_sector_1: number;
  best_sector_2: number;
  best_sector_3: number;
  valid_laps: number;
}

export const getSectorTrends = (year?: number, sessionType?: string) =>
  request<SectorTrend[]>(`/analytics/sectors${year ? `?year=${year}&session_type=${sessionType || 'Race'}` : ''}`);

export const getDriverProgress = (driverNumber: number, year?: number) =>
  request<DriverProgressRow[]>(`/analytics/driver-progress/${driverNumber}${year ? `?year=${year}` : ''}`);

export const getSeasonProgression = (year?: number) =>
  request<{ year: number; rounds: SeasonProgressionRound[] }>(`/analytics/season-progression${year ? `?year=${year}` : ''}`);

export const getDriverForm = (year?: number) =>
  request<{ year: number; rounds: DriverFormRow[] }>(`/analytics/driver-form${year ? `?year=${year}` : ''}`);

export const getPitStopChampionship = (year?: number) =>
  request<{ year: number; teams: Array<any>; total_teams: number; total_stops: number; overall_fastest_stop: any }>(`/analytics/pit-stop-championship${year ? `?year=${year}` : ''}`);

export const getPitStrategy = (sessionId: number) =>
  request<PitStrategyData>(`/analytics/sessions/${sessionId}/pit-strategy`);

export const getOvertakeMode = (sessionId: number) =>
  request<OvertakeModeData>(`/analytics/sessions/${sessionId}/overtake-mode`);

export const getQualifyingSummary = (meetingId: number) =>
  request<QualifyingSummaryData>(`/analytics/qualifying-summary?meeting_id=${meetingId}`);

export const getLapDistribution = (sessionId: number) =>
  request<LapDistributionData>(`/analytics/lap-distribution?session_id=${sessionId}`);

// ── News ──
export const getNews = () => request<any[]>('/news');

// ── Circuit ──
export const getCircuitInfo = (circuitKey: number) =>
  request<Circuit>(`/circuits/${circuitKey}`);
