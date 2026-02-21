import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface ScheduleMatch {
  id: string
  status: string
  race_to_points: number
  scheduled_at: string | null
  player_a: { display_name: string }
  player_b: { display_name: string }
}

interface WeekWithMatches {
  id: string
  week_number: number
  start_date: string | null
  end_date: string | null
  matches: ScheduleMatch[]
}

export default async function SchedulePage() {
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

  let weeks: WeekWithMatches[] = []
  let seasonName = ''

  if (playerProfile) {
    // Get the current active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', playerProfile.league_id)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (season) {
      seasonName = season.name

      // Get all weeks with matches
      const { data: weeksData } = await supabase
        .from('weeks')
        .select('id, week_number, start_date, end_date')
        .eq('season_id', season.id)
        .order('week_number', { ascending: true })

      if (weeksData) {
        // Get all matches for the season
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            id, status, race_to_points, scheduled_at, week_id,
            player_a:players!matches_player_a_id_fkey(display_name),
            player_b:players!matches_player_b_id_fkey(display_name)
          `)
          .eq('season_id', season.id)
          .order('created_at', { ascending: true })

        const matchesByWeek = new Map<string, ScheduleMatch[]>()
        for (const m of (matchesData ?? [])) {
          const weekId = (m as unknown as { week_id: string }).week_id
          if (!matchesByWeek.has(weekId)) {
            matchesByWeek.set(weekId, [])
          }
          matchesByWeek.get(weekId)!.push({
            id: m.id,
            status: m.status,
            race_to_points: m.race_to_points,
            scheduled_at: m.scheduled_at,
            player_a: m.player_a as unknown as { display_name: string },
            player_b: m.player_b as unknown as { display_name: string },
          })
        }

        weeks = weeksData.map((w) => ({
          ...w,
          matches: matchesByWeek.get(w.id) ?? [],
        }))
      }
    }
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
            <Link href="/schedule" className="text-white text-sm font-medium">Schedule</Link>
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
          <h1 className="text-2xl font-bold">Schedule</h1>
          {seasonName && (
            <span className="text-sm text-gray-400">{seasonName}</span>
          )}
        </div>

        {weeks.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No schedule available yet.
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week) => (
              <div key={week.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/80">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Week {week.week_number}</h2>
                    {week.start_date && (
                      <span className="text-xs text-gray-500">
                        {new Date(week.start_date + 'T00:00:00').toLocaleDateString()}
                        {week.end_date && ` - ${new Date(week.end_date + 'T00:00:00').toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>

                {week.matches.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-600 text-sm">
                    No matches scheduled for this week.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800/50">
                    {week.matches.map((match) => (
                      <Link
                        key={match.id}
                        href={`/match/${match.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-sm">
                            {match.player_a.display_name}
                            <span className="text-gray-500 mx-2">vs</span>
                            {match.player_b.display_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            Race to {match.race_to_points}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
