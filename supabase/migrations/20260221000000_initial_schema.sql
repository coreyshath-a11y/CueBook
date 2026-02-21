-- CueBook: Straight Pool League Management System
-- Complete MVP Schema with RLS Policies
-- ==============================================

-- Enable required extensions
create extension if not exists "uuid-ossp" schema extensions;

-- ==============================================
-- ENUMS
-- ==============================================
create type match_status as enum ('scheduled', 'submitted', 'approved', 'locked');
create type handicap_method as enum ('adjusted_race_to');
create type submission_rule as enum ('player_submits', 'scorekeeper_submits');

-- ==============================================
-- TABLES
-- ==============================================

-- Leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Seasons (called "Sessions" — every 12 weeks)
create table seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  race_to_default int not null default 100,
  innings_required boolean not null default true,
  high_run_enabled boolean not null default true,
  handicap_method handicap_method not null default 'adjusted_race_to',
  submission_rule submission_rule not null default 'player_submits',
  created_at timestamptz not null default now(),
  constraint valid_season_dates check (end_date > start_date)
);

-- Venues (optional but useful)
create table venues (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  constraint unique_email_per_league unique (league_id, email)
);

-- Season Players (per-season settings: handicaps, active status)
create table season_players (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  handicap_points int not null default 0,
  rating numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint unique_player_per_season unique (season_id, player_id)
);

-- Weeks
create table weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_number int not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint unique_week_per_season unique (season_id, week_number)
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  week_id uuid not null references weeks(id) on delete cascade,
  player_a_id uuid not null references players(id),
  player_b_id uuid not null references players(id),
  venue_id uuid references venues(id),
  scheduled_at timestamptz,
  race_to_points int not null,
  status match_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint different_players check (player_a_id != player_b_id)
);

-- Match Results (1 row per match, mutable until locked)
create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  points_a int not null check (points_a >= 0),
  points_b int not null check (points_b >= 0),
  innings int check (innings > 0),
  high_run_a int check (high_run_a >= 0),
  high_run_b int check (high_run_b >= 0),
  submitted_by_user_id uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  approved_by_user_id uuid references auth.users(id),
  approved_at timestamptz,
  locked_by_user_id uuid references auth.users(id),
  locked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  -- high run can't exceed points scored
  constraint high_run_a_valid check (high_run_a is null or high_run_a <= points_a),
  constraint high_run_b_valid check (high_run_b is null or high_run_b <= points_b)
);

-- Season Standings (cached, recomputed on approval/lock)
create table season_standings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  matches_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  points_for int not null default 0,
  points_against int not null default 0,
  point_differential int not null default 0,
  total_innings int not null default 0,
  ppi numeric(6,3) not null default 0,
  high_run int not null default 0,
  updated_at timestamptz not null default now(),
  constraint unique_standing_per_season unique (season_id, player_id)
);

-- Audit Log
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  entity_type text not null, -- 'match', 'player', 'season', etc.
  entity_id uuid not null,
  action text not null, -- 'submitted_result', 'approved_result', 'unlocked_result', etc.
  payload jsonb default '{}',
  created_at timestamptz not null default now()
);

-- ==============================================
-- INDEXES (for performance)
-- ==============================================
create index idx_seasons_league on seasons(league_id);
create index idx_players_league on players(league_id);
create index idx_players_user on players(user_id);
create index idx_season_players_season on season_players(season_id);
create index idx_season_players_player on season_players(player_id);
create index idx_weeks_season on weeks(season_id);
create index idx_matches_season on matches(season_id);
create index idx_matches_week on matches(week_id);
create index idx_matches_player_a on matches(player_a_id);
create index idx_matches_player_b on matches(player_b_id);
create index idx_matches_status on matches(status);
create index idx_match_results_match on match_results(match_id);
create index idx_standings_season on season_standings(season_id);
create index idx_standings_player on season_standings(player_id);
create index idx_audit_league on audit_log(league_id);
create index idx_audit_entity on audit_log(entity_type, entity_id);
create index idx_audit_created on audit_log(created_at);

