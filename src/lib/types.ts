// ==============================================
// CueBook Database Types
// ==============================================

export type MatchStatus = 'scheduled' | 'submitted' | 'approved' | 'locked'
export type HandicapMethod = 'adjusted_race_to'
export type SubmissionRule = 'player_submits' | 'scorekeeper_submits'

export interface League {
  id: string
  name: string
  owner_user_id: string
  created_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  start_date: string
  end_date: string
  race_to_default: number
  innings_required: boolean
  high_run_enabled: boolean
  handicap_method: HandicapMethod
  submission_rule: SubmissionRule
  created_at: string
}

export interface Venue {
  id: string
  league_id: string
  name: string
  address: string | null
  notes: string | null
  created_at: string
}

export interface Player {
  id: string
  league_id: string
  user_id: string | null
  display_name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface SeasonPlayer {
  id: string
  season_id: string
  player_id: string
  handicap_points: number
  rating: number | null
  is_active: boolean
  created_at: string
}

export interface Week {
  id: string
  season_id: string
  week_number: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Match {
  id: string
  season_id: string
  week_id: string
  player_a_id: string
  player_b_id: string
  venue_id: string | null
  scheduled_at: string | null
  race_to_points: number
  status: MatchStatus
  created_at: string
}

export interface MatchResult {
  id: string
  match_id: string
  points_a: number
  points_b: number
  innings: number | null
  high_run_a: number | null
  high_run_b: number | null
  submitted_by_user_id: string
  submitted_at: string
  approved_by_user_id: string | null
  approved_at: string | null
  locked_by_user_id: string | null
  locked_at: string | null
  notes: string | null
  created_at: string
}

export interface SeasonStanding {
  id: string
  season_id: string
  player_id: string
  matches_played: number
  wins: number
  losses: number
  points_for: number
  points_against: number
  point_differential: number
  total_innings: number
  ppi: number
  high_run: number
  updated_at: string
}

export interface AuditLogEntry {
  id: string
  league_id: string
  actor_user_id: string
  entity_type: string
  entity_id: string
  action: string
  payload: Record<string, unknown>
  created_at: string
}

// ==============================================
// Extended types (with joins)
// ==============================================

export interface MatchWithPlayers extends Match {
  player_a: Player
  player_b: Player
  venue: Venue | null
  week: Week
  match_results: MatchResult | null
}

export interface StandingWithPlayer extends SeasonStanding {
  player: Player
}

// ==============================================
// Form types
// ==============================================

export interface SubmitResultForm {
  match_id: string
  points_a: number
  points_b: number
  innings: number | null
  high_run_a: number | null
  high_run_b: number | null
  notes: string | null
}

export interface CreateSeasonForm {
  name: string
  start_date: string
  end_date: string
  race_to_default: number
  innings_required: boolean
  high_run_enabled: boolean
  submission_rule: SubmissionRule
}

export interface CreatePlayerForm {
  display_name: string
  email: string | null
  phone: string | null
}
