'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveResult, lockResult } from './actions'

interface AdminApprovalCardProps {
  matchId: string
  playerAName: string
  playerBName: string
  weekNumber: number
  raceTo: number
  pointsA: number
  pointsB: number
  innings: number | null
  highRunA: number | null
  highRunB: number | null
}

export default function AdminApprovalCard({
  matchId,
  playerAName,
  playerBName,
  weekNumber,
  raceTo,
  pointsA,
  pointsB,
  innings,
  highRunA,
  highRunB,
}: AdminApprovalCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'lock' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setLoading('approve')
    setError(null)
    const result = await approveResult(matchId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to approve.')
    }
    setLoading(null)
  }

  const handleLock = async () => {
    setLoading('lock')
    setError(null)
    const result = await lockResult(matchId)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? 'Failed to lock.')
    }
    setLoading(null)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-medium">
            {playerAName} vs {playerBName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Week {weekNumber} &middot; Race to {raceTo}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-900/50 text-yellow-300">
          submitted
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center mb-3 py-2 bg-gray-800/50 rounded-lg">
        <div>
          <p className="text-xs text-gray-500">{playerAName}</p>
          <p className="text-xl font-bold">{pointsA}</p>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-gray-600">-</span>
        </div>
        <div>
          <p className="text-xs text-gray-500">{playerBName}</p>
          <p className="text-xl font-bold">{pointsB}</p>
        </div>
      </div>

      {(innings !== null || highRunA !== null || highRunB !== null) && (
        <div className="flex gap-4 text-xs text-gray-500 mb-3">
          {innings !== null && <span>Innings: {innings}</span>}
          {highRunA !== null && <span>HR ({playerAName}): {highRunA}</span>}
          {highRunB !== null && <span>HR ({playerBName}): {highRunB}</span>}
        </div>
      )}

      {error && (
        <div className="p-2 bg-red-900/50 border border-red-800 rounded-lg text-red-300 text-xs mb-3">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex-1 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
        >
          {loading === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={handleLock}
          disabled={loading !== null}
          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
        >
          {loading === 'lock' ? 'Locking...' : 'Approve & Lock'}
        </button>
      </div>
    </div>
  )
}