-- ==============================================
-- RLS POLICIES
-- ==============================================

-- Enable RLS on all tables
alter table leagues enable row level security;
alter table seasons enable row level security;
alter table venues enable row level security;
alter table players enable row level security;
alter table season_players enable row level security;
alter table weeks enable row level security;
alter table matches enable row level security;
alter table match_results enable row level security;
alter table season_standings enable row level security;
alter table audit_log enable row level security;

-- Helper function: check if user is league owner
create or replace function is_league_owner(league_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from leagues
    where id = league_uuid
    and owner_user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper function: check if user is a player in a league
create or replace function is_league_member(league_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from players
    where league_id = league_uuid
    and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- Helper function: check if user is participant in a match
create or replace function is_match_participant(match_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from matches m
    join players pa on m.player_a_id = pa.id
    join players pb on m.player_b_id = pb.id
    where m.id = match_uuid
    and (pa.user_id = auth.uid() or pb.user_id = auth.uid())
  );
$$ language sql security definer stable;

-- LEAGUES policies
create policy "Users can view leagues they own or belong to"
  on leagues for select using (
    owner_user_id = auth.uid()
    or is_league_member(id)
  );

create policy "Users can create leagues"
  on leagues for insert with check (
    owner_user_id = auth.uid()
  );

create policy "Only owners can update leagues"
  on leagues for update using (
    owner_user_id = auth.uid()
  );

-- SEASONS policies
create policy "League members can view seasons"
  on seasons for select using (
    is_league_owner(league_id) or is_league_member(league_id)
  );

create policy "Only league owners can create seasons"
  on seasons for insert with check (
    is_league_owner(league_id)
  );

create policy "Only league owners can update seasons"
  on seasons for update using (
    is_league_owner(league_id)
  );

-- VENUES policies
create policy "League members can view venues"
  on venues for select using (
    is_league_owner(league_id) or is_league_member(league_id)
  );

create policy "Only league owners can manage venues"
  on venues for insert with check (is_league_owner(league_id));

create policy "Only league owners can update venues"
  on venues for update using (is_league_owner(league_id));

-- PLAYERS policies
create policy "League members can view players"
  on players for select using (
    is_league_owner(league_id) or is_league_member(league_id)
  );

create policy "Only league owners can add players"
  on players for insert with check (
    is_league_owner(league_id)
  );

create policy "Only league owners can update players"
  on players for update using (
    is_league_owner(league_id)
  );

-- SEASON_PLAYERS policies
create policy "League members can view season players"
  on season_players for select using (
    exists (
      select 1 from seasons s
      where s.id = season_players.season_id
      and (is_league_owner(s.league_id) or is_league_member(s.league_id))
    )
  );

create policy "Only league owners can manage season players"
  on season_players for insert with check (
    exists (
      select 1 from seasons s
      where s.id = season_players.season_id
      and is_league_owner(s.league_id)
    )
  );

create policy "Only league owners can update season players"
  on season_players for update using (
    exists (
      select 1 from seasons s
      where s.id = season_players.season_id
      and is_league_owner(s.league_id)
    )
  );

-- WEEKS policies
create policy "League members can view weeks"
  on weeks for select using (
    exists (
      select 1 from seasons s
      where s.id = weeks.season_id
      and (is_league_owner(s.league_id) or is_league_member(s.league_id))
    )
  );

create policy "Only league owners can manage weeks"
  on weeks for insert with check (
    exists (
      select 1 from seasons s
      where s.id = weeks.season_id
      and is_league_owner(s.league_id)
    )
  );

-- MATCHES policies
create policy "League members can view matches"
  on matches for select using (
    exists (
      select 1 from seasons s
      where s.id = matches.season_id
      and (is_league_owner(s.league_id) or is_league_member(s.league_id))
    )
  );

create policy "Only league owners can create matches"
  on matches for insert with check (
    exists (
      select 1 from seasons s
      where s.id = matches.season_id
      and is_league_owner(s.league_id)
    )
  );

create policy "Only league owners can update match status"
  on matches for update using (
    exists (
      select 1 from seasons s
      where s.id = matches.season_id
      and is_league_owner(s.league_id)
    )
  );

-- MATCH_RESULTS policies
create policy "League members can view results"
  on match_results for select using (
    exists (
      select 1 from matches m
      join seasons s on m.season_id = s.id
      where m.id = match_results.match_id
      and (is_league_owner(s.league_id) or is_league_member(s.league_id))
    )
  );

create policy "Participants or admin can submit results"
  on match_results for insert with check (
    exists (
      select 1 from matches m
      join seasons s on m.season_id = s.id
      where m.id = match_results.match_id
      and m.status = 'scheduled'
      and (
        is_league_owner(s.league_id)
        or is_match_participant(m.id)
      )
    )
  );

create policy "Admin can update results"
  on match_results for update using (
    exists (
      select 1 from matches m
      join seasons s on m.season_id = s.id
      where m.id = match_results.match_id
      and is_league_owner(s.league_id)
    )
  );

-- SEASON_STANDINGS policies
create policy "League members can view standings"
  on season_standings for select using (
    exists (
      select 1 from seasons s
      where s.id = season_standings.season_id
      and (is_league_owner(s.league_id) or is_league_member(s.league_id))
    )
  );

-- Only server-side (service role) should write standings
-- No insert/update policies for regular users

-- AUDIT_LOG policies
create policy "Only league owners can view audit logs"
  on audit_log for select using (
    is_league_owner(league_id)
  );

-- Audit log inserts happen server-side via service role
-- No insert policy for regular users

-- ==============================================
-- FUNCTIONS: Standings Recomputation
-- ==============================================

-- Recompute standings for a specific season
create or replace function recompute_season_standings(target_season_id uuid)
returns void as $$
begin
  -- Delete existing standings for this season
  delete from season_standings where season_id = target_season_id;

  -- Insert fresh computed standings
  insert into season_standings (
    season_id, player_id, matches_played, wins, losses,
    points_for, points_against, point_differential,
    total_innings, ppi, high_run, updated_at
  )
  select
    target_season_id,
    p.id as player_id,
    coalesce(stats.matches_played, 0),
    coalesce(stats.wins, 0),
    coalesce(stats.losses, 0),
    coalesce(stats.points_for, 0),
    coalesce(stats.points_against, 0),
    coalesce(stats.points_for, 0) - coalesce(stats.points_against, 0),
    coalesce(stats.total_innings, 0),
    case
      when coalesce(stats.total_innings, 0) > 0
      then round(coalesce(stats.points_for, 0)::numeric / stats.total_innings, 3)
      else 0
    end,
    coalesce(stats.high_run, 0),
    now()
  from season_players sp
  join players p on sp.player_id = p.id
  left join lateral (
    select
      count(*) as matches_played,
      sum(case
        when (m.player_a_id = p.id and mr.points_a = m.race_to_points)
          or (m.player_b_id = p.id and mr.points_b = m.race_to_points)
        then 1 else 0
      end) as wins,
      sum(case
        when (m.player_a_id = p.id and mr.points_a != m.race_to_points)
          or (m.player_b_id = p.id and mr.points_b != m.race_to_points)
        then 1 else 0
      end) as losses,
      sum(case
        when m.player_a_id = p.id then mr.points_a
        else mr.points_b
      end) as points_for,
      sum(case
        when m.player_a_id = p.id then mr.points_b
        else mr.points_a
      end) as points_against,
      sum(mr.innings) as total_innings,
      max(case
        when m.player_a_id = p.id then coalesce(mr.high_run_a, 0)
        else coalesce(mr.high_run_b, 0)
      end) as high_run
    from matches m
    join match_results mr on mr.match_id = m.id
    where m.season_id = target_season_id
    and m.status in ('approved', 'locked')
    and (m.player_a_id = p.id or m.player_b_id = p.id)
  ) stats on true
  where sp.season_id = target_season_id
  and sp.is_active = true;
end;
$$ language plpgsql security definer;
