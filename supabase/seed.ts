// CueBook Seed Script
// Creates test user and seeds mock league data

const SUPABASE_URL = 'https://fbtsbxsjwnrvuurfdjfk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidHNieHNqd25ydnV1cmZkamZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1MTU5MiwiZXhwIjoyMDg3MjI3NTkyfQ.6jBAcfBP--cu00cM4QWzgkME5G_CkZ1RdUNGx__EnTA'

interface AuthUser {
  id: string
  email: string
}

async function supabaseAdmin(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`Error ${res.status}:`, text)
    throw new Error(`API error: ${res.status} - ${text}`)
  }
  if (!text || text.trim() === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function runSQL(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

async function main() {
  console.log('🎱 CueBook Seed Script Starting...\n')

  // Step 1: Create the admin/owner user
  console.log('1. Creating admin user...')
  let adminUser: AuthUser
  try {
    adminUser = await supabaseAdmin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'coreyshath@gmail.com',
        password: 'CueBook2026!',
        email_confirm: true,
      }),
    })
    console.log(`   ✅ Created user: ${adminUser.id}`)
  } catch (e) {
    // User might already exist, try to find them
    console.log('   User may already exist, looking up...')
    const users = await supabaseAdmin('/auth/v1/admin/users?page=1&per_page=50')
    const existing = users.users?.find((u: AuthUser) => u.email === 'coreyshath@gmail.com')
    if (existing) {
      adminUser = existing
      console.log(`   ✅ Found existing user: ${adminUser.id}`)
      // Update password
      await supabaseAdmin(`/auth/v1/admin/users/${adminUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password: 'CueBook2026!' }),
      })
      console.log('   ✅ Password updated')
    } else {
      throw new Error('Could not create or find user')
    }
  }

  // Step 2: Create mock player users
  console.log('\n2. Creating mock player users...')
  const mockPlayers = [
    { email: 'mike.johnson@example.com', name: 'Mike Johnson' },
    { email: 'sarah.williams@example.com', name: 'Sarah Williams' },
    { email: 'dave.thompson@example.com', name: 'Dave Thompson' },
    { email: 'lisa.chen@example.com', name: 'Lisa Chen' },
    { email: 'bob.martinez@example.com', name: 'Bob Martinez' },
    { email: 'jen.parker@example.com', name: 'Jen Parker' },
    { email: 'tom.wilson@example.com', name: 'Tom Wilson' },
  ]

  const playerUserIds: string[] = []
  for (const p of mockPlayers) {
    try {
      const user = await supabaseAdmin('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: p.email,
          password: 'TestPlayer2026!',
          email_confirm: true,
        }),
      })
      playerUserIds.push(user.id)
      console.log(`   ✅ ${p.name}: ${user.id}`)
    } catch {
      const users = await supabaseAdmin('/auth/v1/admin/users?page=1&per_page=50')
      const existing = users.users?.find((u: AuthUser) => u.email === p.email)
      if (existing) {
        playerUserIds.push(existing.id)
        console.log(`   ✅ ${p.name} (existing): ${existing.id}`)
      }
    }
  }

  // Step 3: Seed the database via REST API (using service role to bypass RLS)
  console.log('\n3. Creating league...')

  // Create league
  const [league] = await supabaseAdmin('/rest/v1/leagues', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name: 'Metro Straight Pool League',
      owner_user_id: adminUser.id,
    }),
  })
  console.log(`   ✅ League: ${league.id} - ${league.name}`)

  // Step 4: Create season
  console.log('\n4. Creating season...')
  const [season] = await supabaseAdmin('/rest/v1/seasons', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      league_id: league.id,
      name: 'Spring 2026 Session',
      start_date: '2026-02-23',
      end_date: '2026-05-17',
      race_to_default: 100,
      innings_required: true,
      high_run_enabled: true,
      handicap_method: 'adjusted_race_to',
      submission_rule: 'player_submits',
    }),
  })
  console.log(`   ✅ Season: ${season.id} - ${season.name}`)

  // Step 5: Create venue
  console.log('\n5. Creating venue...')
  const [venue] = await supabaseAdmin('/rest/v1/venues', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      league_id: league.id,
      name: 'Corner Pocket Billiards',
      address: '123 Main St, Anytown, USA',
      notes: 'Tables 3-6 reserved for league play',
    }),
  })
  console.log(`   ✅ Venue: ${venue.name}`)

  // Step 6: Create players
  console.log('\n6. Creating players...')
  const allPlayerNames = ['Corey Hathaway', ...mockPlayers.map(p => p.name)]
  const allPlayerEmails = ['coreyshath@gmail.com', ...mockPlayers.map(p => p.email)]
  const allUserIds = [adminUser.id, ...playerUserIds]

  const playerRecords = allPlayerNames.map((name, i) => ({
    league_id: league.id,
    user_id: allUserIds[i],
    display_name: name,
    email: allPlayerEmails[i],
  }))

  const players = await supabaseAdmin('/rest/v1/players', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(playerRecords),
  })
  console.log(`   ✅ Created ${players.length} players`)

  // Step 7: Create season_players with handicaps
  console.log('\n7. Enrolling players in season...')
  const handicaps = [0, 5, -5, 10, 0, -10, 15, 0] // Varied handicaps
  const seasonPlayers = players.map((p: { id: string }, i: number) => ({
    season_id: season.id,
    player_id: p.id,
    handicap_points: handicaps[i] || 0,
    is_active: true,
  }))

  await supabaseAdmin('/rest/v1/season_players', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(seasonPlayers),
  })
  console.log(`   ✅ Enrolled ${seasonPlayers.length} players`)

  // Step 8: Create weeks
  console.log('\n8. Creating 12 weeks...')
  const weeks = []
  const seasonStart = new Date('2026-02-23')
  for (let i = 1; i <= 12; i++) {
    const weekStart = new Date(seasonStart)
    weekStart.setDate(weekStart.getDate() + (i - 1) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weeks.push({
      season_id: season.id,
      week_number: i,
      start_date: weekStart.toISOString().split('T')[0],
      end_date: weekEnd.toISOString().split('T')[0],
    })
  }

  const weekRecords = await supabaseAdmin('/rest/v1/weeks', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(weeks),
  })
  console.log(`   ✅ Created ${weekRecords.length} weeks`)

  // Step 9: Create matches (round robin-ish for first 4 weeks)
  console.log('\n9. Creating matches...')
  const matchups = [
    // Week 1
    { week: 0, a: 0, b: 1 },
    { week: 0, a: 2, b: 3 },
    { week: 0, a: 4, b: 5 },
    { week: 0, a: 6, b: 7 },
    // Week 2
    { week: 1, a: 0, b: 2 },
    { week: 1, a: 1, b: 4 },
    { week: 1, a: 3, b: 6 },
    { week: 1, a: 5, b: 7 },
    // Week 3
    { week: 2, a: 0, b: 3 },
    { week: 2, a: 1, b: 5 },
    { week: 2, a: 2, b: 6 },
    { week: 2, a: 4, b: 7 },
    // Week 4
    { week: 3, a: 0, b: 4 },
    { week: 3, a: 1, b: 6 },
    { week: 3, a: 2, b: 7 },
    { week: 3, a: 3, b: 5 },
  ]

  const matchRecords = matchups.map((m) => ({
    season_id: season.id,
    week_id: weekRecords[m.week].id,
    player_a_id: players[m.a].id,
    player_b_id: players[m.b].id,
    venue_id: venue.id,
    race_to_points: season.race_to_default + (handicaps[m.a] || 0),
    status: 'scheduled',
  }))

  const matches = await supabaseAdmin('/rest/v1/matches', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(matchRecords),
  })
  console.log(`   ✅ Created ${matches.length} matches`)

  // Step 10: Submit, approve, and lock some results for weeks 1-2
  console.log('\n10. Adding completed match results (weeks 1-2)...')
  const completedResults = [
    // Week 1 results
    { matchIdx: 0, pa: 100, pb: 87, inn: 15, hra: 23, hrb: 18 },
    { matchIdx: 1, pa: 92, pb: 100, inn: 18, hra: 15, hrb: 21 },
    { matchIdx: 2, pa: 100, pb: 76, inn: 12, hra: 32, hrb: 14 },
    { matchIdx: 3, pa: 100, pb: 95, inn: 20, hra: 19, hrb: 27 },
    // Week 2 results
    { matchIdx: 4, pa: 100, pb: 88, inn: 14, hra: 28, hrb: 16 },
    { matchIdx: 5, pa: 100, pb: 100, inn: 22, hra: 12, hrb: 20 }, // tie (both hit race-to)
    { matchIdx: 6, pa: 78, pb: 100, inn: 16, hra: 17, hrb: 24 },
    { matchIdx: 7, pa: 100, pb: 63, inn: 11, hra: 35, hrb: 10 },
  ]

  for (const r of completedResults) {
    // Insert result
    await supabaseAdmin('/rest/v1/match_results', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        match_id: matches[r.matchIdx].id,
        points_a: r.pa,
        points_b: r.pb,
        innings: r.inn,
        high_run_a: r.hra,
        high_run_b: r.hrb,
        submitted_by_user_id: adminUser.id,
        submitted_at: new Date().toISOString(),
        approved_by_user_id: adminUser.id,
        approved_at: new Date().toISOString(),
        locked_by_user_id: adminUser.id,
        locked_at: new Date().toISOString(),
      }),
    })

    // Update match status to locked
    await supabaseAdmin(`/rest/v1/matches?id=eq.${matches[r.matchIdx].id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'locked' }),
    })
  }
  console.log(`   ✅ Added ${completedResults.length} completed results`)

  // Step 11: Add a "submitted" result for week 3 (pending approval)
  console.log('\n11. Adding submitted (pending) result...')
  await supabaseAdmin('/rest/v1/match_results', {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      match_id: matches[8].id,
      points_a: 100,
      points_b: 91,
      innings: 17,
      high_run_a: 22,
      high_run_b: 19,
      submitted_by_user_id: adminUser.id,
      submitted_at: new Date().toISOString(),
      notes: 'Great match! Came down to the wire.',
    }),
  })
  await supabaseAdmin(`/rest/v1/matches?id=eq.${matches[8].id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'submitted' }),
  })
  console.log('   ✅ Added 1 pending approval')

  // Step 12: Recompute standings
  console.log('\n12. Computing standings...')
  await supabaseAdmin('/rest/v1/rpc/recompute_season_standings', {
    method: 'POST',
    body: JSON.stringify({ target_season_id: season.id }),
  })
  console.log('   ✅ Standings computed')

  // Step 13: Add audit log entries
  console.log('\n13. Adding audit log entries...')
  const auditEntries = completedResults.map((r) => ({
    league_id: league.id,
    actor_user_id: adminUser.id,
    entity_type: 'match',
    entity_id: matches[r.matchIdx].id,
    action: 'approved_and_locked_result',
    payload: { points_a: r.pa, points_b: r.pb },
  }))

  await supabaseAdmin('/rest/v1/audit_log', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify(auditEntries),
  })
  console.log(`   ✅ Added ${auditEntries.length} audit entries`)

  console.log('\n🎱 ✅ Seed complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Email: coreyshath@gmail.com')
  console.log('   Password: CueBook2026!')
  console.log(`\n   User ID: ${adminUser.id}`)
  console.log(`   League: ${league.name}`)
  console.log(`   Season: ${season.name}`)
  console.log(`   Players: ${players.length}`)
  console.log(`   Matches: ${matches.length} (${completedResults.length} completed, 1 pending)`)
}

main().catch(console.error)
