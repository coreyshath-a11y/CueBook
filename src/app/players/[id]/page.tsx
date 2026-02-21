import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Player, SeasonStanding } from '@/lib/types'

interface PlayerPageProps {
  params: Promise<{ id: string }>
}

interface RecentMatch {
  id: string
  status: string
  race_to_points: number
  scheduled_at: string | null
  player_a_id: string
  player_b_id: string
  player_a: { display_name: string }
  player_b: { display_name: string }
  week: { week_number: number }
  match_results: {
    points_a: number
    points_b: number
    innings: number | null
    high_run_a: number | null
    high_run_b: number | null
  } | null
}

export default async function PlayerProfilePage({ params }: PlayerPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the player
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Player Not Found</h1>
          <p className="text-gray-400 mb-4">This player does not exist or you do not have access.</p>
          <Link href="/players" className="text-blue-400 hover:text-blue-300">
            Back to Players
          </Link>
        </div>
      </div>
    )
  }

  const typedPlayer = player as Player

  // Get the current season for this league
  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', typedPlayer.league_id)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  // Get season standings for this player
  let standing: SeasonStanding | null = null
  if (season) {
    const { data: standingData } = await supabase
      .from('season_standings')
      .select('*')
      .eq('season_id', season.id)
      .eq('player_id', typedPlayer.id)
      .single()

    standing = standingData as SeasonStanding | null
  }

  // Get recent matches for this player
  const { data: matchesA } = await supabase
    .from('matches')
    .select(`
      id, status, race_to_points, scheduled_at, player_a_id, player_b_id,
      player_a:players!matches_player_a_id_fkey(display_name),
      player_b:players!matches_player_b_id_fkey(display_name),
      week:weeks(week_number),
      match_results(points_a, points_b, innings, high_run_a, high_run_b)
    `)
    .eq('player_a_id', typedPlayer.id)
    .in('status', ['approved', 'locked', 'submitted'])
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: matchesB } = await supabase
    .from('matches')
    .select(`
      id, status, race_to_points, scheduled_at, player_a_id, player_b_id,
      player_a:players!matches_player_a_id_fkey(display_name),
      player_b:players!matches_player_b_id_fkey(display_name),
      week:weeks(week_number),
      match_results(points_a, points_b, innings, high_run_a, high_run_b)
    `)
    .eq('player_b_id', typedPlayer.id)
    .in('status', ['approved', 'locked', 'submitted'])
    .order('created_at', { ascending: false })
    .limit(10)

  const recentMatches = [
    ...(matchesA ?? []),
    ...(matchesB ?? []),
  ] as unknown as (RecentMatch & { match_results: RecentMatch['match_results'][] | RecentMatch['match_results'] })[]

  // Sort by most recent first and take 10
  const sortedMatches = recentMatches.slice(0, 10)

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
          <Link href="/players" className="text-gray-500 hover:text-gray-300 text-sm">
            Players
          </Link>
          <span className="text-gray-600 mx-2">/</span>
          <span className="text-gray-400 text-sm">{typedPlayer.display_name}</span>
        </div>

        {/* Player Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h1 className="text-2xl font-bold mb-2">{typedPlayer.display_name}</h1>
          {typedPlayer.email && (
            <p className="text-gray-400 text-sm">{typedPlayer.email}</p>
          )}
        </div>

        {/* Season Stats */}
        {standing && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Season Stats</h2>
              {season && <span className="text-sm text-gray-500">{season.name}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Record</p>
                <p className="text-xl font-bold">
                  <span className="text-green-400">{standing.wins}</span>
                  <span className="text-gray-600"> - </span>
                  <span className="text-red-400">{standing.losses}</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Points For</p>
                <p className="text-xl font-bold">{standing.points_for}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">+/-</p>
                <p className={`text-xl font-bold ${
                  standing.point_differential > 0
                    ? 'text-green-400'
                    : standing.point_differential < 0
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`}>
                  {standing.point_differential > 0 ? '+' : ''}{standing.point_differential}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">PPI</p>
                <p className="text-xl font-bold">{Number(standing.ppi).toFixed(3)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">High Run</p>
                <p className="text-xl font-bold">{standing.high_run}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Matches */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">Recent Matches</h2>
          </div>

          {sortedMatches.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No completed matches yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {sortedMatches.map((match) => {
                const result = Array.isArray(match.match_results)
                  ? match.match_results[0] ?? null
                  : match.match_results
                const isPlayerA = match.player_a_id === typedPlayer.id
                const opponentName = isPlayerA
                  ? (match.player_b as unknown as { display_name: string }).display_name
                  : (match.player_a as unknown as { display_name: string }).display_name

                let myPoints: number | null = null
                let oppPoints: number | null = null
                let won = false

                if (result) {
                  myPoints = isPlayerA ? result.points_a : result.points_b
                  oppPoints = isPlayerA ? result.points_b : result.points_a
                  won = myPoints === match.race_to_points
                }

                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-800/30 transition"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        vs {opponentName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Week {(match.week as unknown as { week_number: number }).week_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {result !== null && myPoints !== null && oppPoints !== null ? (
                        <>
                          <span className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                            {won ? 'W' : 'L'}
                          </span>
                          <span className="text-sm text-gray-400">
                            {myPoints} - {oppPoints}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Pending</span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
