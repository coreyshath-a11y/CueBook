import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Season, Player, League } from '@/lib/types'
import AdminApprovalCard from './approval-card'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if user owns any leagues
  const { data: ownedLeagues } = await supabase
    .from('leagues')
    .select('*')
    .eq('owner_user_id', user.id)

  if (!ownedLeagues || ownedLeagues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">You must be a league owner to access the admin dashboard.</p>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const league = ownedLeagues[0] as League

  // Get seasons for this league
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', league.id)
    .order('start_date', { ascending: false })

  const typedSeasons = (seasons ?? []) as Season[]

  // Get players for this league
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('league_id', league.id)
    .order('display_name', { ascending: true })

  const typedPlayers = (players ?? []) as Player[]

  // Get pending approvals (matches with status 'submitted')
  const { data: pendingMatches } = await supabase
    .from('matches')
    .select(`
      id, status, race_to_points, season_id,
      player_a:players!matches_player_a_id_fkey(display_name),
      player_b:players!matches_player_b_id_fkey(display_name),
      week:weeks(week_number),
      match_results(points_a, points_b, innings, high_run_a, high_run_b)
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })

  interface PendingMatch {
    id: string
    status: string
    race_to_points: number
    season_id: string
    player_a: { display_name: string }
    player_b: { display_name: string }
    week: { week_number: number }
    match_results: Array<{
      points_a: number
      points_b: number
      innings: number | null
      high_run_a: number | null
      high_run_b: number | null
    }>
  }

  const typedPending = (pendingMatches ?? []) as unknown as PendingMatch[]

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
            <Link href="/admin" className="text-yellow-400 text-sm font-medium">Admin</Link>
            <form action={handleSignOut}>
              <button type="submit" className="text-gray-500 hover:text-gray-300 text-sm">
                Sign Out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <span className="text-sm text-gray-400">{league.name}</span>
        </div>

        {/* Pending Approvals */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            Pending Approvals
            {typedPending.length > 0 && (
              <span className="ml-2 text-xs bg-yellow-900/50 text-yellow-300 px-2 py-0.5 rounded-full">
                {typedPending.length}
              </span>
            )}
          </h2>

          {typedPending.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              No results pending approval.
            </div>
          ) : (
            <div className="grid gap-4">
              {typedPending.map((match) => {
                const result = match.match_results[0] ?? null
                return (
                  <AdminApprovalCard
                    key={match.id}
                    matchId={match.id}
                    playerAName={match.player_a.display_name}
                    playerBName={match.player_b.display_name}
                    weekNumber={match.week.week_number}
                    raceTo={match.race_to_points}
                    pointsA={result?.points_a ?? 0}
                    pointsB={result?.points_b ?? 0}
                    innings={result?.innings ?? null}
                    highRunA={result?.high_run_a ?? null}
                    highRunB={result?.high_run_b ?? null}
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* Season Management */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Seasons</h2>
          </div>

          {typedSeasons.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              No seasons created yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {typedSeasons.map((season) => (
                <div
                  key={season.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{season.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Date(season.start_date + 'T00:00:00').toLocaleDateString()} - {new Date(season.end_date + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Race to {season.race_to_default}</span>
                    {season.innings_required && <span>Innings</span>}
                    {season.high_run_enabled && <span>High Run</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Player Management */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-300">Players</h2>
            <span className="text-sm text-gray-500">{typedPlayers.length} players</span>
          </div>

          {typedPlayers.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
              No players added yet.
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="divide-y divide-gray-800/50">
                {typedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{player.display_name}</p>
                      {player.email && (
                        <p className="text-xs text-gray-500">{player.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.user_id ? (
                        <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded-full">
                          Linked
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                          Not Linked
                        </span>
                      )}
                      <Link
                        href={`/players/${player.id}`}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
