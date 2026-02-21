import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get leagues where user is owner or player
  const { data: ownedLeagues } = await supabase
    .from('leagues')
    .select('*')
    .eq('owner_user_id', user.id)

  // Get player profile(s) for this user
  const { data: playerProfiles } = await supabase
    .from('players')
    .select('*, leagues(*)')
    .eq('user_id', user.id)

  // Get upcoming matches for this player
  const playerIds = playerProfiles?.map(p => p.id) || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upcomingMatches: any[] = []

  if (playerIds.length > 0) {
    // Get matches where user is player A
    const { data: matchesA } = await supabase
      .from('matches')
      .select(`
        id, status, race_to_points, scheduled_at,
        player_a:players!matches_player_a_id_fkey(display_name),
        player_b:players!matches_player_b_id_fkey(display_name),
        week:weeks(week_number)
      `)
      .in('player_a_id', playerIds)
      .in('status', ['scheduled', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(5)

    // Get matches where user is player B
    const { data: matchesB } = await supabase
      .from('matches')
      .select(`
        id, status, race_to_points, scheduled_at,
        player_a:players!matches_player_a_id_fkey(display_name),
        player_b:players!matches_player_b_id_fkey(display_name),
        week:weeks(week_number)
      `)
      .in('player_b_id', playerIds)
      .in('status', ['scheduled', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(5)

    upcomingMatches = [...(matchesA || []), ...(matchesB || [])]
  }

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

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Week</h1>

        {/* Upcoming Matches */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Upcoming Matches</h2>
          {upcomingMatches.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No upcoming matches scheduled.
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/match/${match.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {Array.isArray(match.player_a) ? match.player_a[0]?.display_name : match.player_a?.display_name}
                        {' vs '}
                        {Array.isArray(match.player_b) ? match.player_b[0]?.display_name : match.player_b?.display_name}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Week {Array.isArray(match.week) ? match.week[0]?.week_number : match.week?.week_number} • Race to {match.race_to_points}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        match.status === 'scheduled'
                          ? 'bg-blue-900/50 text-blue-300'
                          : match.status === 'submitted'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : 'bg-green-900/50 text-green-300'
                      }`}>
                        {match.status}
                      </span>
                      <span className="text-gray-600">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/standings"
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium">Standings</p>
              <p className="text-sm text-gray-500">View current rankings</p>
            </Link>
            <Link
              href="/schedule"
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition text-center"
            >
              <div className="text-2xl mb-2">📅</div>
              <p className="font-medium">Schedule</p>
              <p className="text-sm text-gray-500">See all weeks</p>
            </Link>
            <Link
              href="/players"
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition text-center"
            >
              <div className="text-2xl mb-2">👥</div>
              <p className="font-medium">Players</p>
              <p className="text-sm text-gray-500">League directory</p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
