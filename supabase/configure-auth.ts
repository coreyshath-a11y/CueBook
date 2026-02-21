// Configure Supabase Auth redirect URLs for Vercel deployment

const SUPABASE_URL = 'https://fbtsbxsjwnrvuurfdjfk.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidHNieHNqd25ydnV1cmZkamZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1MTU5MiwiZXhwIjoyMDg3MjI3NTkyfQ.6jBAcfBP--cu00cM4QWzgkME5G_CkZ1RdUNGx__EnTA'

// Vercel deployment URLs to whitelist for auth redirects
const REDIRECT_URLS = [
  'https://cuebook-coreyshath-a11ys-projects.vercel.app/**',
  'https://cuebook-*.vercel.app/**',
  'http://localhost:3000/**',
]

async function main() {
  console.log('Configuring Supabase Auth settings...')
  console.log('Redirect URLs to allow:', REDIRECT_URLS)

  // The Supabase Management API requires the access token from CLI
  // For now, we'll output instructions for the user
  console.log('\n⚠️  Auth redirect URLs need to be configured in the Supabase Dashboard:')
  console.log('   1. Go to https://supabase.com/dashboard/project/fbtsbxsjwnrvuurfdjfk/auth/url-configuration')
  console.log('   2. Set Site URL to: https://cuebook-coreyshath-a11ys-projects.vercel.app')
  console.log('   3. Add these Redirect URLs:')
  REDIRECT_URLS.forEach(url => console.log(`      - ${url}`))
  console.log('\n   This enables the auth callback to work on your Vercel deployment.')
}

main()
