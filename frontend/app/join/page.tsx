'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'

interface TeamPreview {
  id: string
  name: string
  category: string
  captain_name: string | null
}

function JoinPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''

  const [team, setTeam] = useState<TeamPreview | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    if (!code) return
    api.get(`/teams/by-invite/${code}`)
      .then(r => setTeam(r.data))
      .catch(() => setFetchError('Код не найден или уже был использован.'))
  }, [code])

  useEffect(() => {
    if (loading) return
    if (!user && code) {
      router.push(`/register?next=${encodeURIComponent(`/join?code=${code}`)}`)
    }
  }, [user, loading, code])

  async function handleClaim() {
    setClaiming(true)
    setClaimError('')
    try {
      await api.post('/teams/claim', { invite_code: code })
      router.push('/dashboard')
    } catch (err: any) {
      setClaimError(err?.response?.data?.detail || 'Ошибка. Попробуйте ещё раз.')
    } finally {
      setClaiming(false)
    }
  }

  if (!code) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center text-stone-500">
        Код приглашения не указан.{' '}
        <Link href="/dashboard" className="text-red-700 font-medium">В личный кабинет</Link>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <p className="text-red-600 font-medium">{fetchError}</p>
        <Link href="/dashboard" className="text-red-700 font-medium text-sm">В личный кабинет</Link>
      </div>
    )
  }

  if (loading || !team) {
    return <p className="text-stone-400 mt-20 text-center">Загрузка...</p>
  }

  const catLabel = team.category === 'adult' ? 'Лоси (взрослый зачёт)' : 'Лосята (детский зачёт)'

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="text-4xl">🦌</div>
        <h1 className="text-2xl font-extrabold text-stone-900">Ваша команда</h1>
        <div className="bg-stone-50 rounded-xl p-4 text-left space-y-1">
          <p className="text-lg font-bold text-stone-900">{team.name}</p>
          <p className="text-sm text-stone-500">{catLabel}</p>
          {team.captain_name && (
            <p className="text-sm text-stone-500">Капитан: {team.captain_name}</p>
          )}
        </div>
        <p className="text-stone-600 text-sm">
          Нажмите кнопку ниже, чтобы привязать эту команду к своему аккаунту.
        </p>
        {claimError && <p className="text-red-500 text-sm">{claimError}</p>}
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition-colors"
        >
          {claiming ? 'Привязываем...' : 'Это моя команда'}
        </button>
        <Link href="/dashboard" className="block text-sm text-stone-400 hover:text-stone-600">
          Отмена
        </Link>
      </div>
    </div>
  )
}

export default function JoinPageWrapper() {
  return (
    <Suspense fallback={<p className="text-center mt-20 text-stone-400">Загрузка...</p>}>
      <JoinPage />
    </Suspense>
  )
}
