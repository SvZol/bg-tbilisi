'use client'
import { useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

const input = "w-full border border-stone-300 rounded-xl px-3 py-2.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`)
      setSent(true)
    } catch {
      setError('Произошла ошибка. Попробуйте позже.')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔑</div>
        <h1 className="text-2xl font-extrabold text-stone-900">Забыли пароль?</h1>
        <p className="text-stone-500 mt-1 text-sm">Введите email — пришлём ссылку для сброса</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-7 shadow-sm">
        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-stone-700 font-semibold mb-2">Письмо отправлено</p>
            <p className="text-stone-500 text-sm mb-6">
              Если этот email зарегистрирован, на него придёт ссылка для сброса пароля.
              Проверьте папку «Спам», если не видите письмо.
            </p>
            <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium text-sm">
              Вернуться к входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className={input} required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 text-white py-2.5 rounded-xl hover:bg-orange-600 font-bold disabled:opacity-50 transition-colors">
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
            <p className="text-center text-sm text-stone-500">
              <Link href="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                Вернуться к входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
