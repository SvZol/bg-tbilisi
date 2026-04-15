'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

const input = "w-full border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"

function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token')
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Пароль должен быть минимум 6 символов'); return }
    if (password !== password2) { setError('Пароли не совпадают'); return }
    if (!token) { setError('Токен не найден. Используйте ссылку из письма.'); return }

    setLoading(true)
    try {
      await api.post(`/auth/reset-password?token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(password)}`)
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Ошибка. Ссылка могла устареть.')
    } finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-stone-600 mb-4">Неверная ссылка для сброса пароля.</p>
        <Link href="/forgot-password" className="text-red-700 hover:text-red-800 font-medium">
          Запросить новую ссылку
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm">
      {done ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-stone-700 font-semibold mb-2">Пароль изменён!</p>
          <p className="text-stone-500 text-sm">Перенаправляем на страницу входа...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Новый пароль</label>
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              className={input} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Повторите пароль</label>
            <input type="password" value={password2}
              onChange={e => setPassword2(e.target.value)}
              className={input} required minLength={6} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-red-600 text-white py-2.5 rounded-xl hover:bg-red-700 font-bold disabled:opacity-50 transition-colors">
            {loading ? 'Сохраняем...' : 'Сохранить пароль'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔐</div>
        <h1 className="text-2xl font-extrabold text-stone-900">Новый пароль</h1>
      </div>
      <Suspense fallback={<div className="text-center text-stone-500">Загрузка...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
