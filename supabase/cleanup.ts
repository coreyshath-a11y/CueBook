const SUPABASE_URL = 'https://fbtsbxsjwnrvuurfdjfk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidHNieHNqd25ydnV1cmZkamZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1MTU5MiwiZXhwIjoyMDg3MjI3NTkyfQ.6jBAcfBP--cu00cM4QWzgkME5G_CkZ1RdUNGx__EnTA'

async function del(table: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
  })
  console.log(`Deleted ${table}: ${res.status}`)
}

async function main() {
  await del('audit_log')
  await del('season_standings')
  await del('match_results')
  await del('matches')
  await del('weeks')
  await del('season_players')
  await del('seasons')
  await del('venues')
  await del('players')
  await del('leagues')
  console.log('Done cleaning')
}
main()
