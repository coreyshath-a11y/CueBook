'use server'

import { createClient } from '@/lib/supabase/server'
import type { SubmitResultForm } from '@/lib/types'

interface ActionResult {
  success: boolean
  error?: string
}

export async function submitResult(form: SubmitResultForm): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be signed in to submit a result.' }
  }

  // Fetch the match with season info
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select(`
      *,
      season:seasons(id, league_id, innings_required, high_run_enabled)
    `)
    .eq('id', form.match_id)
    .single()

  if (matchError || !match) {
    return { success: false, error: 'Match not found.' }
  }

  if (match.status !== 'scheduled') {
    return { success: false, error: 'This match has already had a result submitted.' }
  }

  const season = match.season as unknown as {
    id: string
    league_id: string
    innings_required: boolean
    high_run_enabled: boolean
  }

  // Check if user is a participant or league owner
  const { data: playerA } = await supabase
    .from('players')
    .select('user_id')
    .eq('id', match.player_a_id)
    .single()

  const { data: playerB } = await supabase
    .from('players')
    .select('user_id')
    .eq('id', match.player_b_id)
    .single()

  const { data: league } = await supabase
    .from('leagues')
    .select('owner_user_id')
    .eq('id', season.league_id)
    .single()

  const isParticipant =
    playerA?.user_id === user.id || playerB?.user_id === user.id
  const isOwner = league?.owner_user_id === user.id

  if (!isParticipant && !isOwner) {
    return { success: false, error: 'You are not authorized to submit results for this match.' }
  }

  // Validate points
  if (form.points_a < 0 || form.points_b < 0) {
    return { success: false, error: 'Points cannot be negative.' }
  }

  // Validate innings if required
  if (season.innings_required && (form.innings === null || form.innings <= 0)) {
    return { success: false, error: 'Innings are required and must be greater than zero.' }
  }

  // Validate high runs
  if (form.high_run_a !== null && form.high_run_a > form.points_a) {
    return { success: false, error: 'Player A high run cannot exceed their points scored.' }
  }

  if (form.high_run_b !== null && form.high_run_b > form.points_b) {
    return { success: false, error: 'Player B high run cannot exceed their points scored.' }
  }

  // Insert match result
  const { error: insertError } = await supabase
    .from('match_results')
    .insert({
      match_id: form.match_id,
      points_a: form.points_a,
      points_b: form.points_b,
      innings: form.innings,
      high_run_a: form.high_run_a,
      high_run_b: form.high_run_b,
      submitted_by_user_id: user.id,
      notes: form.notes,
    })

  if (insertError) {
    return { success: false, error: 'Failed to submit result: ' + insertError.message }
  }

  // Update match status to 'submitted'
  const { error: updateError } = await supabase
    .from('matches')
    .update({ status: 'submitted' })
    .eq('id', form.match_id)

  if (updateError) {
    return { success: false, error: 'Result saved but failed to update match status.' }
  }

  // Insert audit log entry
  await supabase
    .from('audit_log')
    .insert({
      league_id: season.league_id,
      actor_user_id: user.id,
      entity_type: 'match',
      entity_id: form.match_id,
      action: 'submitted_result',
      payload: {
        points_a: form.points_a,
        points_b: form.points_b,
        innings: form.innings,
        high_run_a: form.high_run_a,
        high_run_b: form.high_run_b,
      },
    })

  return { success: true }
}
