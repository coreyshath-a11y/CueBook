'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitResult } from './actions'

interface SubmitResultFormProps {
  matchId: string
  playerAName: string
  playerBName: string
  raceTo: number
  inningsRequired: boolean
  highRunEnabled: boolean
}

export default function SubmitResultForm({
  matchId,
  playerAName,
  playerBName,
  raceTo,
  inningsRequired,
  highRunEnabled,
}: SubmitResultFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pointsA, setPointsA] = useState<string>(String(raceTo))
  const [pointsB, setPointsB] = useState<string>('')
  const [innings, setInnings] = useState<string>('')
  const [highRunA, setHighRunA] = useState<string>('')
  const [highRunB, setHighRunB] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await submitResult({
      match_id: matchId,
      points_a: parseInt(pointsA, 10) || 0,
      points_b: parseInt(pointsB, 10) || 0,
      innings: innings ? parseInt(innings, 10) : null,
      high_run_a: highRunA ? parseInt(highRunA, 10) : null,
      high_run_b: highRunB ? parseInt(highRunB, 10) : null,
      notes: notes || null,
    })

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'An unknown error occurred.')
    }
    setLoading(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Submit Result</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {playerAName} Points
            </label>
            <input
              type="number"
              min="0"
              value={pointsA}
              onChange={(e) => setPointsA(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={String(raceTo)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {playerBName} Points
            </label>
            <input
              type="number"
              min="0"
              value={pointsB}
              onChange={(e) => setPointsB(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
        </div>

        {inningsRequired && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Innings
            </label>
            <input
              type="number"
              min="1"
              value={innings}
              onChange={(e) => setInnings(e.target.value)}
              required={inningsRequired}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Number of innings"
            />
          </div>
        )}

        {highRunEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                High Run ({playerAName})
              </label>
              <input
                type="number"
                min="0"
                value={highRunA}
                onChange={(e) => setHighRunA(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                High Run ({playerBName})
              </label>
              <input
                type="number"
                min="0"
                value={highRunB}
                onChange={(e) => setHighRunB(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Any additional notes about the match..."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
        >
          {loading ? 'Submitting...' : 'Submit Result'}
        </button>
      </form>
    </div>
  )
}
