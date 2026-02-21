import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">CueBook</span>
          <Link
            href="/login"
            className="text-sm font-medium text-blue-400 hover:text-blue-300 transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            CueBook
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Straight Pool League Management
          </p>
          <p className="text-gray-500 mb-10 max-w-md mx-auto">
            Track matches, standings, and player stats for your straight pool league.
            Submit results, manage seasons, and keep everything organized in one place.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
          >
            Sign In
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center text-sm text-gray-600">
        CueBook &mdash; Straight Pool League Management
      </footer>
    </div>
  )
}
