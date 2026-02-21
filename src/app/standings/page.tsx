import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { StandingWithPlayer } from '@/lib/types'

export default async function StandingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get the user's league via player profile
  const { data: playerProfile } = await supabase
    .from('players')
    .select('league_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  // Get the current active season (most recent by start_date)
  let standings: StandingWithPlayer[] = []
  let seasonName = ''

  if (playerProfile) {
    const { data: season } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', playerProfile.league_id)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (season) {
      seasonName = season.name

      const { data: standingsData } = await supabase
        .from('season_standings')
        .select(`
          *,
          player:players(id, display_name)
        `)
        .eq('season_id', season.id)
        .order('wins', { ascending: false })

      standings = (standingsData ?? []) as unknown as StandingWithPlayer[]
    }
  }

  // Sort by wins desc, then PPI desc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.ppi - a.ppi
  })

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
            <Link href="/standings" className="text-white text-sm font-medium">Standings</Link>
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Standings</h1>
          {seasonName && (
            <span className="text-sm text-gray-400">{seasonName}</span>
          )}
        </div>

        {standings.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No standings data available yet.
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Player</th>
                    <th className="text-center px-4 py-3">W</th>
                    <th className="text-center px-4 py-3">L</th>
                    <th className="text-center px-4 py-3">Pts For</th>
                    <th className="text-center px-4 py-3">Pts Against</th>
                    <th className="text-center px-4 py-3">+/-</th>
                    <th className="text-center px-4 py-3">Innings</th>
                    <th className="text-center px-4 py-3">PPI</th>
                    <th className="text-center px-4 py-3">High Run</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, index) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition"
                    >
                      <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/players/${s.player.id}`}
                          className="text-white hover:text-blue-400 font-medium transition"
                        >
                          {s.player.display_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 font-medium">{s.wins}</td>
                      <td className="px-4 py-3 text-center text-red-400 font-medium">{s.losses}</td>
                      <td className="px-4 py-3 text-center">{s.points_for}</td>
                      <td className="px-4 py-3 text-center">{s.points_against}</td>
                      <td className={`px-4 py-3 text-center font-medium ${
                        s.point_differential > 0
                          ? 'text-green-400'
                          : s.point_differential < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}>
                        {s.point_differential > 0 ? '+' : ''}{s.point_differential}
                      </td>
                      <td className="px-4 py-3 text-center">{s.total_innings}</td>
                      <td className="px-4 py-3 text-center font-medium">
                        {Number(s.ppi).toFixed(3)}
                      </td>
                      <td className="px-4 py-3 text-center">{s.high_run}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
