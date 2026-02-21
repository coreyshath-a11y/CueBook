'use server'

import { createClient } from '@/lib/supabase/server'
import type { CreateSeasonForm, CreatePlayerForm } from '@/lib/types'

interface ActionResult {
  success: boolean
  error?: string
}

async function requireLeagueOwner(leagueId: string): Promise<{ userId: string } | ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('owner_user_id')
    .eq('id', leagueId)
    .single()

  if (!league || league.owner_user_id !== user.id) {
    return { success: false, error: 'You are not authorized to perform this action.' }
  }

  return { userId: user.id }
}

export async function approveResult(matchId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  // Fetch match with season info
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, season:seasons(id, league_id)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return { success: false, error: 'Match not found.' }
  }

  if (match.status !== 'submitted') {
    return { success: false, error: 'Match must be in submitted status to approve.' }
  }

  const season = match.season as unknown as { id: string; league_id: string }

  // Verify user is league owner
  const { data: league } = await supabase
    .from('leagues')
    .select('owner_user_id')
    .eq('id', season.league_id)
    .single()

  if (!league || league.owner_user_id !== user.id) {
    return { success: false, error: 'Only the league owner can approve results.' }
  }

  // Update match status
  const { error: updateMatchError } = await supabase
    .from('matches')
    .update({ status: 'approved' })
    .eq('id', matchId)

  if (updateMatchError) {
    return { success: false, error: 'Failed to update match status.' }
  }

  // Update match_results with approval info
  const { error: updateResultError } = await supabase
    .from('match_results')
    .update({
      approved_by_user_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('match_id', matchId)

  if (updateResultError) {
    return { success: false, error: 'Failed to update result approval info.' }
  }

  // Recompute standings
  const { error: rpcError } = await supabase
    .rpc('recompute_season_standings', { target_season_id: season.id })

  if (rpcError) {
    return { success: false, error: 'Result approved but failed to recompute standings.' }
  }

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      league_id: season.league_id,
      actor_user_id: user.id,
      entity_type: 'match',
      entity_id: matchId,
      action: 'approved_result',
      payload: {},
    })

  return { success: true }
}

export async function lockResult(matchId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  // Fetch match with season info
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*, season:seasons(id, league_id)')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return { success: false, error: 'Match not found.' }
  }

  if (match.status !== 'submitted' && match.status !== 'approved') {
    return { success: false, error: 'Match must be in submitted or approved status to lock.' }
  }

  const season = match.season as unknown as { id: string; league_id: string }

  // Verify user is league owner
  const { data: league } = await supabase
    .from('leagues')
    .select('owner_user_id')
    .eq('id', season.league_id)
    .single()

  if (!league || league.owner_user_id !== user.id) {
    return { success: false, error: 'Only the league owner can lock results.' }
  }

  // Update match status
  const { error: updateMatchError } = await supabase
    .from('matches')
    .update({ status: 'locked' })
    .eq('id', matchId)

  if (updateMatchError) {
    return { success: false, error: 'Failed to update match status.' }
  }

  // Update match_results with lock info
  const updateData: Record<string, string> = {
    locked_by_user_id: user.id,
    locked_at: new Date().toISOString(),
  }

  // Also set approved if not already
  if (match.status === 'submitted') {
    updateData.approved_by_user_id = user.id
    updateData.approved_at = new Date().toISOString()
  }

  const { error: updateResultError } = await supabase
    .from('match_results')
    .update(updateData)
    .eq('match_id', matchId)

  if (updateResultError) {
    return { success: false, error: 'Failed to update result lock info.' }
  }

  // Recompute standings
  const { error: rpcError } = await supabase
    .rpc('recompute_season_standings', { target_season_id: season.id })

  if (rpcError) {
    return { success: false, error: 'Result locked but failed to recompute standings.' }
  }

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      league_id: season.league_id,
      actor_user_id: user.id,
      entity_type: 'match',
      entity_id: matchId,
      action: 'locked_result',
      payload: {},
    })

  return { success: true }
}

export async function createSeason(
  leagueId: string,
  data: CreateSeasonForm
): Promise<ActionResult> {
  const authResult = await requireLeagueOwner(leagueId)
  if ('success' in authResult) return authResult

  const supabase = await createClient()

  // Create the season
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .insert({
      league_id: leagueId,
      name: data.name,
      start_date: data.start_date,
      end_date: data.end_date,
      race_to_default: data.race_to_default,
      innings_required: data.innings_required,
      high_run_enabled: data.high_run_enabled,
      submission_rule: data.submission_rule,
    })
    .select('id')
    .single()

  if (seasonError || !season) {
    return { success: false, error: 'Failed to create season: ' + (seasonError?.message ?? 'Unknown error') }
  }

  // Create 12 weeks
  const startDate = new Date(data.start_date)
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    return {
      season_id: season.id,
      week_number: i + 1,
      start_date: weekStart.toISOString().split('T')[0],
      end_date: weekEnd.toISOString().split('T')[0],
    }
  })

  const { error: weeksError } = await supabase
    .from('weeks')
    .insert(weeks)

  if (weeksError) {
    return { success: false, error: 'Season created but failed to create weeks.' }
  }

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      league_id: leagueId,
      actor_user_id: authResult.userId,
      entity_type: 'season',
      entity_id: season.id,
      action: 'created_season',
      payload: { name: data.name },
    })

  return { success: true }
}

export async function addPlayer(
  leagueId: string,
  data: CreatePlayerForm
): Promise<ActionResult> {
  const authResult = await requireLeagueOwner(leagueId)
  if ('success' in authResult) return authResult

  const supabase = await createClient()

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      league_id: leagueId,
      display_name: data.display_name,
      email: data.email,
      phone: data.phone,
    })
    .select('id')
    .single()

  if (playerError || !player) {
    return { success: false, error: 'Failed to add player: ' + (playerError?.message ?? 'Unknown error') }
  }

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      league_id: leagueId,
      actor_user_id: authResult.userId,
      entity_type: 'player',
      entity_id: player.id,
      action: 'added_player',
      payload: { display_name: data.display_name },
    })

  return { success: true }
}

export async function updateHandicap(
  seasonPlayerId: string,
  handicapPoints: number
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  // Get the season_player to find the league
  const { data: seasonPlayer } = await supabase
    .from('season_players')
    .select('*, season:seasons(league_id)')
    .eq('id', seasonPlayerId)
    .single()

  if (!seasonPlayer) {
    return { success: false, error: 'Season player not found.' }
  }

  const season = seasonPlayer.season as unknown as { league_id: string }

  // Verify ownership
  const { data: league } = await supabase
    .from('leagues')
    .select('owner_user_id')
    .eq('id', season.league_id)
    .single()

  if (!league || league.owner_user_id !== user.id) {
    return { success: false, error: 'Only the league owner can update handicaps.' }
  }

  const { error: updateError } = await supabase
    .from('season_players')
    .update({ handicap_points: handicapPoints })
    .eq('id', seasonPlayerId)

  if (updateError) {
    return { success: false, error: 'Failed to update handicap.' }
  }

  // Audit log
  await supabase
    .from('audit_log')
    .insert({
      league_id: season.league_id,
      actor_user_id: user.id,
      entity_type: 'season_player',
      entity_id: seasonPlayerId,
      action: 'updated_handicap',
      payload: { handicap_points: handicapPoints },
    })

  return { success: true }
}
