import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { MatchStatus } from '@/lib/types'
import SubmitResultForm from './submit-result-form'

interface MatchPageProps {
  params: Promise<{ id: string }>
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch match with joined player names, venue, and week
  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a:players!matches_player_a_id_fkey(id, display_name, user_id),
      player_b:players!matches_player_b_id_fkey(id, display_name, user_id),
      venue:venues(name),
      week:weeks(week_number),
      match_results(*)
    `)
    .eq('id', id)
    .single()

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Match Not Found</h1>
          <p className="text-gray-400 mb-4">This match does not exist or you do not have access.</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const playerA = match.player_a as unknown as { id: string; display_name: string; user_id: string | null }
  const playerB = match.player_b as unknown as { id: string; display_name: string; user_id: string | null }
  const venue = match.venue as unknown as { name: string } | null
  const week = match.week as unknown as { week_number: number }
  const matchResult = Array.isArray(match.match_results)
    ? match.match_results[0] ?? null
    : match.match_results

  // Check if user is a participant
  const isParticipant = playerA.user_id === user.id || playerB.user_id === user.id

  // Check if user is league owner (for admin access)
  const { data: season } = await supabase
    .from('seasons')
    .select('league_id, innings_required, high_run_enabled')
    .eq('id', match.season_id)
    .single()

  let isOwner = false
  if (season) {
    const { data: league } = await supabase
      .from('leagues')
      .select('owner_user_id')
      .eq('id', season.league_id)
      .single()
    isOwner = league?.owner_user_id === user.id
  }

  // Determine if user can submit
  const canSubmit = (match.status as MatchStatus) === 'scheduled' && (isParticipant || isOwner)

  // Check owned leagues for nav
  const { data: ownedLeagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('owner_user_id', user.id)

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-900/50 text-blue-300'
      case 'submitted':
        return 'bg-yellow-900/50 text-yellow-300'
      case 'approved':
        return 'bg-green-900/50 text-green-300'
      case 'locked':
        return 'bg-gray-700 text-gray-300'
      default:
        return 'bg-gray-700 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">CueBook</Link>
          <nav className="flex items-center gap-4">
            <Link href="/standings" className="text-gray-400 hover:text-white text-sm">Standings</Link>
            <Link href="/schedule" className="text-gray-400 hover:text-white text-sm">Schedule</Link>
            <Link href="/players" className="text-gray-400 hover:text-white text-sm">Players</Link>
            {(ownedLeagues && ownedLeagues.length > 0) && (
              <Link href="/admin" className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">Admin</Link>
            )}
            <form action={handleSignOut}>
              <button type="submit" className="text-gray-500 hover:text-gray-300 text-sm">
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/schedule" className="text-gray-500 hover:text-gray-300 text-sm">
            Schedule
          </Link>
          <span className="text-gray-600 mx-2">/</span>
          <span className="text-gray-400 text-sm">Match Detail</span>
        </div>

        {/* Match Info Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {playerA.display_name} vs {playerB.display_name}
            </h1>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusBadge(match.status)}`}>
              {match.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Week</p>
              <p className="text-white font-medium">{week.week_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Race To</p>
              <p className="text-white font-medium">{match.race_to_points}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Venue</p>
              <p className="text-white font-medium">{venue?.name ?? 'TBD'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Scheduled</p>
              <p className="text-white font-medium">
                {match.scheduled_at
                  ? new Date(match.scheduled_at).toLocaleDateString()
                  : 'TBD'}
              </p>
            </div>
          </div>
        </div>

        {/* Submitted Result Display */}
        {matchResult && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Match Result</h2>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">{playerA.display_name}</p>
                <p className="text-3xl font-bold">{matchResult.points_a}</p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-gray-600 text-lg">-</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{playerB.display_name}</p>
                <p className="text-3xl font-bold">{matchResult.points_b}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-800">
              {matchResult.innings !== null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Innings</p>
                  <p className="text-white">{matchResult.innings}</p>
                </div>
              )}
              {matchResult.high_run_a !== null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    High Run ({playerA.display_name})
                  </p>
                  <p className="text-white">{matchResult.high_run_a}</p>
                </div>
              )}
              {matchResult.high_run_b !== null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    High Run ({playerB.display_name})
                  </p>
                  <p className="text-white">{matchResult.high_run_b}</p>
                </div>
              )}
              {matchResult.notes && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-gray-300 text-sm">{matchResult.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Result Form */}
        {canSubmit && (
          <SubmitResultForm
            matchId={match.id}
            playerAName={playerA.display_name}
            playerBName={playerB.display_name}
            raceTo={match.race_to_points}
            inningsRequired={season?.innings_required ?? true}
            highRunEnabled={season?.high_run_enabled ?? true}
          />
        )}
      </main>
    </div>
  )
}
