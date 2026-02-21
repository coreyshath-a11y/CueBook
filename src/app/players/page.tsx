import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Player } from '@/lib/types'

export default async function PlayersPage() {
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

  let players: Player[] = []
  let leagueName = ''

  if (playerProfile) {
    const { data: league } = await supabase
      .from('leagues')
      .select('name')
      .eq('id', playerProfile.league_id)
      .single()

    leagueName = league?.name ?? ''

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('league_id', playerProfile.league_id)
      .order('display_name', { ascending: true })

    players = (playersData ?? []) as Player[]
  }

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
            <Link href="/players" className="text-white text-sm font-medium">Players</Link>
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
          <h1 className="text-2xl font-bold">Players</h1>
          {leagueName && (
            <span className="text-sm text-gray-400">{leagueName}</span>
          )}
        </div>

        {players.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No players in this league yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white">{player.display_name}</p>
                  {player.email && (
                    <p className="text-sm text-gray-500 mt-0.5">{player.email}</p>
                  )}
                </div>
                <span className="text-gray-600 text-sm">View Profile</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
